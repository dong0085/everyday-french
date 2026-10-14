// Supabase client with the secret key: bypasses RLS. Only for the few server paths that need it:
// API keys, usage events, storage uploads, account deletion, cron.
// Always filter by the user id you got from getUserId().
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let admin: ReturnType<typeof createClient<Database>> | null = null;

export function adminClient() {
  admin ??= createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
