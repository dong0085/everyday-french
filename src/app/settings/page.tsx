import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data";
import { listKeys } from "@/lib/keys/store";
import { monthUsage } from "@/lib/usage";
import { mockAllowed } from "@/lib/providers/mock";
import { getAdmin } from "@/lib/admin";
import { SettingsView } from "@/components/SettingsView";
import type { Level } from "@/lib/content/schema";

export const metadata: Metadata = { title: "Settings" };

function monthStart() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function SettingsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/");
  const supabase = await createClient();
  const [profile, keys, usage, { data: claims }, admin, topicsThisMonth] = await Promise.all([
    getProfile(userId),
    listKeys(userId),
    monthUsage(userId),
    supabase.auth.getClaims(),
    getAdmin().catch(() => null),
    // As the user (RLS): topics made this month, not counting the example.
    supabase
      .from("topics")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_example", false)
      .gte("created_at", monthStart())
      .then((r) => r.count ?? 0),
  ]);
  const l1 = profile.l1 === "zh" || profile.l1 === "en" ? profile.l1 : "other";
  return (
    <SettingsView
      profile={{
        level: profile.level as Level,
        selfGender: profile.self_gender as "m" | "f" | "x",
        explainLang: profile.explain_lang as "en" | "zh",
        zhGloss: profile.zh_gloss,
        l1,
        llm: profile.llm,
        tts: profile.tts,
        stt: profile.stt,
        email: (claims?.claims?.email as string | undefined) ?? null,
      }}
      keys={keys.map((k) => ({ id: k.id, provider: k.provider, label: k.label, baseUrl: k.baseUrl, last4: k.last4, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt }))}
      usage={{ ...usage, topics: topicsThisMonth }}
      allowMock={mockAllowed()}
      isAdmin={Boolean(admin)}
    />
  );
}
