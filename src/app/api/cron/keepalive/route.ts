// Daily Vercel cron: real database activity so the free Supabase project is never paused,
// plus pruning old usage rows. Protected by CRON_SECRET; 404 when it is not configured.
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return new NextResponse("Not found", { status: 404 });
  const db = adminClient();
  const { error } = await db.from("heartbeat").update({ beat_at: new Date().toISOString(), source: "vercel-cron" }).eq("id", 1);
  const { count } = await db.from("topics").select("id", { count: "exact", head: true });
  await db.from("usage_events").delete().lt("created_at", new Date(Date.now() - 90 * 86400_000).toISOString());
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true, topics: count });
}
