<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Everyday French — guide for coding agents

A public, free web app. People sign in with Google, bring their own AI keys, and turn things that happened to them into French study topics with audio. `docs/PLAN.md` records what v1 is and why (five expert reviews shaped it); read it before changing behaviour.

The owner is an A1–A2 learner of France French, native Chinese, reads English. Talk to them in simple language.

## Stack

- Next.js 16.4 App Router, TypeScript, React 19 (React Compiler lint rules are on: no synchronous `setState` in effects, no `Date.now()` in render).
- Supabase: Google auth, Postgres with RLS, Storage. `@supabase/ssr` with the new `sb_publishable_` / `sb_secret_` keys.
- Vercel AI SDK v7 (`generateText` + `Output.object`, `instructions` instead of `system`). TTS and STT use provider REST APIs directly.
- zod v4 for every input and every AI output. Plain global CSS (`src/app/globals.css`), no UI library.
- Hosting: Vercel Hobby + Supabase Free.

## Map

```
src/proxy.ts                  Session refresh (getClaims) + CSP nonce + security headers on every request
src/app/                      Pages: / (landing or home), /new, /topics/[id], /review, /settings, /privacy, /admin
src/app/api/**/route.ts       JSON API. Every handler is wrapped in api() from src/lib/http.ts
src/app/auth/*                Google sign-in, callback (seeds the example topic), sign-out, dev sign-in (tests only)
src/lib/http.ts               api(): auth, same-origin check, content type, safe errors
src/lib/supabase/             server.ts (as the user, RLS) · admin.ts (secret key, bypasses RLS) · proxy.ts
src/lib/keys/                 crypto.ts (AES-256-GCM, HKDF per row, AAD) · store.ts (the ONLY code that decrypts keys)
src/lib/providers/            catalog.ts (providers, curated models, prices, guides) · llm.ts · speech.ts (TTS/STT)
                              models.ts (key tests, model lists) · safe-fetch.ts (SSRF guard) · errors.ts · mock.ts
src/lib/content/              schema.ts (stored + AI shapes) · prompt.ts (all prompts) · pipeline.ts (generation job)
                              checks.ts (rule checks) · example.ts (example topic) · french.ts (typography, search folding)
src/lib/audio/                cache-key.ts · clips.ts (lookup + stable signed URLs) · upload.ts
src/lib/usage.ts              Rate limits, daily caps, monthly usage
src/lib/admin.ts              Admin check (ADMIN_EMAILS), admin numbers (admin_overview / admin_users SQL functions), setup checks
src/lib/account.ts            Account deletion (storage first, then the auth user)
src/components/               Client UI. player.ts = the single audio player + stored preferences
supabase/migrations/          Schema, RLS, buckets, pg_cron. Apply locally with `supabase db reset`
tests/unit · tests/e2e · tests/db
```

## How generation works

`POST /api/topics` inserts a topic (status `generating`, stage `outline`) and starts `runGeneration` in `after()`. The job runs outline → sections (3 in parallel, each knows the core words other sections own) → My story → review, saving after every stage. The topic page polls `GET /api/topics/[id]`. A failed or stale job continues from its stage via `POST /api/topics/[id]/generate`. Sections live in `topic_sections` rows so parallel writes never collide.

## Rules that keep it safe

- Every API route uses `api()` from `src/lib/http.ts`. Never take a user id from the request; use the one `api()` passes in.
- `adminClient()` bypasses RLS: every query with it filters by `user_id`. Prefer `createClient()` (as the user) whenever RLS allows the operation.
- Only `src/lib/keys/store.ts` decrypts keys. Keys never go to the browser, logs, or error messages. Log only through `logError()`.
- Provider errors become `AppError` codes (`toAppError`). Never return a provider's response body.
- The custom provider's base URL goes through `checkBaseUrl` + `pinnedFetch`. Built-in providers use fixed hosts.
- AI output is rendered as React text only (`<Rich>` handles `*italic*`). Never use `dangerouslySetInnerHTML`.
- The mock provider and `/auth/dev` work only when `ALLOW_MOCK_PROVIDERS=1` and `VERCEL_ENV` is not `production`.
- `api_keys`, `usage_events`, `heartbeat` have no grants for browser roles. New user tables need RLS policies in a new migration.
- The admin panel (`/admin`, `/api/admin/*`) is for emails in `ADMIN_EMAILS`; everyone else gets a 404. Admin pages and routes call `getAdmin()` / `requireAdmin()` first. The panel shows account metadata and counts only; topic content, stories, notes and recordings stay private (the privacy page promises this). The `admin_*` SQL functions are executable by `service_role` only.

## Content rules

The rules for the French (level targets, gender, elision, register, chunks, examples) live in `INSTRUCTIONS` in `src/lib/content/prompt.ts`. Keep that string byte-stable (prompt caching); put per-call details in the stage prompts. Change prompts carefully and test with a real model on the owner's key only with their permission.

## Adding a provider

1. Add it to `PROVIDERS` in `catalog.ts` (uses, key URL, guide, curated models with prices if known).
2. Text: add a case in `languageModel()` (`llm.ts`) and a models endpoint in `models.ts`. OpenAI-compatible services can reuse `createOpenAICompatible`.
3. Speech / transcription: add a branch in `synthesize()` / `transcribe()` in `speech.ts`.
4. Add a key test in `testKey()`.

## Local development

```sh
supabase start                 # Docker (OrbStack) must be running
cp .env.example .env.local     # fill in from `supabase status`, generate the secrets
pnpm dev                       # http://localhost:3000 — "Test sign-in" button appears with ALLOW_MOCK_PROVIDERS=1
```

After changing the schema: add a migration, `supabase db reset`, `pnpm db:types`.

## Checks before finishing

```sh
pnpm typecheck && pnpm lint && pnpm test   # types, lint, unit tests
pnpm test:db                               # browser roles cannot read server-only tables
pnpm test:e2e                              # builds, then runs the full journey + security tests with mock providers
```

## Deploying

Pushing to `main` deploys to Vercel. Schema changes: `supabase db push` (linked project) before the code that needs them. See README for environment variables and the Google sign-in setup.
