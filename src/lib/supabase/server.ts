import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

type HermesServerClient = ReturnType<typeof createServerClient<Database>>;

/**
 * Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * Must be called inside a request context (not at module level).
 */
export async function createClient(): Promise<HermesServerClient> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // Auth middleware handles session refresh instead.
          }
        },
      },
    },
  );
}
