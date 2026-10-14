# Everyday French — final v1 plan

Written 2026-10-13 after five reviews (education, security, product/UX, platform, AI integration).
This file records **what v1 is and why**. AGENTS.md explains how the code is organised.

## Product in one paragraph

A free, public web app. A learner signs in with Google, tells the app what just happened to them (typed, dictated, or recorded), and an AI model of their choice (their own API key) turns it into a French **topic**: core words, extra words, set phrases, example sentences, tips about France, and "My story" (their story retold in simple French). Every line can be played aloud: device voice for free, or natural ElevenLabs / OpenAI recordings that are made once on request and kept forever. Each user sees only their own topics. No scores or progress tracking.

## Decisions (with the review that drove each)

### Onboarding and flows (UX)
- After the first sign-in the user lands on the example topic "Au café" (device voice works), with a banner "Make your own →". No setup wizard.
- Level and "How should French refer to you" (il / elle / not set) are asked inline on the first "Make your own".
- The AI key is asked **lazily**, at the first Generate, with the story already typed. One recommended provider card (Anthropic, Claude Haiku 5.5) with a 5-step guide and a cost line; other providers under "Other providers"; custom OpenAI-compatible endpoint under "Advanced".
- Create = two taps: "What happened?" → Generate. "Ask me questions first" is a secondary button. "Save for later" stores a **capture** (text and/or raw voice memo) without any AI call, even before a key exists. Home shows unprocessed captures.
- Generation runs **on the server in the background** (`after()`, maxDuration 300 s) and writes each stage to the database. The topic page polls and shows sections as they arrive. Leaving the page or locking the phone does not stop it. Failed or stale sections show Retry; a stuck topic shows "Finish".
- Costs shown in plain money where reliable (LLM from the curated price table, OpenAI TTS by minutes), and ElevenLabs as characters + "N left this month" from the subscription endpoint. Always labelled "estimate".

### Content (education + AI)
- Per section: 4–6 **core** words (starred, shown first), some **extra** words, 2–3 **phrases** (chunks), 2–4 sentences, 1 tip (A1) / up to 2 (A2+).
- Totals: A1 18–28 words, A2 25–40, B1+ 30–45. Sentences 4–8 words at A1, 5–10 at A2.
- Every word has a short example sentence. Nouns: article + noun, gender, irregular plural. Verbs: infinitive, `je` and `vous` present, passé composé with auxiliary. Adjectives: masculine and feminine forms.
- Learner gender drives participle agreement in "je" sentences and My story; one note per topic gives the other form. Not set = masculine + one tip.
- Optional short Chinese gloss for words and phrases (setting). Explanations in English (Chinese explanation mode is a setting, English default).
- Coverage rule: every core word appears in an example and in My story.
- Generation stages (one background job): **outline** (sections + pre-assigned core word candidates per section, so sections never duplicate) → **sections** in parallel (each sees the words other sections own) → **My story** (built from core words and phrases) → **check** (deterministic rules + one LLM review pass returning per-line problems and a suggested fix). Flagged lines show a marker with "Use suggestion". Each topic shows "AI-generated · may contain mistakes · model X".
- System prompt is byte-stable (level and language at the end) so provider prompt caching works.

### Study (education + UX)
- Modes: Show all · Hide French · Hide English · **Listen first** (tap plays, second tap reveals). "Reveal all" in quiz modes.
- **Repeat** toggle: each line plays 3× with a pause (shadowing).
- Speeds: Normal 1.0 · Slow 0.8 · Slower 0.6 (Safari clamps below ~0.5). One recording covers every speed.
- **Review**: 20 random lines from the whole library, one card at a time, no score.
- Search across all topics, accent-insensitive (Postgres `unaccent` + `pg_trgm`).
- Device-voice playback is labelled "device voice" so the learner knows which one to imitate.
- Silent Web Audio stream keeps the output open between clips (USB speaker crackle fix).

### Providers (AI)
- Text: Anthropic, OpenAI, Google, Mistral, DeepSeek, Groq, xAI (dedicated `@ai-sdk/*` packages), OpenRouter and Custom (`@ai-sdk/openai-compatible`). Structured output via `generateText({ output: Output.object() })`; on `NoObjectGeneratedError`, one re-ask with the validation error. `maxRetries: 1`, explicit timeouts, no global temperature, low reasoning effort.
- Speech: ElevenLabs (default `eleven_flash_v2_5` with `language_code: "fr"`; `eleven_v4` as "best quality", brackets stripped) and OpenAI (`gpt-4o-mini-tts`, French-from-France instructions). Neighbouring lines sent as `previous_text` / `next_text`. Concurrency sized from the ElevenLabs tier.
- Transcription: OpenAI (`gpt-4o-transcribe`), ElevenLabs (`scribe_v2`, best for mixed Chinese/English/French), Groq (`whisper-large-v3-turbo`, cheapest). Recording at ~32 kbps, max 3 minutes, max 4 MB upload.
- Key tests use free endpoints (`/models`, OpenRouter `/key`, ElevenLabs `/user/subscription`).
- Curated model list (with prices and "recommended / may make French mistakes" labels) lives in one file, merged with the live model list.
- A mock provider exists for tests only; it is disabled whenever `VERCEL_ENV=production`.

### Security
- `api_keys` and `usage_events` have **no grants** for `anon` / `authenticated`; only server code (secret key) touches them. The masked list comes from `/api/keys`.
- AES-256-GCM in the app; per-row key via HKDF(master, user_id‖key_id); AAD = user_id‖provider‖key_id‖version; `KEY_ENCRYPTION_SECRET_V1` style env names for rotation. Only `src/lib/keys/` reads the secret.
- Custom base URLs: https, port 443, no credentials in the URL, DNS resolved once and the connection **pinned** to the checked IP (undici `Agent` lookup), redirects rejected, private / loopback / link-local / CGNAT / ULA / IPv4-mapped ranges blocked.
- Every `/api/*` handler: `getClaims()` auth, same-origin check (`Sec-Fetch-Site` / `Origin`), JSON or multipart content type, zod input, per-user rate limit and global daily cap.
- Provider errors map to fixed app messages + status code. One logger scrubs key-like strings.
- Cron endpoints: timing-safe `Bearer CRON_SECRET`, 404 when unset.
- Storage: buckets `clips` and `captures` private; users may only SELECT objects in their own folder; uploads happen on the server. Bucket MIME and size limits.
- CSP with per-request nonce, HSTS, nosniff, `Referrer-Policy: strict-origin-when-cross-origin`, `frame-ancestors 'none'`.
- Account deletion: storage objects first, then the auth user (rows cascade). Export first is offered.
- Privacy page states plainly how keys are stored and who can decrypt them, and advises dedicated keys with spending limits.

### Platform
- Next.js 16.4 (`proxy.ts` refreshes the session), Vercel Hobby, Supabase Free, personal GitHub repo.
- Sections live in their own table (`topic_sections`), so parallel writes never collide and search can index them.
- Clips: immutable, `cacheControl` 1 year, signed URLs valid 7 days and **stored and reused** until a day before expiry, so URLs stay stable and the Supabase CDN can cache them.
- Keepalive: daily Vercel cron (read + write through the API) plus a `pg_cron` job inside the database. The cron also prunes `usage_events` older than 90 days. A paused free project needs a manual restore; the app shows a clear "database unavailable" page.
- Migrations in `supabase/migrations`, applied with `supabase db push`.

## Out of v1
Spaced repetition and scores, public sharing, languages other than French, native apps, payments, offline mode, cross-user clip sharing, voice previews made with the owner's key, Sentry.
