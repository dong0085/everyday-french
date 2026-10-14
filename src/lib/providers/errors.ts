// Turns provider failures into a fixed set of plain-language messages.
// Provider error bodies are never shown or logged as-is: some echo parts of the API key.
import { APICallError, NoObjectGeneratedError, RetryError } from "ai";
import { UnsafeUrlError } from "./safe-fetch";

export type ErrorCode =
  | "bad_key"
  | "no_credit"
  | "rate_limited"
  | "provider_down"
  | "bad_output"
  | "timeout"
  | "unsafe_url"
  | "no_key"
  | "too_many"
  | "bad_request"
  | "unknown";

const MESSAGES: Record<ErrorCode, string> = {
  bad_key: "The API key was rejected. Check it in Settings, or create a new one.",
  no_credit: "Your account with this provider is out of credit or over its quota.",
  rate_limited: "The provider is limiting requests right now. Wait a minute and try again.",
  provider_down: "The provider had a problem. Try again in a moment.",
  bad_output: "The model returned something unusable. Try again, or pick a stronger model.",
  timeout: "The provider took too long to answer. Try again.",
  unsafe_url: "That endpoint address is not allowed.",
  no_key: "Add an API key for this in Settings first.",
  too_many: "You have made a lot of requests in a short time. Wait a few minutes.",
  bad_request: "The provider did not accept the request. Try a different model.",
  unknown: "Something went wrong. Try again.",
};

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public status = 400,
  ) {
    super(message ?? MESSAGES[code]);
  }
}

export function codeForStatus(status: number, body = ""): ErrorCode {
  const b = body.toLowerCase();
  if (status === 401 || status === 403) return /quota|credit|balance|billing/.test(b) ? "no_credit" : "bad_key";
  if (status === 402) return "no_credit";
  if (status === 429) return /quota|credit|insufficient|billing|exceeded your/.test(b) ? "no_credit" : "rate_limited";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500) return "provider_down";
  if (status === 400 || status === 404 || status === 422) return "bad_request";
  return "unknown";
}

/** Any thrown value → AppError with a safe message. */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof UnsafeUrlError) return new AppError("unsafe_url", err.message);
  if (RetryError.isInstance(err)) return toAppError(err.lastError);
  if (APICallError.isInstance(err)) {
    const code = codeForStatus(err.statusCode ?? 0, err.responseBody ?? "");
    return new AppError(code, undefined, code === "bad_request" ? 400 : 502);
  }
  if (NoObjectGeneratedError.isInstance(err)) return new AppError("bad_output", undefined, 502);
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) return new AppError("timeout", undefined, 504);
  return new AppError("unknown", undefined, 500);
}

const KEYISH = [
  /sk-ant-[A-Za-z0-9_-]{8,}/g,
  /sk-or-[A-Za-z0-9_-]{8,}/g,
  /sk-[A-Za-z0-9_-]{8,}/g,
  /sk_[A-Za-z0-9]{8,}/g,
  /gsk_[A-Za-z0-9]{8,}/g,
  /xai-[A-Za-z0-9]{8,}/g,
  /AIza[0-9A-Za-z_-]{20,}/g,
  /(bearer|x-api-key|xi-api-key|x-goog-api-key|authorization)["':\s]+[^\s"',}]+/gi,
];

export function scrub(s: string): string {
  return KEYISH.reduce((acc, re) => acc.replace(re, "[redacted]"), s);
}

/** The only way server code logs errors: message and status, scrubbed. */
export function logError(where: string, err: unknown) {
  const status = APICallError.isInstance(err) ? err.statusCode : undefined;
  const name = err instanceof Error ? err.name : typeof err;
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${where}] ${name}${status ? ` ${status}` : ""}: ${scrub(message).slice(0, 300)}`);
}
