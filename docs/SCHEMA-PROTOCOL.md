# Schema Change Protocol

Applies to any session that touches database schema. Follow without exception.

## Before writing SQL

1. **Flag migration-required changes immediately.** Any change to an existing table — add column, rename, drop, type change, FK restructure — must be called out before code is written: *"This requires a migration — confirming you want to proceed before I write any SQL."*
2. **New tables on greenfield** are lower risk but still require confirmation before implementation.
3. **Design is approved before SQL is written.** Sequence: propose in plain English → get explicit approval → write SQL → write application code. Never write migration SQL speculatively.

## Migration safety rules

- New columns on existing tables must be **nullable or have a default** — no `NOT NULL` without an explicit backfill plan.
- **Column renames happen in three steps:** add new column → backfill → deprecate old. Never a single-step rename against production data.
- **Dropping columns requires a deprecation period:** rename to `_deprecated_[name]` first, confirm nothing reads it, then drop in a follow-on migration.
- Every migration that modifies existing rows must have a **rollback SQL script**.

## Implementation sequence

1. Schema designed and approved (Notion changelog updated).
2. Linear ticket created with migration checklist.
3. Supabase branch created for the migration.
4. Migration SQL written and tested on branch.
5. `supabase gen types typescript` run — type errors resolved before any app code is written.
6. Migration merged to main.
7. Linear ticket updated.

## ADR threshold

Create an ADR in `/docs/adr/` for any schema change involving:

- A new domain (3+ new tables).
- A new structural pattern (e.g., computed/override split, polymorphic FK).
- An irreversible or hard-to-rollback decision.

Single-table additions and enum expansions do not need an ADR.
