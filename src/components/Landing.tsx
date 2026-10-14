// The signed-out home page: what the app does, a small topic you can play, what it costs.
import { Icon, type IconName } from "./Icon";
import { Fr, PlayButton } from "./ui";

const PREVIEW: { fr: string; en: string; g?: "m" | "f" }[] = [
  { fr: "une pastille", en: "a throat lozenge", g: "f" },
  { fr: "J'ai mal à la gorge.", en: "My throat hurts." },
  { fr: "Vous avez de la fièvre ?", en: "Do you have a fever?" },
];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "pen", title: "Tell", text: "Type, dictate or record what happened, in any language." },
  { icon: "book", title: "Learn", text: "Get the words, phrases and sentences you needed, and your story in simple French." },
  { icon: "headphones", title: "Listen and review", text: "Play every line slowly or at normal speed. Short reviews bring the words back." },
];

const ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled. You can try again whenever you like.",
  signin: "Google sign-in didn't finish. Please try again. If you use a private window, try a normal one, or another Google account.",
};

export function Landing({ error, devLogin }: { error: string | null; devLogin: boolean }) {
  const message = error ? (ERRORS[error] ?? ERRORS.signin) : null;
  return (
    <main className="page landing">
      <section className="hero">
        <p className="eyebrow m-0">Everyday French</p>
        <h1>
          <span lang="fr">Mon français de tous les jours</span>
          <span className="h-en">My everyday French</span>
        </h1>
        <p className="lead">
          Tell it what happened today — in Chinese, English or French. Get the French words, phrases and audio for <em>your</em> day.
        </p>
        {message && (
          <div className="error-box" role="alert">
            <p>{message}</p>
          </div>
        )}
        <SignIn />
        {devLogin && (
          <form action="/auth/dev" method="post" className="row">
            <input type="hidden" name="who" value="tester" />
            <button className="btn btn-small" type="submit" data-testid="dev-login">
              Test sign-in (development only)
            </button>
          </form>
        )}
      </section>

      <section className="preview" aria-labelledby="preview-title">
        <h2 id="preview-title" className="visually-hidden">
          An example topic
        </h2>
        <div className="preview-story">
          <span className="preview-label">Your story</span>
          <p>“I went to the pharmacy because I had a sore throat.”</p>
        </div>
        <div className="preview-arrow" aria-hidden="true">
          <Icon name="arrow-right" size={20} />
        </div>
        <div className="preview-topic card">
          <p className="preview-title" lang="fr">
            À la pharmacie
          </p>
          <p className="preview-sub">At the pharmacy</p>
          <ul className="preview-lines">
            {PREVIEW.map((l) => (
              <li key={l.fr}>
                <PlayButton text={l.fr} small label={l.fr} />
                <span className="grow">
                  <span className="fr" lang="fr">
                    <Fr text={l.fr} />
                  </span>
                  {l.g && <span className={`g g-${l.g}`}>{l.g === "f" ? "f." : "m."}</span>}
                  <span className="en">{l.en}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="hint m-0">
            Tap <Icon name="speaker" size={14} className="inline-icon" /> to hear it.
          </p>
        </div>
      </section>

      <section className="steps" aria-label="How it works">
        {STEPS.map((s, i) => (
          <div className="step-card" key={s.title}>
            <span className="step-icon" aria-hidden="true">
              <Icon name={s.icon} size={22} />
            </span>
            <div>
              <strong>
                {i + 1}. {s.title}
              </strong>
              <p>{s.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="card cost">
        <h2>What does it cost?</h2>
        <p>
          The app is free. Topics are written by an AI using your own key. Google&apos;s free tier costs nothing; paid providers are about $0.01–0.06
          per topic. You can set a spending limit with the provider.
        </p>
      </section>

      <section className="hero-end">
        <h2>Try it with something that happened today</h2>
        <SignIn />
        <p className="hint m-0">Made by a French learner, for French learners.</p>
      </section>
    </main>
  );
}

function SignIn() {
  return (
    <div className="signin">
      <form action="/auth/signin" method="post">
        <input type="hidden" name="next" value="/" />
        <button className="btn btn-google" type="submit">
          <GoogleIcon /> Continue with Google
        </button>
      </form>
      <p className="hint m-0">Free · you&apos;ll connect a free Google AI key (about 2 minutes)</p>
    </div>
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
