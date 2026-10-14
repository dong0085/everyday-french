import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data";
import { listKeys } from "@/lib/keys/store";
import { monthUsage } from "@/lib/usage";
import { mockAllowed } from "@/lib/providers/mock";
import { SettingsView } from "@/components/SettingsView";
import type { Level } from "@/lib/content/schema";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/");
  const supabase = await createClient();
  const [profile, keys, usage, { data: claims }] = await Promise.all([getProfile(userId), listKeys(userId), monthUsage(userId), supabase.auth.getClaims()]);
  return (
    <SettingsView
      profile={{
        level: profile.level as Level,
        selfGender: profile.self_gender as "m" | "f" | "x",
        explainLang: profile.explain_lang as "en" | "zh",
        zhGloss: profile.zh_gloss,
        llm: profile.llm,
        tts: profile.tts,
        stt: profile.stt,
        email: (claims?.claims?.email as string | undefined) ?? null,
      }}
      keys={keys.map((k) => ({ id: k.id, provider: k.provider, label: k.label, baseUrl: k.baseUrl, last4: k.last4, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt }))}
      usage={usage}
      allowMock={mockAllowed()}
    />
  );
}
