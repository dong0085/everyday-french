import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId, createClient } from "@/lib/supabase/server";
import { DbUnavailableError, getProfile, isDbUnavailable } from "@/lib/data";
import { mockAllowed } from "@/lib/providers/mock";
import { provider as providerInfo, topicCostUsd } from "@/lib/providers/catalog";
import { money } from "@/lib/format";
import { NewTopic } from "@/components/NewTopic";
import { Unavailable } from "@/components/Unavailable";
import { ideaKey } from "@/components/home/ideas";
import type { Level } from "@/lib/content/schema";

export const metadata: Metadata = { title: "New topic" };

type Capture = { id: string; text: string; audioUrl: string | null };

async function loadCapture(id: string): Promise<Capture | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("captures").select("id, text, audio_path").eq("id", id).maybeSingle();
  if (error && error.code !== "22P02") throw new DbUnavailableError(error);
  if (!data) return null;
  let audioUrl: string | null = null;
  if (data.audio_path) audioUrl = (await supabase.storage.from("captures").createSignedUrl(data.audio_path, 3600)).data?.signedUrl ?? null;
  return { id: data.id, text: data.text, audioUrl };
}

/** What one topic costs with the saved model, in plain words, when we know it. */
function costLine(llm: { provider: string; model: string } | null): string | null {
  if (!llm) return null;
  if (providerInfo(llm.provider)?.freeTier) return "free on the free tier";
  const usd = topicCostUsd(llm.provider, llm.model);
  return usd === null ? null : `about ${money(usd)}`;
}

export default async function NewPage(props: PageProps<"/new">) {
  const userId = await getUserId();
  if (!userId) redirect("/");
  const sp = await props.searchParams;

  const data = await Promise.all([getProfile(userId), typeof sp.capture === "string" ? loadCapture(sp.capture) : null]).catch((e) => {
    if (isDbUnavailable(e)) return null;
    throw e;
  });
  if (!data) return <Unavailable />;
  const [profile, capture] = data;

  return (
    <NewTopic
      setUp={Boolean(profile.set_up_at)}
      level={profile.level as Level}
      selfGender={profile.self_gender as "m" | "f" | "x"}
      l1={(profile.l1 as "zh" | "en" | "other") ?? "other"}
      hasLlm={Boolean(profile.llm)}
      hasStt={Boolean(profile.stt)}
      allowMock={mockAllowed()}
      cost={costLine(profile.llm)}
      idea={capture ? null : ideaKey(sp.idea)}
      capture={capture}
    />
  );
}
