import { api } from "@/lib/http";
import { deleteKey, listKeys } from "@/lib/keys/store";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const DELETE = api<{ id: string }>("none", async ({ userId, params }) => {
  await deleteKey(userId, params.id);
  // Defaults that used this key no longer work: clear them.
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("llm, tts, stt").eq("id", userId).single();
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {};
  for (const use of ["llm", "tts", "stt"] as const) {
    if ((p?.[use] as { keyId?: string } | null)?.keyId === params.id) patch[use] = null;
  }
  if (Object.keys(patch).length) await supabase.from("profiles").update(patch).eq("id", userId);
  return { keys: await listKeys(userId) };
});
