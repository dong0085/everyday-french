import Link from "next/link";
import { getUserId } from "@/lib/supabase/server";
import { listCaptures, listTopics } from "@/lib/data";
import { mockAllowed } from "@/lib/providers/mock";
import { HomeSearch } from "@/components/HomeSearch";
import { CaptureList } from "@/components/CaptureList";

export default async function Home(props: PageProps<"/">) {
  const userId = await getUserId();
  const sp = await props.searchParams;
  if (!userId) return <Landing error={sp.error === "signin"} devLogin={mockAllowed()} />;

  const [topics, captures] = await Promise.all([listTopics(), listCaptures()]);
  const own = topics.filter((t) => !t.isExample);

  return (
    <main className="page">
      <header className="home-head">
        <h1 lang="fr">Mes sujets</h1>
        <p className="sub">My topics: French from things that happened to me.</p>
      </header>

      {own.length === 0 && (
        <div className="card stack" style={{ marginBottom: 20 }}>
          <h2>Make your first topic</h2>
          <p className="muted" style={{ margin: 0 }}>
            Describe something that just happened, in any language. A few sentences are enough. For example:
          </p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>“I bought a bus ticket and asked which stop to get off at.”</li>
            <li>“I went to the pharmacy because I had a sore throat.”</li>
            <li>“I looked at three used cars and bought the cheapest one.”</li>
          </ul>
          <div>
            <Link href="/new" className="btn btn-primary">
              What happened? →
            </Link>
          </div>
        </div>
      )}

      {captures.length > 0 && <CaptureList captures={captures.map((c) => ({ id: c.id, text: c.text, hasAudio: Boolean(c.audio_path), createdAt: c.created_at }))} />}

      {topics.length > 1 && <HomeSearch />}

      <ul className="topics" id="topic-list">
        {topics.map((t) => (
          <li key={t.id}>
            <Link className="topic-card" href={`/topics/${t.id}`}>
              <span className="t-fr" lang="fr">
                {t.titleFr || "Nouveau sujet"}
              </span>
              <span className="t-en">{t.title || "Being written…"}</span>
              <span className="t-meta">
                {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {" · "}
                {t.words} words
                {t.isExample && <span className="badge">Example</span>}
                {t.status === "generating" && <span className="badge badge-accent">Writing…</span>}
                {t.status === "failed" && <span className="badge badge-warn">Needs attention</span>}
                {t.status === "ready" &&
                  (t.recorded === 0 ? (
                    <span className="badge">No audio</span>
                  ) : t.recorded < t.lines ? (
                    <span className="badge">Partial audio</span>
                  ) : (
                    <span className="badge badge-ok">Audio ✓</span>
                  ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/new" className="btn btn-primary fab">
        + New topic
      </Link>
    </main>
  );
}

function Landing({ error, devLogin }: { error: boolean; devLogin: boolean }) {
  return (
    <main className="page">
      <section className="hero">
        <h1 lang="fr">Mon français de tous les jours</h1>
        <p className="lead">
          Tell the app what just happened to you — buying a used car, a visit to the doctor, ordering coffee. It turns your story into French
          words, sentences and audio you can study anywhere.
        </p>
        {error && (
          <div className="error-box">
            <p>Sign-in did not work. Please try again.</p>
          </div>
        )}
        <form action="/auth/signin" method="post">
          <input type="hidden" name="next" value="/" />
          <button className="btn btn-google" type="submit">
            <GoogleIcon /> Continue with Google
          </button>
        </form>
        {devLogin && (
          <form action="/auth/dev" method="post" className="row">
            <input type="hidden" name="who" value="tester" />
            <button className="btn btn-small" type="submit" data-testid="dev-login">
              Test sign-in (development only)
            </button>
          </form>
        )}
      </section>

      <section className="steps">
        <div className="card">
          <strong>1. Tell</strong>
          <p>Type, dictate or record what happened, in any language.</p>
        </div>
        <div className="card">
          <strong>2. Learn</strong>
          <p>Get the words, phrases and sentences you needed, plus your story retold in simple French.</p>
        </div>
        <div className="card">
          <strong>3. Listen</strong>
          <p>Play every line at normal or slow speed. Hide the French or the English to test yourself.</p>
        </div>
      </section>

      <p className="muted small">
        Free to use. Topics are made with your own AI account (Google Gemini has a free tier), so you stay in control of cost.{" "}
        <Link href="/privacy">Privacy</Link>
      </p>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
