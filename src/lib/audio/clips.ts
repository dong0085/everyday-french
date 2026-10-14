// Finding saved recordings and keeping their signed URLs stable (so the CDN can cache them).
import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { clipKey } from "./cache-key";
import type { SpeechConn } from "@/lib/conn";

const SIGN_SECONDS = 7 * 24 * 3600;
const RESIGN_BEFORE_MS = 24 * 3600_000;

type ClipRow = { id: string; text: string; cache_key: string; storage_path: string; signed_url: string | null; signed_until: string | null };

/** Signed URLs for these rows, reusing stored ones until a day before they expire. */
export async function signedUrls(userId: string, rows: ClipRow[]): Promise<Map<string, string>> {
  const db = adminClient();
  const out = new Map<string, string>();
  const stale = rows.filter((r) => !r.signed_url || !r.signed_until || new Date(r.signed_until).getTime() - Date.now() < RESIGN_BEFORE_MS);
  for (const r of rows) if (!stale.includes(r) && r.signed_url) out.set(r.id, r.signed_url);
  if (stale.length) {
    const { data } = await db.storage.from("clips").createSignedUrls(stale.map((r) => r.storage_path), SIGN_SECONDS);
    const until = new Date(Date.now() + SIGN_SECONDS * 1000).toISOString();
    await Promise.all(
      stale.map((r, i) => {
        const url = data?.[i]?.signedUrl;
        if (!url) return null;
        out.set(r.id, url);
        return db.from("clips").update({ signed_url: url, signed_until: until }).eq("id", r.id).eq("user_id", userId);
      }),
    );
  }
  return out;
}

/** For each text: the recording in the current voice if there is one, else any saved recording of that text. */
export async function clipsFor(userId: string, texts: string[], tts: SpeechConn | null): Promise<Record<string, string>> {
  if (!texts.length) return {};
  const { data } = await adminClient()
    .from("clips")
    .select("id, text, cache_key, storage_path, signed_url, signed_until")
    .eq("user_id", userId)
    .in("text", texts.slice(0, 800));
  const rows = (data ?? []) as ClipRow[];
  const wanted = new Map<string, ClipRow>();
  for (const text of texts) {
    const preferred = tts ? clipKey(tts.provider, tts.model, tts.voice, text) : null;
    const best = rows.find((r) => r.cache_key === preferred) ?? rows.find((r) => r.text === text);
    if (best) wanted.set(text, best);
  }
  const urls = await signedUrls(userId, [...new Set(wanted.values())]);
  const result: Record<string, string> = {};
  for (const [text, row] of wanted) {
    const url = urls.get(row.id);
    if (url) result[text] = url;
  }
  return result;
}
