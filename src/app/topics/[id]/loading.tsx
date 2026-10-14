// Shown while a topic page loads: the shape of the page, calm and still.
export default function Loading() {
  return (
    <main className="page topic-page" aria-busy="true" aria-label="Loading the topic">
      <div className="skeleton line skel-back" />
      <div className="stack mt-4">
        <div className="skeleton title" />
        <div className="skeleton line skel-45" />
        <div className="skeleton line skel-70" />
      </div>
      <div className="skeleton skel-cta mt-6" />
      <div className="stack mt-6">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </main>
  );
}
