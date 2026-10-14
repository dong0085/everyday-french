// Deleting an account: recordings and memos first, then the user (all rows cascade).
// Used by "Delete my account" in Settings and by the admin panel.
import "server-only";
import { adminClient } from "@/lib/supabase/admin";

async function removeFolder(bucket: string, userId: string) {
  const db = adminClient();
  for (;;) {
    const { data } = await db.storage.from(bucket).list(userId, { limit: 1000 });
    if (!data?.length) return;
    await db.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
    if (data.length < 1000) return;
  }
}

export async function deleteAccount(userId: string) {
  await removeFolder("clips", userId);
  await removeFolder("captures", userId);
  const { error } = await adminClient().auth.admin.deleteUser(userId);
  if (error) throw error;
}
