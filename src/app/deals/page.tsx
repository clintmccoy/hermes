/**
 * /deals — Dashboard landing page
 *
 * Server component: fetches deals via service-role client (pre-auth bypass,
 * MMC-22). Passes data to client DealsView for interactive rendering.
 *
 * References:
 * - MMC-52 — this ticket
 * - MMC-40 — parent scope (deal intake)
 * - Scope spec §3.4 — frontend design
 */

import { createServiceClient } from "@/lib/supabase/service";
import { DealsView } from "./_components/DealsView";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const db = createServiceClient();

  const { data: deals, error } = await db
    .from("deals")
    .select("id, name, asset_class, business_plan, status, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[deal-intake] Failed to fetch deals:", error.message);
  }

  return <DealsView deals={deals ?? []} />;
}
