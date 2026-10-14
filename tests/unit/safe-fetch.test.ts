import { describe, expect, it } from "vitest";
import { checkBaseUrl, isPublicAddress, pinnedFetch, UnsafeUrlError } from "@/lib/providers/safe-fetch";

describe("isPublicAddress", () => {
  it.each(["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.5.4", "192.168.1.1", "100.64.0.1", "0.0.0.0", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::10.0.0.1"])(
    "blocks %s",
    (ip) => expect(isPublicAddress(ip)).toBe(false),
  );
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])("allows %s", (ip) => expect(isPublicAddress(ip)).toBe(true));
  it("rejects non-IPs", () => expect(isPublicAddress("example.com")).toBe(false));
});

describe("checkBaseUrl", () => {
  it("accepts a normal https URL", () => expect(checkBaseUrl("https://api.example.com/v1").hostname).toBe("api.example.com"));
  it.each([
    "http://api.example.com/v1",
    "https://user:pass@api.example.com",
    "https://api.example.com:8443",
    "https://localhost/v1",
    "https://127.0.0.1/v1",
    "https://[::1]/v1",
    "https://169.254.169.254/latest",
    "https://printer.local",
    "not a url",
  ])("rejects %s", (u) => expect(() => checkBaseUrl(u)).toThrow(UnsafeUrlError));
});

describe("pinnedFetch", () => {
  it("refuses hosts that resolve to private addresses", async () => {
    await expect(pinnedFetch(new URL("https://localtest.me"))).rejects.toThrow(UnsafeUrlError);
  });
  it("refuses requests to another host", async () => {
    const f = await pinnedFetch(new URL("https://1.1.1.1"));
    await expect(f("https://example.com/v1/models")).rejects.toThrow(UnsafeUrlError);
  });
});
