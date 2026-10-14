"use client";
// "Saved for later" notes and voice memos on the home page.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, confirmDialog, toastError } from "./ui";
import { Icon } from "./Icon";
import { RelDate } from "./home/RelDate";

type Capture = { id: string; text: string; hasAudio: boolean; createdAt: string };

export function CaptureList({ captures }: { captures: Capture[] }) {
  const router = useRouter();
  const [gone, setGone] = useState<string[]>([]);
  const shown = captures.filter((c) => !gone.includes(c.id));
  if (!shown.length) return null;

  const remove = async (c: Capture) => {
    const ok = await confirmDialog({
      title: "Delete this saved note?",
      body: c.text ? `“${c.text.slice(0, 120)}${c.text.length > 120 ? "…" : ""}”` : "Your voice memo",
      consequences: c.hasAudio ? ["The note and its voice memo are deleted for good."] : ["The note is deleted for good."],
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setGone((g) => [...g, c.id]);
    try {
      await api(`/api/captures/${c.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setGone((g) => g.filter((x) => x !== c.id));
      toastError(e);
    }
  };

  return (
    <section className="captures" aria-labelledby="captures-h">
      <h3 id="captures-h" className="m-0">
        Saved for later · {shown.length}
      </h3>
      {shown.map((c) => (
        <div className="capture" key={c.id}>
          <div className="grow">
            <p className="capture-text">
              {c.text || (
                <>
                  <Icon name="mic" size={16} className="inline-icon" /> Voice memo
                </>
              )}
            </p>
            <p className="capture-meta">
              <RelDate iso={c.createdAt} />
              {c.hasAudio && c.text && (
                <>
                  {" · "}
                  <Icon name="mic" size={14} className="inline-icon" /> voice memo
                </>
              )}
            </p>
          </div>
          <Link className="btn btn-small" href={`/new?capture=${c.id}`}>
            Make topic
          </Link>
          <button type="button" className="icon-btn plain" aria-label="Delete this note" onClick={() => void remove(c)}>
            <Icon name="trash" size={18} />
          </button>
        </div>
      ))}
    </section>
  );
}
