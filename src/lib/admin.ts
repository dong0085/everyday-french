// Admin panel: who is an admin, and the read-only numbers the panel shows.
// Admins are listed by email in ADMIN_EMAILS (comma-separated). Everyone else gets a plain 404.
// The panel shows account metadata and counts only: never topic content, stories, notes or keys.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/providers/errors";
import { GLOBAL_PER_DAY } from "@/lib/usage";
import { mockAllowed } from "@/lib/providers/mock";
import { when } from "@/lib/format";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** The signed-in admin, verified from the JWT; null for everyone else. */
export async function getAdmin(): Promise<{ userId: string; email: string } | null> {
  const allowed = adminEmails();
  if (allowed.length === 0) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const email = typeof claims?.email === "string" ? claims.email.toLowerCase() : "";
  if (!claims?.sub || !email || claims.is_anonymous || !allowed.includes(email)) return null;
  return { userId: claims.sub, email };
}

/** For admin API routes: a non-admin sees the same 404 as a missing route. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new AppError("bad_request", "Not found.", 404);
  return admin;
}

// ---------- numbers ----------

export type Overview = {
  users: { total: number; new7: number; new30: number; active7: number; signedIn7: number; banned: number };
  topics: {
    total: number;
    ready: number;
    generating: number;
    failed: number;
    new7: number;
    lines: number;
    flaggedLines: number;
    captures: number;
    capturesOpen: number;
  };
  clips: { count: number; bytes: number };
  storage: Record<string, { files: number; bytes: number }>;
  dbBytes: number;
  heartbeat: { at: string; source: string | null } | null;
  daily: { day: string; users: number; topics: number; failed: number; llm: number; tts: number }[];
  today: Partial<Record<keyof typeof GLOBAL_PER_DAY, number>>;
  usage30: {
    kind: string;
    provider: string | null;
    model: string | null;
    calls: number;
    units: number;
    unitType: string | null;
    costUsd: number | null;
    users: number;
  }[];
  models30: { model: string; ready: number; failed: number; generating: number }[];
  failures: { at: string; email: string | null; model: string | null; stage: string; error: string | null; kind: "topic" | "section" }[];
  stuck: number;
};

export type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  provider: string;
  createdAt: string;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  blocked: boolean;
  level: string | null;
  topics: number;
  failed: number;
  clips: number;
  clipBytes: number;
  captures: number;
  keyProviders: string[];
  llmModel: string | null;
  ttsProvider: string | null;
  calls30: number;
  cost30: number;
  lastActive: string | null;
};

export async function loadOverview(): Promise<Overview> {
  const { data, error } = await adminClient().rpc("admin_overview");
  if (error || !data) throw error ?? new Error("admin_overview returned nothing");
  return data as unknown as Overview;
}

export async function loadUsers(): Promise<AdminUser[]> {
  const { data, error } = await adminClient().rpc("admin_users");
  if (error) throw error;
  return (data ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    provider: u.provider,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at,
    bannedUntil: u.banned_until,
    blocked: Boolean(u.banned_until && new Date(u.banned_until).getTime() > Date.now()),
    level: u.level,
    topics: Number(u.topics),
    failed: Number(u.failed),
    clips: Number(u.clips),
    clipBytes: Number(u.clip_bytes),
    captures: Number(u.captures),
    keyProviders: u.key_providers ?? [],
    llmModel: u.llm_model,
    ttsProvider: u.tts_provider,
    calls30: Number(u.calls30),
    cost30: Number(u.cost30),
    lastActive: u.last_active,
  }));
}

// ---------- setup checks ----------

export type Check = { label: string; ok: boolean; detail: string; optional?: boolean };

/** Production setup at a glance: the things that are easy to forget. */
export async function setupChecks(heartbeatAt: string | null): Promise<Check[]> {
  const auth = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  })
    .then((r) => (r.ok ? (r.json() as Promise<{ external?: Record<string, boolean>; disable_signup?: boolean }>) : null))
    .catch(() => null);
  const hoursSinceBeat = heartbeatAt ? (Date.now() - new Date(heartbeatAt).getTime()) / 3600_000 : Infinity;
  return [
    {
      label: "Google sign-in",
      ok: Boolean(auth?.external?.google),
      detail: auth ? (auth.external?.google ? "Enabled in Supabase." : "Not enabled yet. See README → Google sign-in.") : "Could not read the auth settings.",
    },
    {
      label: "Email sign-up off",
      ok: auth ? auth.external?.email === false || auth.disable_signup === true : false,
      detail: "Accounts should come only from Google.",
    },
    {
      label: "Keep-awake job",
      ok: hoursSinceBeat < 26,
      detail: heartbeatAt ? `Last run ${when(heartbeatAt)}.` : "Never ran.",
    },
    { label: "Cron secret", ok: Boolean(process.env.CRON_SECRET), detail: "Needed by the daily keep-awake job." },
    mockAllowed()
      ? {
          label: "Mock providers: on (development only)",
          ok: false,
          optional: true,
          detail: "Test-only providers and test sign-in show here. They are always off in production.",
        }
      : { label: "Mock providers: off", ok: true, detail: "Test-only providers and test sign-in are hidden." },
    {
      label: "Contact email",
      ok: Boolean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
      detail: "Shown on the privacy page (NEXT_PUBLIC_CONTACT_EMAIL).",
      optional: true,
    },
  ];
}

export { GLOBAL_PER_DAY };
