// Refreshes the Supabase session cookie on each request (called from src/proxy.ts).
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/**
 * `makeResponse` builds the pass-through response from the (possibly updated) request.
 * It is called again whenever Supabase refreshes cookies, so server components see the new session.
 */
export async function refreshSession(request: NextRequest, makeResponse: () => NextResponse) {
  let response = makeResponse();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = makeResponse();
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );
  // getClaims() verifies the JWT and refreshes the session when needed.
  const { data } = await supabase.auth.getClaims();
  return { response, userId: (data?.claims?.sub as string | undefined) ?? null };
}
