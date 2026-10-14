// Shown while the review deck loads.
export default function Loading() {
  return (
    <main className="page review-page" aria-busy="true">
      <span className="visually-hidden" role="status">
        Loading your review…
      </span>
      <div className="review-head">
        <div className="grow stack-sm">
          <div className="skeleton title sk-w40" />
          <div className="skeleton line sk-w50" />
        </div>
      </div>
      <div className="review-progress">
        <div className="progress grow" />
      </div>
      <div className="review-card card">
        <div className="skeleton line sk-w30" />
        <div className="rc-front">
          <div className="skeleton title sk-w80 sk-center" />
          <div className="skeleton line sk-w50 sk-center" />
        </div>
        <div className="skeleton sk-button" />
      </div>
    </main>
  );
}
