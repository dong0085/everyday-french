"use client";
// "Le dialogue": the key exchange as Eux / Moi bubbles, with Play all and Role-play.
// Role-play: the app says the other person's lines; on the learner's lines it leaves a gap with the
// line hidden, then shows and plays it. The second pass swaps roles.

import { useState } from "react";
import type { DialogueLine, Who } from "@/lib/content/schema";
import { Icon } from "../Icon";
import { playSequence, skipGap, stop, usePlayerSelector } from "../player";
import { useStudy } from "./context";
import { LineItem } from "./LineItem";
import { PlayList } from "./Play";
import { followAlong } from "./SectionView";

type Role = { pass: 1 | 2; hidden: ReadonlySet<string>; turn: string | null; done: boolean };
const ROLEPLAY = "roleplay";

export function DialogueView({ lines, onSave }: { lines: DialogueLine[]; onSave: (lines: DialogueLine[]) => void }) {
  const { scope, mode, editing } = useStudy();
  const [role, setRole] = useState<Role | null>(null);
  const rolePlaying = usePlayerSelector((s) => s.list === ROLEPLAY);
  const ids = lines.map((l) => l.id);
  const whoOf = (l: DialogueLine): Who => l.who ?? "them";

  const start = (pass: 1 | 2) => {
    const learner: Who = pass === 1 ? "me" : "them";
    const hidden = new Set(lines.filter((l) => whoOf(l) === learner).map((l) => l.id));
    setRole({ pass, hidden, turn: null, done: false });
    void playSequence(
      lines.map((l) => ({ text: l.fr, speak: hidden.has(l.id) })),
      {
        id: ROLEPLAY,
        title: "Le dialogue",
        onStep: (i, phase) => {
          const id = lines[i].id;
          setRole((r) => {
            if (!r) return r;
            if (phase === "turn") return { ...r, turn: id };
            const h = new Set(r.hidden);
            h.delete(id);
            return { ...r, hidden: h, turn: null };
          });
          document.querySelector(`[data-key="${CSS.escape(`${scope}:${id}`)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
        },
        onDone: () => setRole((r) => r && { ...r, done: true, turn: null }),
      },
    );
  };
  const exit = () => {
    stop();
    setRole(null);
  };

  // Stopped from somewhere else (the study bar, another play button): the role-play is over.
  const active = role && (rolePlaying || role.done) ? role : null;

  return (
    <section className="topic-section dialogue" id={scope === "page" ? "dialogue" : undefined} aria-labelledby={`${scope}-h-dialogue`}>
      <header className="section-head">
        <span className="num" aria-hidden="true">
          <Icon name="chat" size={18} />
        </span>
        <div>
          <h2 lang="fr" id={`${scope}-h-dialogue`}>
            Le dialogue
          </h2>
          <p className="sub">The conversation: what they say (Eux) and what you say (Moi)</p>
        </div>
      </header>

      {!editing && (
        <div className="section-play">
          <PlayList id={`${scope}:dialogue`} lines={lines.map((l) => l.fr)} onLine={followAlong(scope, ids, mode)} options={{ title: "Le dialogue" }}>
            Play all
          </PlayList>
          {active && !active.done ? (
            <button type="button" className="btn btn-small is-playing" onClick={exit}>
              <Icon name="stop" size={18} /> Stop role-play
            </button>
          ) : (
            <button type="button" className="btn btn-small btn-primary" onClick={() => start(1)}>
              <Icon name="mic" size={18} /> Role-play
            </button>
          )}
        </div>
      )}

      {active && (
        <div className="callout roleplay-callout" role="status">
          {active.done ? (
            active.pass === 1 ? (
              <>
                <p>Bien joué ! Now swap: you say their lines.</p>
                <div className="row">
                  <button type="button" className="btn btn-small btn-primary" onClick={() => start(2)}>
                    Swap roles
                  </button>
                  <button type="button" className="btn btn-small btn-ghost" onClick={exit}>
                    Finish
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>Bien joué ! You played both sides.</p>
                <button type="button" className="btn btn-small btn-ghost" onClick={exit}>
                  Finish
                </button>
              </>
            )
          ) : (
            <p>
              You are <strong lang="fr">{active.pass === 1 ? "Moi" : "Eux"}</strong>. When your line comes, say it in French — or tap it to hear it.
            </p>
          )}
        </div>
      )}

      <ol className="list bubbles">
        {lines.map((l) => (
          <LineItem
            key={l.id}
            line={{ ...l, who: whoOf(l) }}
            variant="bubble"
            editWho
            forceHidden={Boolean(active && !active.done && active.hidden.has(l.id))}
            turn={active?.turn === l.id}
            onHiddenTap={() => (active?.turn === l.id ? skipGap() : undefined)}
            onChange={(next) => onSave(next ? lines.map((x) => (x.id === l.id ? next : x)) : lines.filter((x) => x.id !== l.id))}
          />
        ))}
      </ol>
    </section>
  );
}
