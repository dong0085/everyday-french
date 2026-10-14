import { api } from "@/lib/http";
import { connections } from "@/lib/conn";
import { getKey } from "@/lib/keys/store";
import { transcribe } from "@/lib/providers/speech";
import { AppError } from "@/lib/providers/errors";
import { audioExt, readAudioForm } from "@/lib/audio/upload";
import { checkLimit, recordUsage } from "@/lib/usage";

export const maxDuration = 120;

export const POST = api("multipart", async ({ req, userId }) => {
  const { audio, seconds } = await readAudioForm(req, true);
  const { stt } = await connections(userId);
  if (!stt) throw new AppError("no_key", "Choose a speech-to-text service in Settings first.");
  await checkLimit(userId, "stt");
  const key = stt.provider === "mock" ? ("mock" as const) : await getKey(userId, stt.provider, stt.keyId);
  const text = await transcribe({ key, model: stt.model, audio: audio!, filename: `memo.${audioExt(audio!.type)}` });
  await recordUsage({ userId, kind: "stt", provider: stt.provider, model: stt.model, units: seconds, unitType: "seconds" });
  return { text };
});
