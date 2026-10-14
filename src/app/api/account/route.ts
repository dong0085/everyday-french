import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { deleteAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";

// Deletes the signed-in user's account and everything in it.
export const DELETE = api("none", async ({ userId }) => {
  await deleteAccount(userId);
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
});
