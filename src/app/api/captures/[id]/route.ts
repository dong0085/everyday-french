import { api } from "@/lib/http";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const GET = api<{ id: string }>("none", async ({ params }) => {
  const supabase = await createClient();
  const { data } = await supabase.from("captures").select("id, text, audio_path").eq("id", params.id).maybeSingle();
  if (!data) return { capture: null };
  let audioUrl: string | null = null;
  if (data.audio_path) {
    const { data: s } = await supabase.storage.from("captures").createSignedUrl(data.audio_path, 3600);
    audioUrl = s?.signedUrl ?? null;
  }
  return { capture: { id: data.id, text: data.text, audioUrl } };
});

export const DELETE = api<{ id: string }>("none", async ({ userId, params }) => {
  const db = adminClient();
  const { data } = await db.from("captures").select("audio_path").eq("id", params.id).eq("user_id", userId).maybeSingle();
  if (data?.audio_path) await db.storage.from("captures").remove([data.audio_path]);
  await db.from("captures").delete().eq("id", params.id).eq("user_id", userId);
  return { ok: true };
});
