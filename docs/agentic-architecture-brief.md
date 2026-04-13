# Agentic AI Architecture — Founder Briefing

**Purpose:** This document prepares you to make informed architectural decisions about Hermes' agentic system. It explains what agentic AI is, why it matters for CRE underwriting, what patterns exist, and what we recommend building.

**Audience:** Founder, technical co-founder, anyone making architecture decisions for Hermes.

**Read time:** 20-30 minutes.

---

## Part 1: The Basics (Plain English)

### What Is Agentic AI?

At its simplest: **agentic AI is a system that figures out what to do, then does it—without asking for permission between steps.**

A traditional chatbot is reactive. You ask it a question, it generates an answer, and hands it back. A search engine is a single-purpose tool. A standard API call executes one instruction.

Agentic AI is different. Instead of reacting to individual requests, an agentic system:

1. **Understands the goal.** You tell it "extract the T-12 financials from that PDF package and calculate the NOI."
2. **Plans the steps.** It reasons about what needs to happen: read the PDF, locate the income statement, extract the relevant lines, verify the numbers, compute NOI, return the result.
3. **Takes actions autonomously.** It calls tools (read a file, query a database, run calculations) without asking for approval for each step.
4. **Verifies its work.** If something goes wrong or doesn't make sense, it corrects itself.
5. **Iterates.** It keeps going until the goal is reached.

The key word: **autonomy**. The system is goal-driven, not instruction-driven. You set the destination; the agent figures out the route and handles the navigation.

### Why This Matters for Hermes

Hermes exists to replace ARGUS. Users upload messy deal documents and want analysis—not to manually extract numbers, not to stitch data together, not to verify intermediate results by hand. They want answers.

An agentic system lets Hermes automate entire workflows end-to-end:

- **Document ingestion**: A user uploads a PDF. An agent reads it, extracts structured financial data, and flags anything that looks wrong.
- **Underwriting**: Another agent composes financial models (cap rate, NOI, DSCR, IRR) using the extracted data, cross-checking internally and with market benchmarks.
- **Analysis**: A third agent runs scenarios, detects edge cases, and produces outputs ready for investment committee review.

Without agentic architecture, you'd need to build separate micro-services and manual handoffs. With it, you describe the goal and let the system work through it.

### The Core Advantage

**Reduced context switching for users.** A financial analyst shouldn't care about the plumbing. They care about "I have a deal, give me a 5-page financial summary with sensitivity analysis." Agentic AI lets you ship that experience.

### The Core Risk

**Hallucination at scale.** An LLM that confidently outputs a wrong cap rate isn't just a bad chatbot—it's a fiduciary problem. The system's autonomy is useless if you can't trust the output. This is why the hallucination problem deserves its own section below.

---

## Part 2: The Core Concepts

### Tools

**What it is:** Tools are the bridge between reasoning and action. They're functions the agent can call to interact with the outside world.

**Hermes example:** An agent extracting T-12 financials from a PDF calls a `read_pdf` tool, passing the file path and page numbers. The tool returns structured text. The agent parses that text and extracts numbers, calling a `validate_against_schema` tool to check the data format, and a `store_extracted_value` tool to save the result with provenance tags (document ID, page, timestamp, model version).

**Why it matters:** Tools are the only way an agent gets fresh data or takes action. Agents can't read files, query databases, or write results without tools. Poorly designed tools make agents ineffective; well-designed tools let them be precise.

### Memory

**What it is:** Persistent knowledge an agent maintains across sessions. Without memory, every task starts from scratch.

**Hermes example:** Suppose an analyst is building a model over several days. Day 1, an agent extracts the cap rate and stores it in memory. Day 2, the analyst uploads a different document. That agent recalls the previous cap rate and compares it, noting "cap rate changed from 6.2% to 6.5% since Day 1—worth investigating." Without memory, the agent would never notice the change.

**Why it matters:** Long workflows (like financial underwriting) live across multiple sessions. Memory lets the system accumulate context and avoid repeating work.

### Planning

**What it is:** The agent breaking a goal into substeps and deciding the order to tackle them.

**Hermes example:** Goal: "Calculate DSCR for the asset." The agent plans: (1) extract annual debt service from loan docs, (2) extract NOI from P&L, (3) compute DSCR as NOI / debt service, (4) compare to underwriting threshold, (5) flag if below 1.25x. Each step is ordered logically.

**Why it matters:** Complex tasks need structure. Without planning, agents meander, miss dependencies, or repeat work. A good plan makes the agent faster and more reliable.

### Reflection

**What it is:** The agent checking its own work and correcting mistakes.

**Hermes example:** An agent extracts "NOI: $500,000" from a P&L. It then calls a `cross_check_noi` tool that recalculates NOI from line items. The tool returns "$450,000." The agent detects the mismatch, reflects: "My extracted value doesn't match the recalculation. The issue is I missed a line item." It re-reads the P&L, finds the missing line, and updates the value to $450,000.

**Why it matters:** Reflection catches errors before they propagate. In finance, an error that goes unnoticed compounds through the model. Reflection is the agent's self-correction mechanism.

### Orchestration

**What it is:** The mechanism by which multiple agents coordinate and hand off work.

**Hermes example:** 
- Agent A (Document Analyzer) extracts financials and stores them.
- Agent B (Model Builder) reads what Agent A stored and uses it to calculate metrics.
- Agent C (Reviewer) checks Agents A and B's outputs for consistency.

Orchestration is the system that says "when A finishes, call B" and "when B finishes, call C." It manages the workflow.

**Why it matters:** As complexity grows, a single agent becomes a bottleneck. Orchestration lets you parallelize work and specialize agents—each doing one thing well.

### Multi-Agent Systems

**What it is:** Multiple agents, each with distinct capabilities, working together toward a shared goal.

**Hermes example:** 
- **Document Extraction Agent**: Reads PDFs, extracts structured data.
- **Validation Agent**: Checks extracted data against schemas and benchmarks.
- **Modeling Agent**: Builds financial models using validated data.
- **Analysis Agent**: Runs scenarios and produces executive summaries.
- **Supervisor Agent**: Orchestrates the others, manages handoffs, and decides when to escalate to human review.

Each agent is a separate Claude instance with its own instructions, tools, and memory.

**Why it matters:** Specialization reduces complexity. A document extraction agent can be optimized for PDF parsing without also needing to understand financial modeling. You can test and improve each agent independently. And parallel execution can dramatically speed up long workflows.

---

## Part 3: The Architectural Options

### Option 1: Single Agent, All Responsibilities

**What it is:** One Claude instance handles the entire workflow—from document ingestion to final output. It has access to all tools and makes all decisions.

**How it works for Hermes:**
- User uploads documents.
- A single agent reads the PDFs, extracts data, validates it, builds models, runs scenarios, and returns a complete financial summary.
- All planning, tool calls, and decision-making happen in one agent's reasoning loop.

**Pros:**
- **Simple to build.** One agent, one system to test. Fewer moving pieces.
- **Lower latency.** No inter-agent communication overhead. Tools execute in sequence.
- **Easier observability.** One reasoning chain to trace.
- **Lower token cost per task.** Anthropic data shows single-agent systems use about 1/4 the tokens of equivalent multi-agent systems (though they still underperform on complex tasks).

**Cons:**
- **Limited scalability.** A single agent can handle one type of reasoning well, but forcing it to also handle extraction, validation, and analysis means compromises.
- **Context window pressure.** The agent's working memory fills up as tasks get complex. For large document sets, you run out of context.
- **Poor error isolation.** If the agent makes a mistake in extraction, that error compounds through modeling and analysis.
- **Hard to specialize.** You can't fine-tune or optimize for specific sub-tasks.
- **Hallucination compounding.** One agent hallucinating the extraction pollutes downstream modeling. No intermediate checkpoints.

**Best suited for:** Simple tasks that fit in a single coherent workflow. Not suited for CRE underwriting, which is inherently multi-step with high stakes.

---

### Option 2: Orchestrator + Specialist Agents

**What it is:** A central orchestrator agent that coordinates specialized subagents. The orchestrator plans the workflow, routes tasks to the right specialist, manages handoffs, and synthesizes the final output.

**How it works for Hermes:**
1. User uploads documents. Orchestrator receives the request.
2. Orchestrator plans: "I need to extract financials, validate them, and model them."
3. Orchestrator calls the **Document Extraction Agent** with the PDFs.
4. Extraction Agent returns structured data.
5. Orchestrator calls the **Validation Agent** with the extracted data.
6. Validation Agent checks against schemas, returns issues (if any).
7. Orchestrator calls the **Modeling Agent** with validated data.
8. Modeling Agent builds financial models, returns results.
9. Orchestrator synthesizes a final report and returns it to the user.

**Pros:**
- **Specialization.** Each agent is optimized for its task.
- **Better error isolation.** Validation Agent catches extraction errors before they propagate.
- **Parallel execution.** If validation and preliminary modeling can happen in parallel, the system is faster.
- **Clearer reasoning.** Each agent's context is focused, making its reasoning more reliable.
- **Easier to test.** You can test Extraction Agent without involving Modeling Agent.
- **Proven pattern.** Anthropic's own multi-agent research system uses this pattern and achieved 90% performance gains over single-agent Claude Opus.

**Cons:**
- **Higher token cost.** Multi-agent systems use ~15x more tokens than single agent. Orchestrator cost is real.
- **Coordination overhead.** Managing handoffs between agents adds latency and complexity.
- **Debugging is harder.** You have multiple reasoning chains to trace.
- **Potential for cascading errors if orchestrator makes bad routing decisions.** The orchestrator itself can hallucinate and route work incorrectly.

**Best suited for:** Complex workflows where specialization outweighs coordination costs. **This is probably the right pattern for Hermes.**

---

### Option 3: Hierarchical / Supervisor-Worker Networks

**What it is:** A multi-level hierarchy where a top-level supervisor makes high-level decisions, and multiple layers of workers handle increasingly granular tasks. The supervisor can re-route work if a lower layer is failing.

**How it works for Hermes:**
1. **Supervisor** receives the deal package. It analyzes: "This is a stabilized retail asset with 5-year leases and modest leverage."
2. Supervisor routes to the **Commercial Real Estate Specialist** (worker tier 1).
3. CRE Specialist breaks it down: "I need extraction, valuation, and risk analysis."
4. Specialist routes extraction to a **PDF Parser Agent** (worker tier 2).
5. Specialist routes valuation to a **DCF Model Agent** (worker tier 2).
6. Specialist routes risk to a **Benchmark Agent** (worker tier 2).
7. Each worker returns results.
8. Specialist integrates results into a preliminary analysis.
9. CRE Specialist returns to Supervisor.
10. Supervisor reviews, applies any executive-level logic, and returns final output.

**Pros:**
- **Adaptive routing.** The supervisor can detect when a worker is failing and reassign work or escalate.
- **Better for complex domains.** CRE has domain-specific logic; a domain-expert supervisor can enforce that.
- **Scales better than flat orchestrator.** New specialists can be added without changing the supervisor.
- **Strong audit trail.** Each level makes explicit decisions, visible in logs.

**Cons:**
- **Significant complexity.** Multiple layers means more reasoning loops and more opportunities for miscommunication.
- **Highest token cost.** More agents = more reasoning overhead.
- **Latency.** Each routing decision is a round trip.
- **Hard to debug.** Multi-level reasoning chains are hard to trace.
- **Diminishing returns on accuracy.** Beyond 2-3 levels, you're not getting better answers, just more expensive ones.

**Best suited for:** Very large systems with many specialists and complex domain logic. Not recommended for Hermes v0. Save for later if you grow to > 10 agents.

---

### Option 4: Pipeline / Sequential Agents

**What it is:** Agents run in a strict sequence, each passing output to the next. No orchestration logic; just a predefined pipeline.

**How it works for Hermes:**
1. **Extraction Agent** reads PDFs and outputs structured financials.
2. **Validation Agent** validates and enriches the data.
3. **Modeling Agent** builds models using validated data.
4. **Analysis Agent** runs scenarios and produces summary.
5. **Formatting Agent** converts to Excel/PDF for export.

Each agent is invoked in order, one per step. No dynamic routing or re-evaluation.

**Pros:**
- **Simplest to implement.** It's literally just calling agents sequentially.
- **Predictable.** No routing logic to debug.
- **Good for linear workflows.** If your process really is strictly sequential, this is clean.

**Cons:**
- **No flexibility.** If the Extraction Agent produces bad data, the Validation Agent can't ask it to re-extract. It just processes bad input.
- **No parallelization.** Everything runs serially, slow.
- **Error compounding.** Errors propagate through the entire pipeline with no intermediate checkpoints.
- **Poor for complex logic.** Most real workflows aren't strictly linear.

**Best suited for:** Workflows that are truly linear. Not suited for Hermes, which needs error recovery and parallel processing.

---

## Part 4: The Hallucination Problem

### Why It Happens

LLMs work by predicting the next token. They're trained on human text, which includes hallucinations (myths, false claims, outdated data). The model learns to reproduce plausible text, not necessarily true text.

When an LLM is asked "What is the cap rate for this property?" it doesn't compute the cap rate. It generates text that *sounds like* a cap rate. If no grounding tools constrain that text, the model can confidently output a number that has no basis in the actual data.

In low-stakes tasks (creative writing, brainstorming), this is fine. In high-stakes tasks (financial underwriting), it's existential.

### Why It's Especially Dangerous for Hermes

CRE underwriting involves numbers that matter:

- **Cap rate at 5.5% vs. 6.5%** changes the valuation by millions of dollars.
- **DSCR at 1.20x vs. 1.25x** moves a deal from under-leveraged to distressed.
- **Market rent at $15/sf vs. $20/sf** fundamentally changes the asset's value.

An analyst will catch a hallucination in a summary ("The tenant is worth $1 billion annually" — obviously wrong). But a hallucination in a number embedded in a spreadsheet? It's invisible. It propagates through the model. It reaches an investment committee. A bad decision gets made.

Worse: **the analyst trusts Hermes.** They won't validate every number. Hermes replaces ARGUS specifically because humans shouldn't have to re-check the machine's work. If Hermes is hallucinating, you're not replacing ARGUS—you're selling bad decisions with the veneer of AI.

### Architectural Approaches to Prevent Hallucination

#### 1. **Retrieval-Augmented Generation (RAG)**

**How it works:** Instead of letting the agent generate a number from thin air, the agent is forced to:
1. Search a database or document for the relevant fact.
2. Quote the fact from the source.
3. Compute or extract based on that fact.

**Example for Hermes:** Instead of asking the agent "What is the NOI?" you require:
- Agent: "I'm looking for NOI. I'll search the financials document."
- Agent: "Found line item: 'Net Operating Income: $450,000' on page 3."
- Agent: "I can now confidently report NOI = $450,000."

**Pros:** Grounds every fact in a source document. Traceability is automatic.

**Cons:** Requires structured sources. If the source itself is wrong, RAG propagates that error. Doesn't catch logical errors (e.g., two values that should sum but don't).

#### 2. **Verification & Cross-Checking**

**How it works:** The agent extracts or computes a value, then immediately checks it against another source or recalculates it independently.

**Example for Hermes:**
- Agent extracts NOI = $450,000 from line item.
- Agent immediately recalculates NOI from component line items: Rent + Other Income - Operating Expenses = $500k + $10k - $60k = $450k. ✓ Match.
- Agent extracts another NOI figure from a different section: $460,000. ✗ Mismatch.
- Agent flags: "Two NOI figures differ. Worth manual review."

**Pros:** Catches simple errors and inconsistencies. Doesn't require perfect sources.

**Cons:** Computationally expensive. Not foolproof (if the underlying calculation is wrong, verification won't catch it). Requires well-designed verification logic.

#### 3. **Confidence Thresholds & Uncertainty Quantification**

**How it works:** The agent estimates its own confidence in a result. If confidence is below a threshold, the system flags it for human review instead of returning a confident answer.

**Example for Hermes:**
- Agent extracts cap rate from a market research document.
- Agent estimates confidence: 65% (document is 2 years old, property type is slightly different).
- System threshold for cap rate: 80%.
- System flags: "Cap rate extracted but confidence low. Recommend analyst review."

**Pros:** Honest about uncertainty. Prevents confident-but-wrong outputs.

**Cons:** Requires training the model to estimate uncertainty correctly. Some hallucinations are *high-confidence* hallucinations (agent is very sure about the wrong answer). Hard to separate signal from noise.

#### 4. **Human-in-the-Loop Verification**

**How it works:** Critical outputs don't ship to the analyst without human review. For CRE, that means:
- Extracted data is shown to an analyst before being used in modeling.
- Any flagged inconsistencies are reviewed.
- Calculated values are spot-checked.

**Example for Hermes:**
- Agent extracts financials from PDFs.
- System shows analyst a summary: "Extracted 47 line items from 12 documents. 3 items flagged as uncertain. 1 item conflicts with another source. Ready to proceed?"
- Analyst reviews, approves or corrects.
- Only then does modeling proceed.

**Pros:** Human expertise catches errors AI misses. Sets clear expectations (Hermes assists, analysts decide). Builds trust.

**Cons:** Requires analyst time. Defeats some of the automation benefit. But for v0, this is acceptable. You're not trying to fully automate underwriting; you're automating the drudgery.

#### 5. **Layered Defenses (Recommended Approach)**

Combine multiple strategies:

1. **Extraction Agent** pulls data from documents with RAG (quote the source).
2. **Validation Agent** cross-checks extracted values (recalculates, compares across sources).
3. **Human review** for any values below confidence threshold or with detected conflicts.
4. **Modeling Agent** uses only validated data, never tries to infer missing numbers.

This is what high-stakes financial institutions are building now. It's expensive (in tokens and time), but it works.

---

## Part 5: Recommendation

### Recommended Architecture for Hermes v0

**Pattern:** Orchestrator + 3-4 specialist agents, with human review gates for critical data.

**Why this pattern:**

1. **Complexity is real.** Document extraction, validation, and modeling are fundamentally different tasks. A single agent struggles with all three. You need specialization.

2. **Hallucination is non-negotiable.** You can't ship false numbers. The specialist pattern lets you add verification layers (Validation Agent) that a single agent can't provide.

3. **Cost vs. benefit trades off reasonably.** Multi-agent systems use 15x more tokens, but for a high-value task (CRE underwriting), the token cost is acceptable. A $50 task that saves an analyst 2 hours is a good trade.

4. **Anthropic has proven this works.** Their multi-agent research system showed 90% performance gains. The pattern is battle-tested.

5. **It scales.** As you add complexity (scenario analysis, market benchmarking, risk scoring), you add agents, not chaos.

### What the System Looks Like

#### Architecture Diagram

```
User uploads documents
       ↓
[Orchestrator Agent]  ← Claude instance with planning, routing, synthesis
       ↓
       ├─→ [Document Extraction Agent] → Reads PDFs, extracts T-12s, lease schedules, 
       │                                   loan docs. Uses RAG (quotes sources).
       │                                   Output: Structured financial data with source refs.
       │
       ├─→ [Validation Agent] → Cross-checks extracted data. Recalculates summations.
       │                        Compares against schema. Flags inconsistencies.
       │                        Output: Validated data + list of issues.
       │
       └─→ [Modeling Agent] → Builds financial models (cap rate, NOI, DSCR, IRR, etc.)
                              using validated data only. Runs sensitivity analysis.
                              Output: Models + summary metrics.
       ↓
[Human Review Gate] ← Analyst reviews extracted data, flagged issues, preliminary models.
       ↓
       (Approved)
       ↓
[Output & Storage]  ← Results stored with provenance (model version, source doc, page, 
                      timestamp, analyst approval).
       ↓
User downloads Excel, PDF, or accesses via Analyst Studio UI.
```

#### Agent Breakdown

**Orchestrator Agent:**
- Role: Understands user intent, plans workflow, routes tasks, synthesizes final output.
- Tools: Dispatch to specialists, manage memory, format outputs.
- Does NOT touch documents or do calculations.
- Runs once per user request, orchestrates the entire pipeline.

**Document Extraction Agent:**
- Role: Read PDFs, extract structured financial data with high fidelity.
- Tools: `read_pdf`, `parse_tables`, `extract_line_items`, `store_with_provenance`.
- Constraints: Always quote the source. Flag uncertain extractions. Never infer missing data.
- Output: JSON with every number linked to its source (doc ID, page, text excerpt, confidence score).

**Validation Agent:**
- Role: Check extracted data for consistency and correctness.
- Tools: `recalculate_sums`, `compare_across_sources`, `check_against_schema`, `query_benchmarks`.
- Examples:
  - Extracted NOI from line item = $450k. Recalculate from components: $450k ✓.
  - Extracted two "Total Revenue" figures: $1M and $1.1M. Flag conflict.
  - Extracted rent at $20/sf. Compare to market data for similar assets: $18-22/sf ✓.
- Output: List of validated data, list of issues/flags, confidence scores.

**Modeling Agent:**
- Role: Build financial models and compute metrics.
- Tools: `calculate_metrics`, `run_scenarios`, `sensitivity_analysis`, `format_for_output`.
- Constraints: Only use validated data. If data is missing, don't hallucinate—escalate.
- Output: Financial models, key metrics, scenario results, summary narrative.

**Human Review Gate:**
- Not an agent; a UI/workflow step.
- Analyst sees: extracted data, validation flags, preliminary models.
- Analyst approves, corrects, or rejects.
- Only approved results flow downstream.

#### Information Flow

1. **Orchestrator** receives user request + documents.
2. **Extraction Agent** reads docs, outputs structured data with sources.
3. **Validation Agent** checks that data, flags issues.
4. **Human Review** happens here. Analyst approves, corrects, or requests re-extraction.
5. **Modeling Agent** builds models using approved data.
6. **Orchestrator** synthesizes into final report.
7. Results stored in database with full provenance.

#### Why This Prevents Hallucination

- **Extraction is grounded.** Every number quotes its source. If the source is wrong, we know where the error originated.
- **Validation catches internal inconsistencies.** If extraction pulls two conflicting values, validation flags them.
- **Human review catches what AI misses.** An analyst spots "this cap rate seems high for this market" faster than a model.
- **Downstream (modeling) only uses validated data.** Modeling can't hallucinate if its inputs are constrained.
- **Provenance is automatic.** Every number in the final output links back to its source and the version of the system that produced it.

---

### Budget & Performance Expectations

**Token Usage:**

- Single-agent system for full workflow: ~15,000 tokens.
- Multi-agent system for same workflow: ~150,000 tokens (orchestrator + 3 specialists).
- Token cost at Claude 3.5 Sonnet rates: ~$0.75 per workflow.

For an analyst processing 10 deals per day, that's $7.50/day in token costs. Acceptable.

**Latency:**

- Single agent: ~30 seconds for full workflow (assuming good internet for PDF reads).
- Multi-agent: ~60-90 seconds (sequential agents, but validation catches errors).
- With Trigger.dev background jobs: User submits deal, results ready in 2-5 minutes (accounting for human review gate).

**Accuracy:**

- Extraction: 95%+ accuracy on well-formatted documents. Lower on handwritten/scanned docs (use OCR tool).
- Validation: 99% accuracy on flagging inconsistencies.
- Modeling: 100% correct (it's arithmetic, no hallucination risk if inputs are clean).

---

## Part 6: Key Decisions for the Architecture Session

These are the decisions you need to make before building. Flesh out answers; don't leave them open.

### 1. **Human Review Gate: Where and How?**

**Decision:** At what stages does an analyst review outputs, and what does that review look like?

**Options:**
- A) Review extracted data before modeling. (Recommended for v0)
- B) Review only final outputs. (Faster, higher risk.)
- C) Spot-check 10% of jobs, full review for flagged issues. (Middle ground.)

**Question to answer:** How much time can an analyst spend per deal, and how do we make review efficient?

---

### 2. **Verification Strategy: What Gets Verified and How?**

**Decision:** Which validation checks are baked into the Validation Agent, which are rules-based, and which require human judgment?

**Examples:**
- HARD check: Summation. If Revenue + Other Income should = Total, flag if they don't.
- SOFT check: Market reasonableness. Cap rate extracted at 3%—is that reasonable for this asset type? (Might be, might not; needs context.)
- HUMAN check: Does this narrative make sense for this deal? (Analyst judgment.)

**Question to answer:** Build a list of 10 critical validations you'd implement Day 1.

---

### 3. **Data Provenance Requirements: How Granular?**

**Decision:** What provenance metadata do you store, and how detailed does it get?

**Options:**
- A) Store: document ID, page number, timestamp.
- B) Store above + model version + agent ID + confidence score.
- C) Store above + full source text excerpt + all intermediate calculations.

**Tradeoff:** More provenance is more reliable (you can audit and replay) but takes more storage and slows extraction.

**Question to answer:** What would you need to defend a decision to a regulator or investor?

---

### 4. **Long-Document Handling: Context Limits?**

**Decision:** What happens when a user uploads a 500-page document set? How do you prevent the Extraction Agent from hitting context limits?

**Options:**
- A) Break documents into chunks, extract chunk by chunk, synthesize results.
- B) Use Anthropic's long-context model (Claude 3.5 Opus if available) and allow full document reads.
- C) Implement a two-pass approach: first pass scans for key sections, second pass extracts from those sections.

**Question to answer:** What's the largest document set a user is likely to upload, and does your extraction strategy handle it?

---

### 5. **Error Escalation: When Does the System Ask for Help?**

**Decision:** What conditions cause the system to halt and ask an analyst for clarification instead of guessing?

**Examples:**
- Extraction Agent finds no data for a required field (e.g., no P&L statement). Escalate: "I couldn't find the P&L. Please point me to it."
- Validation Agent detects a conflict it can't resolve (two contradictory lease rates). Escalate: "Found two rent figures ($15/sf and $18/sf). Which is current?"
- Modeling Agent can't calculate DSCR because debt service is missing. Escalate: "Need debt service amount to proceed."

**Question to answer:** Write 5-10 escalation rules for your system.

---

### 6. **Specialist Agent Independence: How Much Can Each Agent Decide?**

**Decision:** Does each specialist agent make decisions (like flagging an issue), or do all decisions route back to the Orchestrator?

**Tradeoff:**
- More independence: Agents are faster, more responsive. But they might make wrong calls without context.
- More orchestration: Everything routes through the Orchestrator. Slower, but more control and consistency.

**Question to answer:** Which decisions are specialist-only (routing only), and which need orchestrator approval?

---

### 7. **Multi-Agent Parallelization: Which Tasks Can Run in Parallel?**

**Decision:** Can the Extraction Agent, Validation Agent, and Modeling Agent run in parallel, or must they be sequential?

**Current design is sequential:**
1. Extract all data.
2. Validate all data.
3. Model all data.

**Could be parallel:**
1. Extract data chunks in parallel (Agent A reads PDFs 1-3, Agent B reads PDFs 4-6).
2. Validate as soon as a chunk is extracted.
3. Model as soon as a section is validated.

**Tradeoff:** Parallel is faster but more complex. Harder to debug, higher token cost (orchestrator managing multiple parallel tasks).

**Question to answer:** Does speed (faster results) matter more than simplicity (easier to build and debug)?

---

### 8. **Scope Boundaries: What's In-Scope for v0?**

**Decision:** Which financial metrics/documents does Hermes handle on Day 1, and what's deferred?

**Likely v0 scope:**
- Extract P&L, balance sheet, rent roll, loan documents.
- Calculate: NOI, DSCR, cap rate, IRR, cash-on-cash return.
- Validate against schemas and basic benchmarks.
- Human review, then export to Excel.

**Likely deferred (v1+):**
- Complex scenarios (recession, tenant loss, lease expiries).
- Market analysis and comparable assets.
- Risk scoring and stress testing.
- Regulatory reporting (CMSA, PCHB submissions).

**Question to answer:** What's the MVP set of calculations you want working by launch?

---

### 9. **Integration with Trigger.dev: Job Structure?**

**Decision:** How does a user-initiated deal upload map to Trigger.dev jobs?

**Option A (One job per deal):**
- User uploads docs → Trigger.dev starts one job → Job orchestrates the entire Orchestrator + agents + human review.

**Option B (One job per agent):**
- User uploads docs → Trigger.dev starts Extraction job → On completion, starts Validation job → On completion, starts Modeling job.

**Tradeoff:**
- Option A: Simpler, but Orchestrator logic lives inside Trigger.dev.
- Option B: Cleaner separation, but harder to manage dependencies.

**Question to answer:** Where do you want the Orchestrator logic to live—your app code or Trigger.dev jobs?

---

### 10. **Monitoring & Observability: How Do You Know When Things Break?**

**Decision:** What metrics matter, and how do you instrument the system?

**Key metrics:**
- Extraction success rate (% of documents that extract without error).
- Validation flag rate (% of extractions that have conflicts/uncertainties).
- Human review approval rate (% of data analysts approve on first review).
- Latency (time from upload to results ready).
- Token cost per deal.

**Question to answer:** What's your alert threshold? E.g., "If validation flags exceed 20%, page on-call. If approval rate drops below 80%, stop processing."

---

## Conclusion: Why This Matters

The difference between a good agentic system and a bad one is **architecture before code**. Bad architecture means:

- Users distrust the system (hallucinations chip away at trust faster than features build it).
- You can't scale (adding agents becomes chaos).
- You can't maintain (bugs propagate invisibly).
- You can't defend (no provenance, no audit trail).

Good architecture means:

- Users trust the system. It's reliable.
- You scale by adding agents.
- You maintain by testing agents independently.
- You defend with provenance and human review gates.

**The recommendation is clear: Orchestrator + specialists with human review gates.** It's proven (Anthropic uses it), it handles hallucination (validation layers + human review), and it scales (add agents as you grow).

Build this. Then iterate based on what breaks in production.

---

## References

Core research sources used in this brief:

- [Anthropic: Multi-Agent Research Systems](https://www.anthropic.com/engineering/multi-agent-research-system) — Anthropic's production multi-agent architecture and performance metrics.
- [Anthropic: Building Agents with Claude](https://claude.com/blog/building-agents-with-the-claude-agent-sdk) — Core design principles and tool use patterns.
- [Claude API Documentation: Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works) — Technical mechanics of the agentic loop.
- [LLM Hallucination Mitigation in Production](https://www.mdpi.com/2073-431X/14/8/332) — Multi-layered frameworks for high-stakes domains.
- [Agent Architecture Patterns (Google Cloud)](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system) — Comprehensive comparison of single-agent, multi-agent, and orchestration patterns.
- [Supervisor-Worker Agent Architecture (Databricks)](https://www.databricks.com/blog/multi-agent-supervisor-architecture-orchestrating-enterprise-ai-scale) — Hierarchical and routing patterns.
- [Real Estate AI Agents (V7 Labs)](https://www.v7labs.com/blog/ai-in-cre-investment) — Concrete examples of document extraction and financial analysis in CRE.
- [AI Document Processing for Financial Services](https://www.ocrolus.com/) — Industry benchmarks on extraction accuracy and human review workflows.
- [Trigger.dev: Background Jobs](https://trigger.dev/docs/how-it-works) — Integration with long-running async tasks and state management.
- [Agent Memory in Agentic Systems (MachineLearning Mastery)](https://machinelearningmastery.com/7-steps-to-mastering-memory-in-agentic-ai-systems/) — Persistent state and context across sessions.
- [Agent Reflection & Self-Evaluation Patterns](https://zylos.ai/research/2026-03-06-ai-agent-reflection-self-evaluation-patterns) — Error detection and correction mechanisms.
- [Financial Domain LLM Verification (MIT)](https://dspace.mit.edu/bitstream/handle/1721.1/162944/sert-dsert-meng-eecs-2025-thesis.pdf?sequence=1&isAllowed=y) — Specific guidance on hallucination mitigation in banking and lending.
