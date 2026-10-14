import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/http";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
