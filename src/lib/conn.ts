// The user's chosen AI connections, read from their profile.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/providers/errors";

export type Conn = { provider: string; model: string; keyId?: string | null };
export type SpeechConn = Conn & { voice: string; voiceName?: string };

export async function connections(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("llm, tts, stt, level, self_gender, explain_lang, zh_gloss").eq("id", userId).single();
  if (!data) throw new AppError("bad_request", "Profile missing.", 404);
  return {
    profile: data,
    llm: data.llm as Conn | null,
    tts: data.tts as SpeechConn | null,
    stt: data.stt as Conn | null,
  };
}

export async function requireLlm(userId: string): Promise<Conn> {
  const { llm } = await connections(userId);
  if (!llm) throw new AppError("no_key", "Choose an AI model first.");
  return llm;
}
