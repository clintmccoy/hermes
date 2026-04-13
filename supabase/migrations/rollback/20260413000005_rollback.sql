-- =============================================================
-- Rollback: 20260413000005_financial_modeling_layer
-- Ticket: MMC-17
--
-- WARNING: drops all financial modeling data including module
-- registry seed data, deal compositions, model results, and
-- scenario sets.
--
-- Deletion order respects FK dependencies — deepest dependents
-- first, then up through the chain to the root table.
-- =============================================================

-- scenario_sets references model_results, deal_model_compositions, deals
DROP TABLE IF EXISTS public.scenario_sets;

-- model_results references deal_model_compositions, deals, analysis_jobs
DROP TABLE IF EXISTS public.model_results;

-- deal_model_compositions references deals, analysis_jobs
DROP TABLE IF EXISTS public.deal_model_compositions;

-- financial_module_registry (seed data dropped with table)
DROP TABLE IF EXISTS public.financial_module_registry;
