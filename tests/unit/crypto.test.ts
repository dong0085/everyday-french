import { beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { open, seal } from "@/lib/keys/crypto";

beforeAll(() => {
  process.env.KEY_ENCRYPTION_SECRET_V1 = randomBytes(32).toString("base64");
  process.env.KEY_ENCRYPTION_SECRET_V2 = randomBytes(32).toString("base64");
  process.env.KEY_ENCRYPTION_VERSION = "1";
});

const ctx = { userId: "u1", keyId: "k1", provider: "openai" };

describe("key encryption", () => {
  it("round-trips", () => {
    const s = seal("sk-test-1234", ctx);
    expect(s.ciphertext).not.toContain("sk-test");
    expect(open(s, ctx)).toBe("sk-test-1234");
  });
  it("uses a fresh IV each time", () => {
    expect(seal("x", ctx).iv).not.toBe(seal("x", ctx).iv);
  });
  it("refuses a ciphertext moved to another row, user or provider", () => {
    const s = seal("sk-test-1234", ctx);
    expect(() => open(s, { ...ctx, keyId: "k2" })).toThrow();
    expect(() => open(s, { ...ctx, userId: "u2" })).toThrow();
    expect(() => open(s, { ...ctx, provider: "anthropic" })).toThrow();
  });
  it("refuses tampered data", () => {
    const s = seal("sk-test-1234", ctx);
    const bad = Buffer.from(s.ciphertext, "base64");
    bad[0] ^= 1;
    expect(() => open({ ...s, ciphertext: bad.toString("base64") }, ctx)).toThrow();
  });
  it("decrypts old versions after rotation", () => {
    const old = seal("sk-old", ctx, 1);
    process.env.KEY_ENCRYPTION_VERSION = "2";
    expect(seal("sk-new", ctx).keyVersion).toBe(2);
    expect(open(old, ctx)).toBe("sk-old");
    process.env.KEY_ENCRYPTION_VERSION = "1";
  });
});
