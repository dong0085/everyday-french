"use client";
// "Next time, say…": lines for the next time this happens, and "I used it →" to make a follow-up topic.

import { useRouter } from "next/navigation";
import type { NextTimeLine } from "@/lib/content/schema";
import { saveDraft } from "@/lib/draft";
import { Fr, Zh } from "../ui";
import { Icon } from "../Icon";
import { usePlayerSelector } from "../player";
import { Play, PlayList } from "./Play";

export function NextTime({ lines }: { lines: NextTimeLine[] }) {
  const router = useRouter();
  return (
    <section className="next-time" id="next-time" aria-labelledby="h-next-time">
      <header className="section-head">
        <span className="num" aria-hidden="true">
          <Icon name="arrow-right" size={18} />
        </span>
        <div>
          <h2 id="h-next-time">Next time, say…</h2>
          <p className="sub">For the next time this happens. Say them out loud.</p>
        </div>
      </header>
      <div className="section-play">
        <PlayList id="next-time" lines={lines.map((l) => l.fr)} options={{ title: "Next time, say…", gaps: true }}>
          Say them after me
        </PlayList>
      </div>
      <ul className="list">
        {lines.map((l) => (
          <NextLine
            key={l.id}
            line={l}
            onUsed={() => {
              saveDraft(`I used « ${l.fr} » today when `);
              router.push("/new");
            }}
          />
        ))}
      </ul>
    </section>
  );
}

function NextLine({ line, onUsed }: { line: NextTimeLine; onUsed: () => void }) {
  const playing = usePlayerSelector((s) => s.playing === line.fr);
  return (
    <li className={`item next-line${playing ? " playing" : ""}`} data-row="" data-text={line.fr}>
      <Play text={line.fr} />
      <div className="body">
        <div className="fr" lang="fr">
          <Fr text={line.fr} />
        </div>
        <div className="en">{line.en}</div>
        <Zh text={line.zh} />
        <button type="button" className="linklike used-it" onClick={onUsed}>
          I used it →
        </button>
      </div>
    </li>
  );
}
