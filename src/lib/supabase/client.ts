import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

type HermesClient = ReturnType<typeof createBrowserClient<Database>>;

/**
 * Supabase client for use in browser (Client Components).
 * Safe to call multiple times — creates a singleton per tab.
 */
export function createClient(): HermesClient {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
