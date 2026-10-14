import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext, siteUrl } from "@/lib/site";
import { sameOrigin } from "@/lib/http";

// POST from the "Continue with Google" form.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  const form = await req.formData();
  const next = safeNext(String(form.get("next") ?? "/"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl(req.nextUrl.origin)}/auth/callback?next=${encodeURIComponent(next)}`,
      scopes: "openid email profile",
    },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/?error=signin", req.url), 303);
  return NextResponse.redirect(data.url, 303);
}
