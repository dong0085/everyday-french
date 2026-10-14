export default function Loading() {
  return (
    <main className="page new-page" aria-busy="true">
      <p className="visually-hidden" role="status">
        Loading…
      </p>
      <div className="stack-sm">
        <div className="skeleton title" />
        <div className="skeleton line w-80" />
      </div>
      <div className="skeleton textarea-skel mt-4" />
      <div className="skeleton mt-4" />
      <div className="skeleton mt-4" />
    </main>
  );
}
