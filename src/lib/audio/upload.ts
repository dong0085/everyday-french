// Reading recorded audio from multipart uploads. Vercel caps request bodies at 4.5 MB.
import "server-only";
import type { NextRequest } from "next/server";
import { AppError } from "@/lib/providers/errors";

export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const TYPES = ["audio/mp4", "audio/webm", "audio/ogg", "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/aac"];

export function audioExt(type: string): string {
  if (type.includes("webm")) return "webm";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mpeg")) return "mp3";
  if (type.includes("wav")) return "wav";
  return "m4a";
}

export async function readAudioForm(req: NextRequest, audioRequired: boolean) {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > MAX_AUDIO_BYTES + 64 * 1024) throw new AppError("bad_request", "The recording is too long. Keep it under 3 minutes.", 413);
  const form = await req.formData();
  const text = String(form.get("text") ?? "").trim().slice(0, 8000) || null;
  const file = form.get("audio");
  let audio: Blob | null = null;
  if (file instanceof Blob && file.size > 0) {
    const type = file.type.split(";")[0];
    if (!TYPES.includes(type)) throw new AppError("bad_request", "That audio format is not supported.", 415);
    if (file.size > MAX_AUDIO_BYTES) throw new AppError("bad_request", "The recording is too long. Keep it under 3 minutes.", 413);
    audio = new Blob([await file.arrayBuffer()], { type });
  }
  if (audioRequired && !audio) throw new AppError("bad_request", "No recording received.");
  const seconds = Math.min(600, Math.max(0, Number(form.get("seconds") ?? 0) || 0));
  return { text, audio, seconds };
}
