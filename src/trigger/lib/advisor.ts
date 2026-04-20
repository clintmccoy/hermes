/**
 * Advisor wrapper — enforces max_uses caps, tracks invocation count and tokens.
 *
 * The Advisor Strategy (ADR 010, Decision 2) pairs claude-opus-4-6 with the
 * claude-sonnet-4-6 executor using Anthropic's advisor_20260301 API primitive.
 * The advisor is available to the executor but never calls tools directly and
 * never produces user-facing output.
 *
 * This module owns:
 * - Declaring the advisor tool in every executor request that can use it
 * - Counting advisor invocations and enforcing max_uses per analysis depth
 * - Accumulating token usage for provenance
 */

import Anthropic from "@anthropic-ai/sdk";
import { ADVISOR_MAX_USES, ADVISOR_MODEL, EXECUTOR_MODEL, type AnalysisDepth } from "./types";

// ── Client ──────────────────────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return _client;
}

// ── Advisor state ───────────────────────────────────────────────────────────

/**
 * Mutable provenance counters threaded through a pipeline run.
 * Passed by reference so each subtask can increment the same object.
 */
export interface AdvisorState {
  invocationCount: number;
  advisorTokensUsed: number;
  executorTokensUsed: number;
  readonly maxUses: number;
  readonly analysisDepth: AnalysisDepth;
}

export function createAdvisorState(analysisDepth: AnalysisDepth): AdvisorState {
  return {
    invocationCount: 0,
    advisorTokensUsed: 0,
    executorTokensUsed: 0,
    maxUses: ADVISOR_MAX_USES[analysisDepth],
    analysisDepth,
  };
}

// ── Message request types ───────────────────────────────────────────────────

export interface AdvisorEnabledRequest {
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  tool_choice?: Anthropic.ToolChoice;
  max_tokens?: number;
}

export interface AdvisorEnabledResponse {
  message: Anthropic.Message;
  /** Whether the advisor was actually invoked during this request. */
  advisorInvoked: boolean;
  /** Advisor invocations used in this specific request. */
  advisorInvocationsThisRequest: number;
}

// ── Core invocation ─────────────────────────────────────────────────────────

/**
 * Run the executor with the advisor declared if uses remain.
 *
 * When max_uses is already exhausted, the advisor tool is omitted from the
 * request — the executor proceeds without it rather than hard-failing, which
 * keeps the pipeline resilient to unexpectedly high advisor consumption early
 * in a job.
 */
export async function runWithAdvisor(
  state: AdvisorState,
  request: AdvisorEnabledRequest,
): Promise<AdvisorEnabledResponse> {
  const client = getClient();
  const remainingUses = state.maxUses - state.invocationCount;
  const advisorAvailable = remainingUses > 0;

  // Build the advisor tool declaration if uses remain
  const advisorTool: Anthropic.Tool | null = advisorAvailable
    ? {
        name: "advisor_20260301",
        description: `Invoke the ${ADVISOR_MODEL} advisor for complex reasoning.
Use when you encounter: ambiguous document structures, novel operating models,
unusual lease arrangements, or any situation where you are uncertain.
You have ${remainingUses} advisor invocation${remainingUses === 1 ? "" : "s"} remaining.`,
        // The advisor tool takes the executor's question as input
        input_schema: {
          type: "object" as const,
          properties: {
            question: {
              type: "string",
              description: "The specific question or analysis request for the advisor.",
            },
            context: {
              type: "string",
              description: "Relevant context from the document or prior analysis steps.",
            },
          },
          required: ["question"],
        },
      }
    : null;

  const tools = [...(request.tools ?? []), ...(advisorTool ? [advisorTool] : [])];

  const response = await client.messages.create({
    model: EXECUTOR_MODEL,
    max_tokens: request.max_tokens ?? 4096,
    system: request.system,
    messages: request.messages,
    ...(tools.length > 0 ? { tools } : {}),
    ...(request.tool_choice ? { tool_choice: request.tool_choice } : {}),
  });

  // Count advisor invocations from response usage metadata
  const advisorUsage =
    (response.usage as Anthropic.Usage & {
      advisor_invocations?: number;
      advisor_input_tokens?: number;
      advisor_output_tokens?: number;
    }) ?? {};

  const advisorInvocationsThisRequest = advisorUsage.advisor_invocations ?? 0;
  const advisorTokensThisRequest =
    (advisorUsage.advisor_input_tokens ?? 0) + (advisorUsage.advisor_output_tokens ?? 0);

  // Update mutable state
  state.invocationCount += advisorInvocationsThisRequest;
  state.advisorTokensUsed += advisorTokensThisRequest;
  state.executorTokensUsed += response.usage.input_tokens + response.usage.output_tokens;

  return {
    message: response,
    advisorInvoked: advisorInvocationsThisRequest > 0,
    advisorInvocationsThisRequest,
  };
}

/**
 * Run the executor without the advisor (for steps where Opus is never needed,
 * e.g. output formatting or structured writes).
 */
export async function runExecutor(
  state: AdvisorState,
  request: Omit<AdvisorEnabledRequest, "tools"> & { tools?: Anthropic.Tool[] },
): Promise<Anthropic.Message> {
  const client = getClient();

  const response = await client.messages.create({
    model: EXECUTOR_MODEL,
    max_tokens: request.max_tokens ?? 4096,
    system: request.system,
    messages: request.messages,
    ...(request.tools && request.tools.length > 0 ? { tools: request.tools } : {}),
  });

  state.executorTokensUsed += response.usage.input_tokens + response.usage.output_tokens;

  return response;
}

// ── Cap enforcement guard ───────────────────────────────────────────────────

/**
 * Returns true if the advisor cap has been reached.
 * Use this to decide whether to flag advisor exhaustion in events.
 */
export function isAdvisorExhausted(state: AdvisorState): boolean {
  return state.invocationCount >= state.maxUses;
}
