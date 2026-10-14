"use client";
// "Mon histoire": the learner's story retold in simple French.

import type { StoryLine } from "@/lib/content/schema";
import { Rich } from "../ui";
import { useStudy } from "./context";
import { LineItem } from "./LineItem";
import { PlayList } from "./Play";
import { followAlong, revealLast } from "./SectionView";

export function StoryView({ lines, genderNote, onSave, intro }: { lines: StoryLine[]; genderNote?: string | null; onSave: (lines: StoryLine[]) => void; intro?: string }) {
  const { scope, mode } = useStudy();
  const ids = lines.map((l) => l.id);
  return (
    <section className="topic-section story" id={scope === "page" ? "story" : undefined} aria-labelledby={`${scope}-h-story`}>
      <header className="section-head">
        <span className="num star-num" aria-hidden="true">
          ★
        </span>
        <div>
          <h2 lang="fr" id={`${scope}-h-story`}>
            Mon histoire
          </h2>
          <p className="sub">{intro ?? "My story, retold in simple French"}</p>
        </div>
      </header>
      <div className="section-play">
        <PlayList
          id={`${scope}:story`}
          className="btn btn-primary"
          lines={lines.map((l) => l.fr)}
          onLine={followAlong(scope, ids, mode)}
          options={{ title: "Mon histoire", onDone: revealLast(scope, ids, mode) }}
        >
          Play my story
        </PlayList>
      </div>
      {genderNote && (
        <p className="note gender-note">
          <Rich text={genderNote} />
        </p>
      )}
      <ol className="list">
        {lines.map((l) => (
          <LineItem
            key={l.id}
            line={l}
            variant="story"
            onChange={(next) => onSave(next ? lines.map((x) => (x.id === l.id ? next : x)) : lines.filter((x) => x.id !== l.id))}
          />
        ))}
      </ol>
    </section>
  );
}
