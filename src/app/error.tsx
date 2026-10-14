"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const db = /fetch failed|ECONNREFUSED|503|paused|PGRST|Failed to fetch/i.test(error.message);
  return (
    <main className="page">
      <h1>{db ? "The database is unavailable" : "Something went wrong"}</h1>
      <p className="sub">
        {db
          ? "The app could not reach its database. If this lasts more than a few minutes, the free database may have been paused and needs to be restored by the person who runs the app."
          : "Please try again. If it keeps happening, reload the page."}
      </p>
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={reset}>
        Try again
      </button>
    </main>
  );
}
