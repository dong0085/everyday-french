// Shown at once while the home page loads (a tap never feels dead).
export default function Loading() {
  return (
    <main className="page home" aria-busy="true">
      <p className="visually-hidden" role="status">
        Loading…
      </p>
      <div className="home-head stack-sm">
        <div className="skeleton title" />
        <div className="skeleton line w-60" />
      </div>
      <div className="skeleton tall" />
      <div className="stack mt-6">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </main>
  );
}
