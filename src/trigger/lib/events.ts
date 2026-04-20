/**
 * agent_events logger — every significant pipeline event written to Supabase.
 *
 * Rules:
 * - Events are append-only. Never update or delete.
 * - sequence_number is a monotonically increasing counter per job.
 * - Failures writing an event should NOT fail the pipeline — log and continue.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../lib/supabase/database.types";
import type { AgentEventType } from "./types";

// ── Supabase client for Trigger.dev tasks ───────────────────────────────────
// Trigger tasks run server-side and use the service role key directly.

let _supabase: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return _supabase;
}

// ── Sequence counter ────────────────────────────────────────────────────────

/**
 * Simple in-process sequence counter. Trigger.dev tasks run in a single
 * Node process per job, so this is safe. If a task retries, the counter
 * resets — which is acceptable because re-emitted events are logged with
 * new sequence numbers and the retry context is clear from the timestamp.
 */
export class EventSequencer {
  private counter = 0;

  next(): number {
    return ++this.counter;
  }

  current(): number {
    return this.counter;
  }
}

// ── Logger ──────────────────────────────────────────────────────────────────

export interface EventPayload {
  [key: string]: unknown;
}

/**
 * Write a single agent event to Supabase. Fire-and-forget — errors are
 * caught and logged to console but never thrown up to the caller.
 */
export async function emitEvent(
  jobId: string,
  sequencer: EventSequencer,
  eventType: AgentEventType,
  payload?: EventPayload,
): Promise<void> {
  const db = getSupabaseAdmin();
  const sequenceNumber = sequencer.next();

  const { error } = await db.from("agent_events").insert({
    job_id: jobId,
    event_type: eventType,
    sequence_number: sequenceNumber,
    payload: (payload ?? null) as Json,
  });

  if (error) {
    // Events failing must not kill the pipeline.
    console.error(
      `[agent_events] Failed to write event ${eventType} (seq=${sequenceNumber}):`,
      error.message,
    );
  }
}
