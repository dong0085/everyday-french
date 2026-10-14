// Wrapper for every /api route: auth, same-origin check, content type, and safe errors.
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getUserId } from "@/lib/supabase/server";
import { AppError, logError, toAppError } from "@/lib/providers/errors";

type Body = "json" | "multipart" | "none";
type Handler<P> = (ctx: { req: NextRequest; userId: string; params: P }) => Promise<Response | unknown>;

export function sameOrigin(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = req.headers.get("origin");
  return origin !== null && origin === req.nextUrl.origin;
}

export function api<P = Record<string, string>>(body: Body, handler: Handler<P>) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        if (!sameOrigin(req)) throw new AppError("bad_request", "Cross-site request blocked.", 403);
        const type = req.headers.get("content-type") ?? "";
        if (body === "json" && !type.startsWith("application/json")) throw new AppError("bad_request", "Expected JSON.", 415);
        if (body === "multipart" && !type.startsWith("multipart/form-data")) throw new AppError("bad_request", "Expected a file upload.", 415);
      }
      const userId = await getUserId();
      if (!userId) throw new AppError("bad_request", "Please sign in again.", 401);
      const result = await handler({ req, userId, params: await ctx.params });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      const e = toAppError(err);
      if (e.status >= 500 || e.code === "unknown") logError(`${req.method} ${req.nextUrl.pathname}`, err);
      return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
    }
  };
}

/** Parse a JSON body with a zod schema; bad input → 400. */
export async function readJson<T>(req: NextRequest, schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }): Promise<T> {
  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new AppError("bad_request", "The request was not valid.", 400);
  return parsed.data;
}
