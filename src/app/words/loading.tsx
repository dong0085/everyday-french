// Shown while the word bank loads.
export default function Loading() {
  return (
    <main className="page words-page" aria-busy="true">
      <span className="visually-hidden" role="status">
        Loading your words…
      </span>
      <div className="skeleton title sk-w40" />
      <div className="skeleton line sk-w30 mt-2" />
      <div className="skeleton words-search-sk mt-4" />
      <div className="chips mt-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton sk-chip" />
        ))}
      </div>
      <ul className="word-list mt-4">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <li key={i} className="word-row">
            <div className="skeleton sk-round" />
            <div className="stack-sm grow">
              <div className="skeleton line sk-w50" />
              <div className="skeleton line sk-w70" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
