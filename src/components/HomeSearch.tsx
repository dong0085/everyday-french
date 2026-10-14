"use client";
// The home library with search: while a search is active its results replace the list below it.

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, Fr, PlayButton, Spinner } from "./ui";
import { Icon } from "./Icon";

type Hit = { topicId: string; topicTitleFr: string; sectionSlug: string; sectionTitleFr: string; fr: string; en: string };
type Result = { q: string; hits: Hit[] } | { q: string; error: string };

export function HomeLibrary({ searchable, children }: { searchable: boolean; children: ReactNode }) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const query = q.trim();
  const active = searchable && query.length >= 2;

  useEffect(() => {
    clearTimeout(timer.current);
    if (!active) return;
    timer.current = setTimeout(async () => {
      try {
        const r = await api<{ hits: Hit[] }>(`/api/search?q=${encodeURIComponent(query)}`);
        setResult({ q: query, hits: r.hits });
      } catch (e) {
        setResult({ q: query, error: (e as Error).message });
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [query, active]);

  const loading = active && result?.q !== query;

  return (
    <>
      {searchable && (
        <div className="search-wrap" role="search">
          <label className="visually-hidden" htmlFor="q">
            Search every topic
          </label>
          <span className="search-icon" aria-hidden="true">
            {loading ? <Spinner /> : <Icon name="search" size={18} />}
          </span>
          <input
            id="q"
            type="search"
            placeholder="Search every topic (French or English)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQ("")}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      )}
      {active ? <SearchResults q={query} result={result} /> : children}
    </>
  );
}

function SearchResults({ q, result }: { q: string; result: Result | null }) {
  if (!result) return <p className="empty" aria-live="polite">Searching…</p>;
  if ("error" in result)
    return (
      <div className="error-box" role="alert">
        <p>Search didn&apos;t work. {result.error}</p>
      </div>
    );
  if (result.hits.length === 0)
    return (
      <p className="empty" aria-live="polite">
        Nothing found for “{q}”. Try fewer letters, or the English word.
      </p>
    );
  return (
    <section aria-label="Search results">
      <p className="hint" aria-live="polite">
        {result.hits.length} {result.hits.length === 1 ? "line" : "lines"} found
      </p>
      <ul className="list">
        {result.hits.map((h, i) => (
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
    </section>
  );
}
