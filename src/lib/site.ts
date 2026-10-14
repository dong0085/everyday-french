// The app's public origin, for OAuth redirects.
export function siteUrl(requestOrigin?: string): string {
  if (process.env.NEXT_PUBLIC_SITE_URL && process.env.VERCEL_ENV === "production") return process.env.NEXT_PUBLIC_SITE_URL;
  if (requestOrigin) return requestOrigin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Only same-site relative paths, so the login flow can't be used to redirect elsewhere. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
