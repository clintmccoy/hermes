import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type HermesServiceClient = SupabaseClient<Database>;

/**
 * Service-role Supabase client for server-side reads during the pre-auth bypass
 * period (MMC-22). Bypasses RLS — use only in server components and route handlers,
 * never in client-exposed code.
 *
 * TODO(MMC-22): remove once cookie-based auth lands; replace call sites with
 * the authenticated server client from `./server.ts`.
 */
export function createServiceClient(): HermesServiceClient {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
