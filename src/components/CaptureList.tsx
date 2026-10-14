"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, toast } from "./ui";

type Capture = { id: string; text: string; hasAudio: boolean; createdAt: string };

export function CaptureList({ captures }: { captures: Capture[] }) {
  const router = useRouter();
  return (
    <section className="captures" aria-label="Saved for later">
      <h3 style={{ margin: 0 }}>Saved for later ({captures.length})</h3>
      {captures.map((c) => (
        <div className="capture" key={c.id}>
          <p>
            {c.text || <span className="muted">Voice memo</span>}
            {c.hasAudio && c.text && <span className="muted"> · voice memo</span>}
          </p>
          <Link className="btn btn-small btn-primary" href={`/new?capture=${c.id}`}>
            Make topic
          </Link>
          <button
            type="button"
            className="btn btn-small btn-ghost"
            aria-label="Delete this note"
            onClick={async () => {
              if (!confirm("Delete this saved note?")) return;
              try {
                await api(`/api/captures/${c.id}`, { method: "DELETE" });
                router.refresh();
              } catch (e) {
                toast((e as Error).message);
              }
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </section>
  );
}
