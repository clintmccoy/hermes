-- =============================================================
-- Rollback: 20260413000004_ai_execution_layer
-- Ticket: MMC-16
--
-- WARNING: drops all AI execution layer data including analysis
-- jobs, extracted inputs, agent events, gate configs, and
-- conversation stubs.
--
-- Deletion order respects FK dependencies — deepest dependents
-- first, then up through the chain to the root tables.
--
-- Seed data in gate_config_profiles / gate_config_entries is
-- removed automatically via CASCADE when those tables are dropped.
-- =============================================================

-- Leaf tables (no dependents)
DROP TABLE IF EXISTS public.agent_events;
DROP TABLE IF EXISTS public.field_review_events;

-- job_gate_corrections references extracted_inputs and job_gates
DROP TABLE IF EXISTS public.job_gate_corrections;

-- extracted_inputs references analysis_jobs and conversation_refs
DROP TABLE IF EXISTS public.extracted_inputs;

-- job_gates references analysis_jobs and gate_config_entries
DROP TABLE IF EXISTS public.job_gates;

-- analysis_jobs (referenced by above)
DROP TABLE IF EXISTS public.analysis_jobs;

-- conversation_refs references conversation_sessions
DROP TABLE IF EXISTS public.conversation_refs;

-- conversation_sessions
DROP TABLE IF EXISTS public.conversation_sessions;

-- gate_config_entries references gate_config_profiles (CASCADE handles seed rows)
DROP TABLE IF EXISTS public.gate_config_entries;

-- gate_config_profiles (seed data dropped with table)
DROP TABLE IF EXISTS public.gate_config_profiles;
