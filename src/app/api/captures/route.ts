import { randomUUID } from "node:crypto";
import { api } from "@/lib/http";
import { adminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/providers/errors";
import { audioExt, readAudioForm } from "@/lib/audio/upload";

// "Save for later": keeps the text and/or the raw voice memo, with no AI call.
export const POST = api("multipart", async ({ req, userId }) => {
  const { text, audio } = await readAudioForm(req, false);
  if (!text && !audio) throw new AppError("bad_request", "Nothing to save.");
  const db = adminClient();
  let audio_path: string | null = null;
  if (audio) {
    audio_path = `${userId}/${randomUUID()}.${audioExt(audio.type)}`;
    const { error } = await db.storage.from("captures").upload(audio_path, audio, { contentType: audio.type });
    if (error) throw error;
  }
  const { data, error } = await db
    .from("captures")
    .insert({ user_id: userId, text: text ?? "", audio_path, audio_mime: audio?.type ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
});
