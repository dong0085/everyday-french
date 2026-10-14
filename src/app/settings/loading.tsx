export default function Loading() {
  return (
    <main className="page settings" aria-busy="true">
      <span className="visually-hidden" role="status">
        Loading settings…
      </span>
      <div className="skeleton title" />
      <div className="stack mt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="stack-sm">
            <div className="skeleton line settings-skel-title" />
            <div className="skeleton settings-skel-card" />
          </div>
        ))}
      </div>
    </main>
  );
}
