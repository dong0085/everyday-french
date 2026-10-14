import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId, createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data";
import { mockAllowed } from "@/lib/providers/mock";
import { NewTopic } from "@/components/NewTopic";
import type { Level } from "@/lib/content/schema";

export const metadata: Metadata = { title: "New topic" };

export default async function NewPage(props: PageProps<"/new">) {
  const userId = await getUserId();
  if (!userId) redirect("/");
  const sp = await props.searchParams;
  const profile = await getProfile(userId);

  let capture: { id: string; text: string; audioUrl: string | null } | null = null;
  if (typeof sp.capture === "string") {
    const supabase = await createClient();
    const { data } = await supabase.from("captures").select("id, text, audio_path").eq("id", sp.capture).maybeSingle();
    if (data) {
      let audioUrl: string | null = null;
      if (data.audio_path) audioUrl = (await supabase.storage.from("captures").createSignedUrl(data.audio_path, 3600)).data?.signedUrl ?? null;
      capture = { id: data.id, text: data.text, audioUrl };
    }
  }

  return (
    <NewTopic
      setUp={Boolean(profile.set_up_at)}
      level={profile.level as Level}
      selfGender={profile.self_gender as "m" | "f" | "x"}
      hasLlm={Boolean(profile.llm)}
      hasStt={Boolean(profile.stt)}
      allowMock={mockAllowed()}
      capture={capture}
    />
  );
}
