// Test-only sign-in (no Google) for local development and end-to-end tests.
// Exists only when mock providers are allowed, which is never on production.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { mockAllowed } from "@/lib/providers/mock";
import { seedExample } from "@/lib/content/example";
import { sameOrigin } from "@/lib/http";
import { safeNext } from "@/lib/site";

export async function POST(req: NextRequest) {
  if (!mockAllowed() || !sameOrigin(req)) return new NextResponse("Not found", { status: 404 });
  const form = await req.formData();
  const who = String(form.get("who") ?? "tester").replace(/[^a-z0-9]/gi, "").slice(0, 20) || "tester";
  const email = `${who}@example.test`;
  const password = `dev-only-${who}-password`;

  const supabase = await createClient();
  let { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await adminClient().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Test ${who}` } });
    ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
  }
  if (error || !data.user) return NextResponse.json({ error: error?.message ?? "sign-in failed" }, { status: 500 });
  const exampleId = await seedExample(data.user.id);
  const next = exampleId ? `/topics/${exampleId}?welcome=1` : safeNext(String(form.get("next") ?? "/"));
  return NextResponse.redirect(new URL(next, req.url), 303);
}
