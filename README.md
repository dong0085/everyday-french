# Everyday French

**Mon français de tous les jours.** Learn French from things that just happened to you.

Tell the app what happened today — typed, dictated or recorded, in 中文, English or French. An AI model of your choice turns it into a French **topic**: the words and phrases you needed, sentences you would say and hear, a short dialogue, tips about life in France, and your own story retold in simple French. Then the app helps you keep it: a guided first study, practice that makes you speak, and a calm review that brings each line back just before you forget it.

- **Free to use.** You connect your own AI account (Google Gemini has a free tier; Claude, OpenAI, Mistral, DeepSeek, OpenRouter, Groq, xAI or any OpenAI-compatible service also work). A topic costs about $0.01–0.06 on paid plans.
- **Made for beginners** (A1–B2), with extra help for Chinese speakers: IPA and pronunciation hints on the traps (liaison, silent letters, nasal vowels, *u* / *ou*), Chinese meanings if you want them, and notes about what your first language does differently.
- **Audio everywhere.** Every line plays with your device's voice for free, or with natural ElevenLabs / OpenAI recordings that are made once and kept.
- **Calm.** No streaks, points or scores. Works on phones and can be added to the home screen.

## What you can do

| | |
|---|---|
| **Make a topic** | Write a few sentences about what happened, or record a voice memo. Tap an idea to start. "Ask me questions first" adds details. "Save for later" keeps a note or memo without any AI call. Your draft is kept on the device if you leave. |
| **Study it** | Words grouped as key words, phrases (with patterns you can reuse) and more words, each with gender, IPA, meaning and an example. Sentences show who says them (*Moi* / *Eux*). **Study this topic** walks you through it in about 10 minutes: listen → words → say it → retell → your turn. |
| **Practise speaking** | **Repeat** plays each line normal → slow → normal with a pause sized for you to speak. **Record & compare** plays the model, then you (kept in memory only). **Role-play** the dialogue: the app says their lines, you say yours, then swap. |
| **Your turn** | Write one sentence of your own with the new words. The AI answers gently: what works, at most two fixes, and a more natural version. Your sentence joins the topic and your review. |
| **Next time, say…** | Three lines for the next time this happens. **I used it →** starts your next topic from there. |
| **Review** | Each day, the lines that are due (never more than 20): fill-the-gap on example sentences, listen first, build the sentence, *le or la?*. *Got it* / *Not yet* only decides when a line comes back (1, 3, 7, 14, 30 days). |
| **Words** | Every word from every topic: search (accents optional), filter by le / la / verbs / phrases / starred / shaky, star extra words to review them. |
| **French sounds** | A short guide to the sounds that are hard for Chinese speakers, with examples you can play. |

Study modes on every topic: show all, hide French, hide English, listen first; three speeds; keyboard shortcuts on a computer (press `?`).

## Getting started

1. Sign in with Google. You land on an example topic — tap ▶ next to any line.
2. Tap **+ New**, write what happened, tap **Make my topic**. The first time, the app asks you to connect an AI account (about 2 minutes; Google Gemini's free tier needs no card).
3. The topic is written in the background (about a minute). You can leave the page or lock your phone.
4. Tap **Study this topic**. Tomorrow, open **Review**.
5. Optional: Settings → AI services → **Natural voice** for recorded audio, **Voice memos** to turn recordings into text.

## Running it locally

Needs Node 24, pnpm, Docker (OrbStack) and the Supabase CLI.

```sh
pnpm install
supabase start
cp .env.example .env.local     # fill in from `supabase status`; generate the two secrets as noted
pnpm dev
```

Open http://localhost:3000 and use **Test sign-in** (local only). The mock provider ("Other providers" → "Mock (tests only)") makes complete topics — dialogue, IPA, feedback and all — without spending credits.

After a schema change: add a migration in `supabase/migrations`, run `supabase db reset` (or `supabase migration up`), then `pnpm db:types`.

Checks:

```sh
pnpm typecheck && pnpm lint && pnpm test   # types, lint, unit tests
pnpm test:db                               # browser roles cannot read server-only or other users' data
pnpm test:e2e                              # builds, then runs the full journey, admin and security tests
```

See `AGENTS.md` for how the code is organised and the safety rules, and `docs/PLAN.md` for what the app does and why.

## Production setup

### Deploying

Pushing to `main` deploys to Vercel. **Apply database migrations first** (`supabase db push` against the linked project), then push the code that needs them. v2 needs `20261015000000_learning.sql` (review items, practice sentences, dialogue, first language).

### Environment variables (Vercel → Production only)

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | The production URL, e.g. `https://everyday-french.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | Supabase secret key (mark Sensitive) |
| `KEY_ENCRYPTION_VERSION` | `1` |
| `KEY_ENCRYPTION_SECRET_V1` | `openssl rand -base64 32` (mark Sensitive; losing it makes saved keys unreadable) |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `NEXT_PUBLIC_DATA_REGION` | e.g. `the United States (us-east-1)` |
| `ADMIN_EMAILS` | Google email(s) that may open `/admin`, comma-separated |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional contact shown on the privacy page |

Never set `ALLOW_MOCK_PROVIDERS` in production.

### Google sign-in (one-time, by the owner)

1. Google Cloud Console → APIs & Services → **OAuth consent screen**: app name "Everyday French", user type External, scopes `openid`, `email`, `profile` only. Publish it ("In production"); basic scopes need no verification.
2. **Credentials → Create credentials → OAuth client ID** → Web application. Authorised redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
3. Supabase Dashboard → Authentication → Sign In / Providers → **Google**: paste the client ID and secret, enable.
4. Supabase → Authentication → URL Configuration: Site URL = production URL; Redirect URLs = `https://<production-domain>/**` and `http://localhost:3000/**`.

Google's sign-in screen shows `<ref>.supabase.co` unless a custom domain is added to Supabase (paid).

### Admin panel

Sign in with an email listed in `ADMIN_EMAILS`; **Settings → Account → Admin panel** opens `/admin`:

- Setup checks: Google sign-in enabled, email sign-up off, keep-awake job, cron secret, mock providers off, contact email.
- Users, topics, failure rate, lines flagged by the review pass, audio clips, saved notes, estimated AI spend (paid by users), with 30-day charts.
- Free plan room: database size (500 MB) and file storage (1 GB); the app-wide daily safety limits; models and providers in use; recent failures.
- The user list (a table on a computer, rows on a phone): search, sort, block / unblock sign-in, delete an account (type the email to confirm).

It shows account details and counts only, never anyone's topics, stories, practice sentences, notes or recordings.

### Keeping the free database awake

Supabase pauses free projects after about a week without activity, and a paused project must be restored by hand in the dashboard. Two jobs prevent that: a daily Vercel cron (`/api/cron/keepalive`, see `vercel.json`) and a `pg_cron` job inside the database. If the database still can't be reached, the app says "Everyday French is resting" instead of showing an empty library.

### If secrets leak

If `KEY_ENCRYPTION_SECRET_V1` and the database leak together, saved API keys can be decrypted: delete all rows in `api_keys`, rotate the secret (`KEY_ENCRYPTION_SECRET_V2`, `KEY_ENCRYPTION_VERSION=2`), and tell users to revoke their keys at each provider.
