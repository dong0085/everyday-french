"use client";
// Replaces the root layout when it fails, so it brings its own <html>, <body> and styles
// (globals.css does not load here). Follows the system light/dark setting.

const CSS = `
:root { color-scheme: light dark; --bg: #faf8f4; --text: #1f1d1a; --muted: #625d55; --accent: #2b4fa8; --accent-text: #fff; --line: #e4dfd5; }
@media (prefers-color-scheme: dark) { :root { --bg: #161514; --text: #ece8e1; --muted: #a8a197; --accent: #8fb0ff; --accent-text: #10182b; --line: #36332f; } }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, "PingFang SC", sans-serif; }
main { max-width: 560px; margin: 0 auto; padding: 64px 16px; }
h1 { font-family: Georgia, serif; font-size: 2rem; line-height: 1.2; margin: 0 0 8px; }
p { color: var(--muted); margin: 0 0 16px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 16px; border-radius: 10px; border: 1px solid var(--line); background: transparent; color: var(--text); font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }
.btn-primary { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
small { color: var(--muted); }
`;

export default function GlobalError({ error, retry, reset }: { error: Error & { digest?: string }; retry?: () => void; reset: () => void }) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong · Everyday French</title>
        <style>{CSS}</style>
      </head>
      <body>
        <main>
          <h1>Something went wrong</h1>
          <p>Please try again in a moment. Nothing you made is lost.</p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => (retry ?? reset)()}>
              Try again
            </button>
            {/* A full page load, since the app shell itself failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="btn" href="/">
              Go to my topics
            </a>
          </div>
          {error.digest && <small>Error code: {error.digest}</small>}
        </main>
      </body>
    </html>
  );
}
