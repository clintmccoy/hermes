-- =============================================================
-- Migration: 20260413000012_collaboration
-- Ticket: MMC-29 — Collaboration (deal members, activity log)
--
-- Tables created:
--   deal_members       — per-deal access control and role assignment
--   deal_activity_log  — append-only audit trail of all deal events
--
-- deal_members enables deal-level sharing beyond org-level RLS:
-- a user can be granted access to a specific deal without being
-- a member of the org that owns it. This is the mechanism behind
-- share links with account creation, guest reviewer access, and
-- future deal room functionality.
--
-- deal_activity_log is append-only (no UPDATE policy). Every
-- significant action on a deal — model runs, document uploads,
-- gate decisions, scenario saves, member additions — is recorded
-- here for audit, IC review, and training signal.
--
-- Rollback: supabase/migrations/rollback/20260413000012_rollback.sql
-- =============================================================


-- =============================================================
-- ENUM: deal_member_role_enum
--
-- owner     — full control; can delete deal, manage members
-- editor    — can edit inputs, run models, upload documents
-- reviewer  — read-only + can leave comments at gates
-- viewer    — read-only; no comments (share link access level)
-- =============================================================

CREATE TYPE public.deal_member_role_enum AS ENUM (
  'owner',
  'editor',
  'reviewer',
  'viewer'
);


-- =============================================================
-- TABLE: deal_members
--
-- Per-deal role assignments. Works alongside org-level RLS:
-- org members automatically have org-level access; deal_members
-- grants access to users outside the org (guest reviewers,
-- lenders, JV partners) or scopes access within the org.
--
-- invited_by: the user who granted this access.
-- accepted_at: null until the invitee accepts. For org members
--   this is typically set at creation; for external guests it
--   is set when they follow the invite link.
--
-- UNIQUE (deal_id, user_id): a user has exactly one role per deal.
--   Role changes are handled by UPDATE, not new rows.
-- =============================================================

CREATE TABLE public.deal_members (
  id            uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid                        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id       uuid                        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id       uuid                        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  role          public.deal_member_role_enum NOT NULL DEFAULT 'viewer',
  invited_by    uuid                        NOT NULL REFERENCES auth.users(id),
  accepted_at   timestamptz,

  created_at    timestamptz                 NOT NULL DEFAULT now(),
  updated_at    timestamptz                 NOT NULL DEFAULT now(),

  CONSTRAINT uq_deal_members UNIQUE (deal_id, user_id)
);

ALTER TABLE public.deal_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_deal_members_deal_id  ON public.deal_members(deal_id);
CREATE INDEX idx_deal_members_user_id  ON public.deal_members(user_id);
CREATE INDEX idx_deal_members_org_id   ON public.deal_members(org_id);

CREATE TRIGGER set_deal_members_updated_at
  BEFORE UPDATE ON public.deal_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- ENUM: deal_activity_event_type_enum
--
-- Covers all significant deal lifecycle events. New event types
-- should be added as product surfaces expand — do not use 'other'
-- for events that recur; add a specific type.
-- =============================================================

CREATE TYPE public.deal_activity_event_type_enum AS ENUM (
  -- Document events
  'document_uploaded',
  'document_processed',
  'document_failed',

  -- Extraction / ingestion events
  'extraction_started',
  'extraction_completed',
  'extraction_field_flagged',

  -- Gate events
  'gate_opened',
  'gate_approved',
  'gate_corrected',
  'gate_skipped',

  -- Model events
  'model_run_started',
  'model_run_completed',
  'model_run_failed',
  'scenario_saved',
  'scenario_set_created',

  -- Input events
  'input_overridden',    -- user manually overrode an AI-extracted or computed value
  'input_approved',      -- user approved an AI-extracted value
  'assumption_updated',  -- market leasing / operating / investment assumption changed

  -- Collaboration events
  'member_added',
  'member_removed',
  'member_role_changed',
  'share_link_created',
  'share_link_viewed',

  -- Deal lifecycle
  'deal_created',
  'deal_status_changed',
  'deal_archived'
);


-- =============================================================
-- TABLE: deal_activity_log
--
-- Append-only audit trail. Every significant action on a deal
-- is recorded here. No UPDATE policy — rows are immutable once
-- written. Deletions only via deal cascade (if deal is deleted).
--
-- actor_id: the user who performed the action. Nullable for
--   system-initiated events (async jobs, scheduled tasks).
--
-- entity_type / entity_id: the object the event is about.
--   e.g. entity_type='document_refs', entity_id=<uuid>
--   Makes it possible to filter the log to a specific object.
--
-- metadata: jsonb payload for event-specific detail.
--   examples:
--     document_uploaded:    {filename, file_size_bytes, source_tier}
--     gate_corrected:       {field_name, old_value, new_value, reason}
--     model_run_completed:  {levered_irr, equity_multiple, noi_year1}
--     member_role_changed:  {old_role, new_role}
--     assumption_updated:   {field_name, old_value, new_value, table}
--
-- No updated_at — this table is append-only by design.
-- =============================================================

CREATE TABLE public.deal_activity_log (
  id            uuid                                  PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid                                  NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id       uuid                                  NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  event_type    public.deal_activity_event_type_enum  NOT NULL,
  actor_id      uuid                                  REFERENCES auth.users(id) ON DELETE SET NULL,
                                                      -- null for system-initiated events
  entity_type   text,        -- table name of the affected object
  entity_id     uuid,        -- id of the affected object

  metadata      jsonb,       -- event-specific payload (see comment above)

  created_at    timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_activity_log_deal_id      ON public.deal_activity_log(deal_id);
CREATE INDEX idx_activity_log_deal_event   ON public.deal_activity_log(deal_id, event_type);
CREATE INDEX idx_activity_log_actor_id     ON public.deal_activity_log(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_activity_log_entity       ON public.deal_activity_log(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_activity_log_created_at   ON public.deal_activity_log(deal_id, created_at DESC);


-- =============================================================
-- RLS POLICIES
-- =============================================================

CREATE POLICY "deal_members_select" ON public.deal_members FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "deal_members_insert" ON public.deal_members FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "deal_members_update" ON public.deal_members FOR UPDATE USING (org_id = ANY(public.user_org_ids())) WITH CHECK (org_id = ANY(public.user_org_ids()));
CREATE POLICY "deal_members_delete" ON public.deal_members FOR DELETE USING (org_id = ANY(public.user_org_ids()));

-- Activity log: select and insert only — no update, no delete (append-only)
CREATE POLICY "activity_log_select" ON public.deal_activity_log FOR SELECT USING (org_id = ANY(public.user_org_ids()));
CREATE POLICY "activity_log_insert" ON public.deal_activity_log FOR INSERT WITH CHECK (org_id = ANY(public.user_org_ids()));
