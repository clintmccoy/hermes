-- =============================================================
-- Migration: 20260413000013_collaboration_comments
-- Ticket: MMC-13b — Deal comments and message threads
--
-- Single flexible table for all comment/thread types:
--
--   deal-level thread:   entity_type NULL, entity_id NULL, field_name NULL
--   entity-level thread: entity_type + entity_id set, field_name NULL
--                        e.g. "comments on this document", "on this lease"
--   in-field annotation: entity_type + entity_id + field_name all set
--                        e.g. "this going-in cap rate looks high"
--
-- Threading is handled via parent_comment_id (self-referential FK).
-- Top-level comments have parent_comment_id NULL. Replies point to
-- their parent. We do not enforce depth limit in the schema — that
-- is a UI/product concern.
--
-- Mentions are stored in mentions[] (array of user UUIDs) for fast
-- notification fan-out. A separate notification table is out of scope
-- for this migration.
--
-- resolved_at / resolved_by: for in-field annotation threads only
-- (reviewing a flagged field and marking it resolved). NULL means
-- open. Setting resolved_at closes the thread.
--
-- edited_at: set on UPDATE. The original body is not preserved in
-- this table — edit history is out of scope for v0.
--
-- Rollback: supabase/migrations/rollback/20260413000013_rollback.sql
-- =============================================================

CREATE TABLE public.deal_comments (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id           uuid         NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,

  -- Thread scope (all nullable — see header for semantics)
  entity_type       text,        -- table name of the anchored object, e.g. 'leases', 'document_refs'
  entity_id         uuid,        -- id of the anchored object
  field_name        text,        -- column/field name for in-field annotations

  -- Threading
  parent_comment_id uuid         REFERENCES public.deal_comments(id) ON DELETE CASCADE,
                                 -- null = top-level; set = reply

  -- Author
  author_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Content
  body              text         NOT NULL CHECK (char_length(body) > 0),
  mentions          uuid[]       NOT NULL DEFAULT '{}',
                                 -- array of mentioned user UUIDs for notification fan-out

  -- Resolution (in-field annotations only; ignored for deal/entity threads)
  resolved_at       timestamptz,
  resolved_by       uuid         REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Soft delete
  deleted_at        timestamptz, -- null = visible; set = soft-deleted (body replaced by UI)

  -- Timestamps
  created_at        timestamptz  NOT NULL DEFAULT now(),
  edited_at         timestamptz, -- set on UPDATE if body changes; null = never edited

  -- A field_name annotation requires entity_type + entity_id
  CONSTRAINT chk_field_name_requires_entity
    CHECK (field_name IS NULL OR (entity_type IS NOT NULL AND entity_id IS NOT NULL)),

  -- Resolution requires a resolver
  CONSTRAINT chk_resolved_at_requires_resolved_by
    CHECK ((resolved_at IS NULL) = (resolved_by IS NULL))
);

ALTER TABLE public.deal_comments ENABLE ROW LEVEL SECURITY;

-- Primary access pattern: all top-level comments for a deal, newest first
CREATE INDEX idx_deal_comments_deal_id
  ON public.deal_comments(deal_id, created_at DESC);

-- Entity-scoped thread lookup (e.g. all comments on a specific document)
CREATE INDEX idx_deal_comments_entity
  ON public.deal_comments(entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

-- In-field annotation lookup (entity + field — used by inline comment UI)
CREATE INDEX idx_deal_comments_field
  ON public.deal_comments(entity_type, entity_id, field_name)
  WHERE field_name IS NOT NULL;

-- Reply thread lookup
CREATE INDEX idx_deal_comments_parent
  ON public.deal_comments(parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;

-- Open annotation lookup (resolved_at IS NULL for a given entity)
CREATE INDEX idx_deal_comments_unresolved
  ON public.deal_comments(entity_type, entity_id)
  WHERE resolved_at IS NULL AND field_name IS NOT NULL;

-- Mention lookup (GIN for array containment queries)
CREATE INDEX idx_deal_comments_mentions
  ON public.deal_comments USING GIN (mentions)
  WHERE array_length(mentions, 1) > 0;


-- =============================================================
-- RLS POLICIES
-- =============================================================

-- Select: org members see all comments for their org's deals.
-- Deal-level guest access (deal_members) is a phase 2 concern —
-- for now, org membership is the gate.
CREATE POLICY "deal_comments_select"
  ON public.deal_comments FOR SELECT
  USING (org_id = ANY(public.user_org_ids()));

-- Insert: org members can create comments on their org's deals.
CREATE POLICY "deal_comments_insert"
  ON public.deal_comments FOR INSERT
  WITH CHECK (org_id = ANY(public.user_org_ids()));

-- Update: authors can edit their own comments (body + edited_at).
-- Resolvers (org members) can set resolved_at / resolved_by.
-- We use a single UPDATE policy scoped to org membership;
-- author-only enforcement is a server/edge function concern.
CREATE POLICY "deal_comments_update"
  ON public.deal_comments FOR UPDATE
  USING (org_id = ANY(public.user_org_ids()))
  WITH CHECK (org_id = ANY(public.user_org_ids()));

-- Delete: soft-delete only in practice (set deleted_at).
-- Hard delete allowed for org members (e.g. admin cleanup).
CREATE POLICY "deal_comments_delete"
  ON public.deal_comments FOR DELETE
  USING (org_id = ANY(public.user_org_ids()));
