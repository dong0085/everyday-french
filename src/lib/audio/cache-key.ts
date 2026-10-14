import { createHash } from "node:crypto";

/** Same text + same voice → same recording, reused forever. */
export function clipKey(provider: string, model: string, voice: string, text: string): string {
  return createHash("sha256").update(`${provider}|${model}|${voice}|${text.trim()}`).digest("hex");
}
