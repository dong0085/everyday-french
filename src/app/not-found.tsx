import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <h1>Not found</h1>
      <p className="sub">This page does not exist, or it belongs to another account.</p>
      <Link href="/" className="btn" style={{ marginTop: 16 }}>
        Go to my topics
      </Link>
    </main>
  );
}
