// Encryption for users' provider API keys. AES-256-GCM with a per-row key derived by HKDF.
// The master secret lives only in the environment (KEY_ENCRYPTION_SECRET_V<n>); the database
// holds only ciphertext, so a database leak alone or an env leak alone reveals nothing.
import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

export type Sealed = { ciphertext: string; iv: string; authTag: string; keyVersion: number };
export type KeyContext = { userId: string; keyId: string; provider: string };

export function currentKeyVersion(): number {
  return Number(process.env.KEY_ENCRYPTION_VERSION || "1");
}

function master(version: number): Buffer {
  const raw = process.env[`KEY_ENCRYPTION_SECRET_V${version}`];
  if (!raw) throw new Error(`Missing KEY_ENCRYPTION_SECRET_V${version}`);
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error(`KEY_ENCRYPTION_SECRET_V${version} must be 32 bytes (base64)`);
  return buf;
}

function rowKey(version: number, ctx: KeyContext): Buffer {
  return Buffer.from(hkdfSync("sha256", master(version), Buffer.alloc(0), `ef-api-key:${ctx.userId}:${ctx.keyId}`, 32));
}

// Binding the row's identity into the AAD means a ciphertext copied to another row will not decrypt.
function aad(version: number, ctx: KeyContext): Buffer {
  return Buffer.from(`${ctx.userId}|${ctx.provider}|${ctx.keyId}|${version}`);
}

export function seal(plaintext: string, ctx: KeyContext, version = currentKeyVersion()): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", rowKey(version, ctx), iv);
  cipher.setAAD(aad(version, ctx));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: version,
  };
}

export function open(sealed: Sealed, ctx: KeyContext): string {
  const decipher = createDecipheriv("aes-256-gcm", rowKey(sealed.keyVersion, ctx), Buffer.from(sealed.iv, "base64"));
  decipher.setAAD(aad(sealed.keyVersion, ctx));
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(sealed.ciphertext, "base64")), decipher.final()]).toString("utf8");
}
