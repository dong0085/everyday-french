import { api } from "@/lib/http";
import { connections } from "@/lib/conn";
import { getKey } from "@/lib/keys/store";
import { transcribe } from "@/lib/providers/speech";
import { AppError } from "@/lib/providers/errors";
import { adminClient } from "@/lib/supabase/admin";
import { audioExt } from "@/lib/audio/upload";
import { checkLimit, recordUsage } from "@/lib/usage";

export const maxDuration = 120;

// Turns a saved voice memo into text (the memo stays in storage; the server reads it directly).
export const POST = api<{ id: string }>("json", async ({ userId, params }) => {
  const db = adminClient();
  const { data: c } = await db.from("captures").select("audio_path, audio_mime").eq("id", params.id).eq("user_id", userId).maybeSingle();
  if (!c?.audio_path) throw new AppError("bad_request", "This note has no voice memo.", 404);
  const { stt } = await connections(userId);
  if (!stt) throw new AppError("no_key", "Choose a speech-to-text service in Settings first.");
  await checkLimit(userId, "stt");
  const file = await db.storage.from("captures").download(c.audio_path);
  if (file.error || !file.data) throw new AppError("unknown");
  const mime = c.audio_mime ?? file.data.type;
  const key = stt.provider === "mock" ? ("mock" as const) : await getKey(userId, stt.provider, stt.keyId);
  const text = await transcribe({ key, model: stt.model, audio: new Blob([await file.data.arrayBuffer()], { type: mime }), filename: `memo.${audioExt(mime)}` });
  await recordUsage({ userId, kind: "stt", provider: stt.provider, model: stt.model, units: 0, unitType: "seconds" });
  return { text };
});
