// Reading and writing users' provider keys. The only module that decrypts them.
// Every function takes the verified user id from getUserId(); never a user id from the request.
import "server-only";
import { randomUUID } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { AppError } from "@/lib/providers/errors";
import { currentKeyVersion, open, seal } from "./crypto";

export type MaskedKey = {
  id: string;
  provider: string;
  label: string;
  baseUrl: string | null;
  supportsJsonSchema: boolean;
  last4: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type ProviderKey = {
  id: string;
  provider: string;
  key: string;
  baseUrl: string | null;
  supportsJsonSchema: boolean;
};

export async function listKeys(userId: string): Promise<MaskedKey[]> {
  const { data, error } = await adminClient()
    .from("api_keys")
    .select("id, provider, label, base_url, supports_json_schema, last4, created_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    provider: r.provider,
    label: r.label,
    baseUrl: r.base_url,
    supportsJsonSchema: r.supports_json_schema,
    last4: r.last4,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
  }));
}

export async function saveKey(input: {
  userId: string;
  provider: string;
  key: string;
  label?: string;
  baseUrl?: string | null;
  supportsJsonSchema?: boolean;
}): Promise<string> {
  const id = randomUUID();
  const label = input.label?.trim() || "default";
  const sealed = seal(input.key, { userId: input.userId, keyId: id, provider: input.provider });
  const db = adminClient();
  await db.from("api_keys").delete().eq("user_id", input.userId).eq("provider", input.provider).eq("label", label);
  const { error } = await db.from("api_keys").insert({
    id,
    user_id: input.userId,
    provider: input.provider,
    label,
    base_url: input.baseUrl ?? null,
    supports_json_schema: input.supportsJsonSchema ?? false,
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    auth_tag: sealed.authTag,
    key_version: sealed.keyVersion,
    last4: input.key.slice(-4),
  });
  if (error) throw error;
  return id;
}

export async function deleteKey(userId: string, id: string) {
  const { error } = await adminClient().from("api_keys").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export async function deleteAllKeys(userId: string) {
  const { error } = await adminClient().from("api_keys").delete().eq("user_id", userId);
  if (error) throw error;
}

/** Decrypts the user's key for a provider (a specific row when keyId is given). Throws no_key. */
export async function getKey(userId: string, provider: string, keyId?: string | null): Promise<ProviderKey> {
  let q = adminClient()
    .from("api_keys")
    .select("id, provider, ciphertext, iv, auth_tag, key_version, base_url, supports_json_schema")
    .eq("user_id", userId)
    .eq("provider", provider);
  if (keyId) q = q.eq("id", keyId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("no_key");

  const ctx = { userId, keyId: data.id, provider: data.provider };
  const key = open({ ciphertext: data.ciphertext, iv: data.iv, authTag: data.auth_tag, keyVersion: data.key_version }, ctx);

  // Re-encrypt rows still on an old master secret, and note when the key was last used.
  const update: Database["public"]["Tables"]["api_keys"]["Update"] = { last_used_at: new Date().toISOString() };
  if (data.key_version !== currentKeyVersion()) {
    const s = seal(key, ctx);
    Object.assign(update, { ciphertext: s.ciphertext, iv: s.iv, auth_tag: s.authTag, key_version: s.keyVersion });
  }
  void adminClient().from("api_keys").update(update).eq("id", data.id).eq("user_id", userId).then(() => {});

  return { id: data.id, provider: data.provider, key, baseUrl: data.base_url, supportsJsonSchema: data.supports_json_schema };
}
