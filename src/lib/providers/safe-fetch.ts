// SSRF guard for user-supplied base URLs (the "custom" provider only).
// The hostname is resolved once, every address is checked, and the connection is pinned to the
// checked address, so DNS rebinding between "check" and "connect" cannot reach private networks.
import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["2001:db8::", 32], ["100::", 64],
] as const) blocked.addSubnet(net, prefix, "ipv6");

/** IPv4-mapped (::ffff:a.b.c.d) and NAT64 (64:ff9b::a.b.c.d) addresses carry an IPv4 inside. */
function embeddedV4(ip: string): string | null {
  const m = ip.toLowerCase().match(/^(?:::ffff:|64:ff9b::)(?:0:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return m[1];
  const hex = ip.toLowerCase().match(/^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const a = parseInt(hex[1], 16), b = parseInt(hex[2], 16);
    return [a >> 8, a & 255, b >> 8, b & 255].join(".");
  }
  return null;
}

export function isPublicAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return !blocked.check(ip, "ipv4");
  if (family === 6) {
    const v4 = embeddedV4(ip);
    if (v4) return !blocked.check(v4, "ipv4");
    return !blocked.check(ip, "ipv6");
  }
  return false;
}

export class UnsafeUrlError extends Error {}

/** Checks the shape of a user-supplied base URL. Throws UnsafeUrlError. */
export function checkBaseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new UnsafeUrlError("That is not a valid URL.");
  }
  if (url.protocol !== "https:") throw new UnsafeUrlError("The URL must start with https://");
  if (url.username || url.password) throw new UnsafeUrlError("The URL must not contain a user name or password.");
  if (url.port && url.port !== "443") throw new UnsafeUrlError("Only the standard https port (443) is allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local"))
    throw new UnsafeUrlError("Local addresses are not allowed.");
  if (isIP(host) && !isPublicAddress(host)) throw new UnsafeUrlError("Private network addresses are not allowed.");
  url.hash = "";
  return url;
}

/** A fetch function that can only reach the base URL's host, pinned to a checked public IP. */
export async function pinnedFetch(base: URL): Promise<typeof fetch> {
  const host = base.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new UnsafeUrlError("That host resolves to a private network address.");
  const pinned = addresses[0];

  const agent = new Agent({
    connect: {
      lookup: (_hostname, options, callback) => {
        if ((options as { all?: boolean }).all) callback(null, [{ address: pinned.address, family: pinned.family }]);
        else (callback as (e: null, a: string, f: number) => void)(null, pinned.address, pinned.family);
      },
    },
    connectTimeout: 10_000,
  });

  const guarded = async (input: string | URL | Request, init?: RequestInit) => {
    const target = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (target.hostname !== base.hostname || target.protocol !== "https:")
      throw new UnsafeUrlError("Request left the configured host.");
    const res = await undiciFetch(target, {
      ...(init as Parameters<typeof undiciFetch>[1]),
      dispatcher: agent,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) throw new UnsafeUrlError("The endpoint tried to redirect; redirects are blocked.");
    return res as unknown as Response;
  };
  return guarded as typeof fetch;
}
