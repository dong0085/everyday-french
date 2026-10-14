# Everyday French

Learn French from things that just happened to you. Tell the app what happened (type, dictate or record, in any language), and an AI model turns it into a **topic**: core words, phrases, example sentences, tips about France, and your story retold in simple French. Every line can be played aloud, at normal or slow speed.

- Free to use. Each person connects their own AI account (Google Gemini, Claude, OpenAI, Mistral, DeepSeek, OpenRouter, Groq, xAI, or any OpenAI-compatible service).
- Natural audio with ElevenLabs or OpenAI, made once per line and kept forever. Device voice works with no setup.
- Study modes: hide the French, hide the English, listen first, repeat ×3 for shadowing, a random review deck.
- Works on phones; can be added to the home screen.

## Using it

1. Sign in with Google. You land on an example topic.
2. Tap **Make your own**, describe what happened, tap **Make my topic**. The first time, the app asks you to connect an AI account (Google Gemini has a free tier).
3. The topic is written in the background (about a minute). You can leave the page.
4. On the topic, **Generate audio** records every line with your voice service. Settings → Voice to set one up.
5. Out and about? **Save for later** keeps a note or voice memo without any AI call.

## Running it locally

Needs Node 24, pnpm, Docker (OrbStack) and the Supabase CLI.

```sh
pnpm install
supabase start
cp .env.example .env.local     # fill in from `supabase status`; generate the two secrets as noted
pnpm dev
```

Open http://localhost:3000 and use **Test sign-in** (local only). The mock provider in "Other providers" lets you try everything without spending credits.

Tests: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm test:e2e`.

## Production setup

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

Sign in with an email listed in `ADMIN_EMAILS` and an **Admin** link appears in the header. `/admin` shows:

- Setup checks: Google sign-in enabled, email sign-up off, keep-awake job, cron secret, mock providers off, contact email.
- Users, topics, failure rate, lines flagged by the review pass, audio clips, saved notes, estimated AI spend (paid by users).
- Free plan room: database size (500 MB) and file storage (1 GB).
- Last 30 days charts, the app-wide daily safety limits, topic models with their failure rates, provider usage, recent failures.
- The user list: search, sort, block / unblock sign-in, delete an account (type the email to confirm).

It shows account details and counts only, never anyone's topics, stories, notes or recordings.

### Keeping the free database awake

Supabase pauses free projects after about a week without activity, and a paused project must be restored by hand in the dashboard. Two jobs prevent that: a daily Vercel cron (`/api/cron/keepalive`, see `vercel.json`) and a `pg_cron` job inside the database.

### If secrets leak

If `KEY_ENCRYPTION_SECRET_V1` and the database leak together, saved API keys can be decrypted: delete all rows in `api_keys`, rotate the secret (`KEY_ENCRYPTION_SECRET_V2`, `KEY_ENCRYPTION_VERSION=2`), and tell users to revoke their keys at each provider.
