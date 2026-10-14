import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { seedExample } from "@/lib/content/example";
import { safeNext } from "@/lib/site";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  // Google sends ?error=access_denied when the person closes or cancels the Google screen.
  if (!code) {
    const cancelled = req.nextUrl.searchParams.get("error") === "access_denied";
    return NextResponse.redirect(new URL(cancelled ? "/?error=cancelled" : "/?error=signin", req.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/?error=signin", req.url));

  // First sign-in: show the example topic straight away, before asking for anything.
  const exampleId = await seedExample(data.user.id);
  return NextResponse.redirect(new URL(exampleId ? `/topics/${exampleId}?welcome=1` : next, req.url));
}
