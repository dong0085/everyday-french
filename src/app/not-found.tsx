import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <main className="page state-page">
      <div className="state-icon" aria-hidden="true">
        <Icon name="search" size={28} />
      </div>
      <h1>
        <span lang="fr">Page introuvable</span>
        <span className="h-en">Not found</span>
      </h1>
      <p className="sub">This page doesn&apos;t exist, or it belongs to another account.</p>
      <div className="row mt-4">
        <Link href="/" className="btn btn-primary">
          Go to my topics
        </Link>
      </div>
    </main>
  );
}
