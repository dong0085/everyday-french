"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, Fr, PlayButton } from "./ui";

type Hit = { topicId: string; topicTitleFr: string; sectionSlug: string; sectionTitleFr: string; fr: string; en: string };

export function HomeSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const active = q.trim().length >= 2;
  useEffect(() => {
    clearTimeout(timer.current);
    const list = document.getElementById("topic-list");
    if (!active) {
      if (list) list.hidden = false;
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const r = await api<{ hits: Hit[] }>(`/api/search?q=${encodeURIComponent(q.trim())}`);
        setHits(r.hits);
        if (list) list.hidden = true;
      } catch {
        setHits([]);
      }
    }, 250);
  }, [q, active]);

  return (
    <div className="search-wrap">
      <label className="visually-hidden" htmlFor="q">
        Search every topic
      </label>
      <input id="q" type="search" placeholder="Search every topic (French or English)…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      {active && hits && (
        <div style={{ marginTop: 12 }}>
          {hits.length === 0 ? (
            <p className="empty">Nothing found for “{q}”.</p>
          ) : (
            <ul className="list">
              {hits.map((h, i) => (
                <li className="item" key={i}>
                  <PlayButton text={h.fr} />
                  <div className="body">
                    <div className="fr" lang="fr">
                      <Fr text={h.fr} />
                    </div>
                    <div className="en">{h.en}</div>
                    <div className="meta">
                      <Link href={`/topics/${h.topicId}#${h.sectionSlug}`}>
                        <Fr text={`${h.topicTitleFr} → ${h.sectionTitleFr}`} />
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
