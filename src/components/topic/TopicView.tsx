"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FullSection, FullTopic } from "@/lib/data";
import type { SectionData, StoryLine } from "@/lib/content/schema";
import { playAll, setMode as storeMode, setRepeat, setSpeed, stop, usePlayer, type Mode, type Speed } from "../player";
import { api, Fr, Rich, Spinner, toast } from "../ui";
import { AudioBar } from "./AudioBar";
import { SectionView } from "./SectionView";
import { InstallHint } from "../InstallHint";
import { LineItem } from "./LineItem";

export type { Mode };
const MODES: [Mode, string][] = [
  ["all", "Show all"],
  ["hide-fr", "Hide French"],
  ["hide-en", "Hide English"],
  ["listen", "Listen first"],
];
const SPEEDS: [Speed, string][] = [
  ["normal", "Normal"],
  ["slow", "Slow"],
  ["slower", "Slower"],
];
const STAGE_TEXT: Record<string, string> = {
  outline: "Planning the sections…",
  sections: "Writing words and sentences…",
  story: "Retelling your story in French…",
  check: "Checking the French…",
  done: "Finishing…",
};

const STALE_MS = 6 * 60_000;

export function TopicView({ initial, initialStale, welcome, hasLlm }: { initial: FullTopic; initialStale: boolean; welcome: boolean; hasLlm: boolean }) {
  const router = useRouter();
  const [topic, setTopic] = useState(initial);
  const [stale, setStale] = useState(initialStale); // generation stopped without finishing
  const [revealAll, setRevealAll] = useState(0); // bumps to reveal every row
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioVersion, setAudioVersion] = useState(0);
  const { speed, repeat, mode } = usePlayer();

  useEffect(() => () => stop(), []);
  const setMode = (m: Mode) => {
    storeMode(m);
    setRevealAll(0);
  };

  // ---------- generation polling ----------

  const reload = useCallback(async () => {
    try {
      const r = await api<{ topic: FullTopic }>(`/api/topics/${topic.id}`);
      setTopic(r.topic);
      return r.topic;
    } catch {
      return null;
    }
  }, [topic.id]);

  const generating = topic.status === "generating";
  useEffect(() => {
    if (!generating || stale) return;
    const t = setInterval(async () => {
      if (topic.genStartedAt && Date.now() - new Date(topic.genStartedAt).getTime() > STALE_MS) {
        setStale(true);
        return;
      }
      const next = await reload();
      if (next && next.status !== "generating") {
        setAudioVersion((v) => v + 1);
        router.refresh();
      }
    }, 2500);
    return () => clearInterval(t);
  }, [generating, stale, reload, router, topic.genStartedAt]);

  const resume = async () => {
    try {
      await api(`/api/topics/${topic.id}/generate`, { json: {} });
      setStale(false);
      setTopic((t) => ({ ...t, status: "generating", error: null, genStartedAt: new Date().toISOString() }));
    } catch (e) {
      toast((e as Error).message);
    }
  };

  // ---------- edits ----------

  const saveSection = async (s: FullSection, data: SectionData) => {
    setTopic((t) => ({ ...t, sections: t.sections.map((x) => (x.id === s.id ? { ...x, data } : x)) }));
    try {
      await api(`/api/topics/${topic.id}/sections/${s.id}`, { method: "PATCH", json: { data } });
      setAudioVersion((v) => v + 1);
    } catch (e) {
      toast((e as Error).message);
      void reload();
    }
  };

  const saveStory = async (storyFr: StoryLine[]) => {
    setTopic((t) => ({ ...t, storyFr }));
    try {
      await api(`/api/topics/${topic.id}`, { method: "PATCH", json: { storyFr } });
      setAudioVersion((v) => v + 1);
    } catch (e) {
      toast((e as Error).message);
      void reload();
    }
  };

  const regenerate = async (s: FullSection, extra?: string) => {
    setTopic((t) => ({ ...t, sections: t.sections.map((x) => (x.id === s.id ? { ...x, status: "generating" } : x)) }));
    try {
      await api(`/api/topics/${topic.id}/sections/${s.id}/regenerate`, { json: { extra: extra ?? null } });
    } catch (e) {
      toast((e as Error).message);
    }
    await reload();
    setAudioVersion((v) => v + 1);
  };

  const remove = async () => {
    if (!confirm("Delete this topic? Its recordings stay available for other topics that use the same lines.")) return;
    try {
      await api(`/api/topics/${topic.id}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  // ---------- render ----------

  const counts = useMemo(
    () => ({
      words: topic.sections.reduce((n, s) => n + s.data.words.length, 0),
      sentences: topic.sections.reduce((n, s) => n + s.data.sentences.length, 0) + topic.storyFr.length,
      flagged:
        topic.sections.reduce((n, s) => n + [...s.data.words, ...s.data.sentences].filter((x) => x.flag).length, 0) +
        topic.storyFr.filter((l) => l.flag).length,
    }),
    [topic],
  );

  return (
    <main className="page" data-mode={mode}>
      <Link href="/" className="back">
        ← All topics
      </Link>

      {(welcome || topic.isExample) && (
        <div className="banner">
          <p>
            {topic.isExample ? "This example was made from a three-sentence story." : "Your topic is ready."} Make one from something that happened to you.
          </p>
          <Link href="/new" className="btn btn-primary btn-small">
            Make your own →
          </Link>
        </div>
      )}

      <header className="topic-head">
        <h1 lang="fr">{topic.titleFr ? <Fr text={topic.titleFr} /> : "Nouveau sujet"}</h1>
        <p className="sub">{topic.title || "Your topic is being written"}</p>
        <p className="meta">
          {new Date(topic.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {topic.level} · {counts.words} words ·{" "}
          {counts.sentences} sentences
        </p>
        {topic.summary && (
          <p className="summary">
            <Rich text={topic.summary} />
          </p>
        )}
      </header>

      {generating && !stale && (
        <div className="card stack" role="status" aria-live="polite">
          <div className="status-line">
            <Spinner /> {STAGE_TEXT[topic.stage] ?? "Working…"}
          </div>
          <p className="hint" style={{ margin: 0 }}>
            This takes about a minute. You can leave this page or lock your phone — it keeps going.
          </p>
        </div>
      )}
      {(topic.status === "failed" || stale) && (
        <div className="error-box stack">
          <p>{stale ? "This topic stopped before it was finished." : topic.error || "Something went wrong while writing this topic."}</p>
          <div className="row">
            <button className="btn btn-primary btn-small" onClick={resume} disabled={!hasLlm}>
              {stale ? "Finish it" : "Try again"}
            </button>
            {!hasLlm || topic.error?.includes("key") ? (
              <Link className="btn btn-small" href="/settings">
                Open Settings
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {topic.status === "ready" && <AudioBar topicId={topic.id} version={audioVersion} />}

      <div className="controls">
        <div className="bar">
          <div className="seg" role="group" aria-label="Quiz mode">
            {MODES.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}>
                {label}
              </button>
            ))}
          </div>
          {mode !== "all" && (
            <button type="button" className="toggle" onClick={() => setRevealAll((n) => n + 1)}>
              Reveal all
            </button>
          )}
        </div>
        <div className="bar">
          <div className="seg" role="group" aria-label="Speed">
            {SPEEDS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={speed === k} onClick={() => setSpeed(k)}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="toggle" aria-pressed={repeat} onClick={() => setRepeat(!repeat)} title="Play each line three times, with a pause to repeat after it">
            ↻ Repeat ×3
          </button>
          <div className="menu" style={{ marginLeft: "auto" }}>
            <button type="button" className="btn btn-small" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
              ⋯ More
            </button>
            {menuOpen && (
              <div className="menu-list" onClick={() => setMenuOpen(false)}>
                <button type="button" onClick={() => setEditing((e) => !e)}>
                  {editing ? "Done editing" : "Edit this topic"}
                </button>
                <a href={`/api/export?topic=${topic.id}`}>Download as JSON</a>
                <button type="button" onClick={remove} style={{ color: "var(--danger)" }}>
                  Delete topic
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {topic.sections.length > 0 && (
        <nav className="chips sticky-chips" aria-label="Sections">
          {topic.sections.map((s, i) => (
            <a key={s.id} href={`#${s.slug}`}>
              <span>{i + 1}</span>
              <Fr text={s.titleFr} />
            </a>
          ))}
          {topic.storyFr.length > 0 && (
            <a href="#story">
              <span>★</span>Mon histoire
            </a>
          )}
        </nav>
      )}

      {editing && (
        <div className="banner">
          <p>Editing: change or delete any line, or ask for a section to be rewritten.</p>
          <button className="btn btn-small" onClick={() => setEditing(false)}>
            Done
          </button>
        </div>
      )}

      {(topic.sourceText || topic.story) && <PromptBox topic={topic} />}

      {topic.stage === "outline" && generating && (
        <div className="stack" style={{ marginTop: 24 }}>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}

      {topic.sections.map((s, i) => (
        <SectionView
          key={s.id}
          section={s}
          index={i}
          mode={mode}
          revealAll={revealAll}
          editing={editing}
          onSave={(data) => saveSection(s, data)}
          onRegenerate={(extra) => regenerate(s, extra)}
          onRetry={resume}
        />
      ))}

      {topic.storyFr.length > 0 && (
        <StoryView lines={topic.storyFr} genderNote={topic.genderNote} mode={mode} revealAll={revealAll} editing={editing} onSave={saveStory} />
      )}

      <p className="ai-note">
        {topic.isExample ? "Example topic." : `Written by AI (${topic.modelUsed ?? "unknown model"}) and may contain mistakes.`}{" "}
        {counts.flagged > 0 && `${counts.flagged} line${counts.flagged > 1 ? "s were" : " was"} flagged by the review — look for ⚠.`} A play button with a dashed border uses your
        device&apos;s voice, which is less reliable than a recording.
      </p>

      {!topic.isExample && topic.status === "ready" && <InstallHint />}
    </main>
  );
}

// ---------- What the topic was made from ----------

function PromptBox({ topic }: { topic: FullTopic }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(topic.prompt ?? "");
      toast("Prompt copied.");
    } catch {
      toast("Could not copy. Select the text instead.");
    }
  };
  return (
    <details className="story-box">
      <summary>What you wrote (the prompt for this topic)</summary>
      <p>{topic.sourceText || topic.story}</p>
      {topic.answers.length > 0 && (
        <dl className="prompt-answers">
          {topic.answers.map((a, i) => (
            <div key={i}>
              <dt>{a.question}</dt>
              <dd>{a.answer}</dd>
            </div>
          ))}
        </dl>
      )}
      {topic.story && topic.story !== topic.sourceText && (
        <>
          <h3 className="label">The AI&apos;s summary</h3>
          <p>{topic.story}</p>
        </>
      )}
      {topic.prompt && (
        <details className="prompt-full">
          <summary>Full prompt sent to the AI</summary>
          <p className="hint">
            The rules and your story, as the AI got them in the first step (planning the sections). The next steps send the plan back and ask for each section, My
            story, and the review. Rebuilt from your saved story and settings.
          </p>
          <button type="button" className="btn btn-small" onClick={copy}>
            Copy prompt
          </button>
          <pre>{topic.prompt}</pre>
        </details>
      )}
    </details>
  );
}

// ---------- My story ----------

function StoryView({
  lines,
  genderNote,
  mode,
  revealAll,
  editing,
  onSave,
}: {
  lines: StoryLine[];
  genderNote: string | null;
  mode: Mode;
  revealAll: number;
  editing: boolean;
  onSave: (lines: StoryLine[]) => void;
}) {
  const [current, setCurrent] = useState<number | null>(null);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const { playing } = usePlayer();
  const highlighted = playing && current !== null && lines[current]?.fr === playing ? current : null;

  return (
    <section className="topic-section" id="story">
      <header>
        <span className="num">★</span>
        <div>
          <h2 lang="fr">Mon histoire</h2>
          <p className="sub">My story, retold in simple French</p>
        </div>
      </header>
      <button
        type="button"
        className="btn btn-primary play-all"
        onClick={() =>
          playAll(
            lines.map((l) => l.fr),
            (i) => {
              setCurrent(i);
              refs.current[i]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
            },
          )
        }
      >
        ▶ Play my story
      </button>
      {genderNote && (
        <p className="note">
          <Rich text={genderNote} />
        </p>
      )}
      <ol className="list">
        {lines.map((l, i) => (
          <LineItem
            key={l.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            line={l}
            playing={highlighted === i}
            mode={mode}
            revealAll={revealAll}
            editing={editing}
            className="story-line"
            onChange={(next) => onSave(next ? lines.map((x) => (x.id === l.id ? next : x)) : lines.filter((x) => x.id !== l.id))}
          />
        ))}
      </ol>
    </section>
  );
}
