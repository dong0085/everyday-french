// Supabase client that acts as the signed-in user (RLS applies). Use in server components,
// route handlers and server actions.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(list) {
          try {
            for (const { name, value, options } of list) cookieStore.set(name, value, options);
          } catch {
            // Called from a server component: cookies are read-only there. proxy.ts refreshes them.
          }
        },
      },
    },
  );
}

/** The signed-in user's id, verified from the JWT; null when signed out. */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}
