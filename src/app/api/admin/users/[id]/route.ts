// Admin actions on one account: block / unblock sign-in, or delete the account.
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { requireAdmin } from "@/lib/admin";
import { deleteAccount } from "@/lib/account";
import { adminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/providers/errors";

type Params = { id: string };

const idSchema = z.uuid();
const actionSchema = z.object({ action: z.enum(["block", "unblock"]) });

async function target(id: string, adminId: string) {
  if (!idSchema.safeParse(id).success) throw new AppError("bad_request", "Not found.", 404);
  if (id === adminId) throw new AppError("bad_request", "You can't do this to your own account here.", 400);
  const { data, error } = await adminClient().auth.admin.getUserById(id);
  if (error || !data.user) throw new AppError("bad_request", "Not found.", 404);
  return data.user;
}

// Blocking stops sign-in and session refresh; a session that is already open ends within the hour.
export const PATCH = api<Params>("json", async ({ req, params }) => {
  const admin = await requireAdmin();
  const { action } = await readJson(req, actionSchema);
  const user = await target(params.id, admin.userId);
  const { error } = await adminClient().auth.admin.updateUserById(user.id, { ban_duration: action === "block" ? "876000h" : "none" });
  if (error) throw error;
  return { ok: true };
});

export const DELETE = api<Params>("none", async ({ params }) => {
  const admin = await requireAdmin();
  const user = await target(params.id, admin.userId);
  await deleteAccount(user.id);
  return { ok: true };
});
