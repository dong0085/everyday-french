import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function removeFolder(bucket: string, userId: string) {
  const db = adminClient();
  for (;;) {
    const { data } = await db.storage.from(bucket).list(userId, { limit: 1000 });
    if (!data?.length) return;
    await db.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
    if (data.length < 1000) return;
  }
}

// Deletes the account: recordings and memos first, then the user (all rows cascade).
export const DELETE = api("none", async ({ userId }) => {
  await removeFolder("clips", userId);
  await removeFolder("captures", userId);
  const { error } = await adminClient().auth.admin.deleteUser(userId);
  if (error) throw error;
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
});
