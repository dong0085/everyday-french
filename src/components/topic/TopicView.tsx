"use client";
// The topic page: where a learner studies one topic.
// Order: title · study button · sections (Key words · Phrases · More words · Sentences · Your turn)
// · Mon histoire · Le dialogue · Next time, say… · How this topic was made · legend.
// The study bar (StudyBar) stays on screen; the guided study (GuidedStudy) opens on top.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FullTopic } from "@/lib/data";
import type { DialogueLine, SectionData, Sentence, StoryLine } from "@/lib/content/schema";
import { releaseMic, stop, usePlayerSelector } from "../player";
import { api, confirmDialog, Fr, Rich, toast } from "../ui";
import { Icon } from "../Icon";
import { InstallHint } from "../InstallHint";
import { GenerationProgress, ReadyBanner } from "../GenerationProgress";
import { StudyProvider, type StudyContext } from "./context";
import { resetReveal } from "./useReveal";
import { AudioBar } from "./AudioBar";
import { SectionView, groupWords } from "./SectionView";
import { StoryView } from "./StoryView";
import { DialogueView } from "./DialogueView";
import { NextTime } from "./NextTime";
import { PromptBox } from "./PromptBox";
import { StudyBar, type Chip } from "./StudyBar";
import { MoreMenu, type MenuItem } from "./MoreMenu";
import { GuidedStudy } from "./GuidedStudy";
import { ShortcutsSheet, useStudyKeys } from "./useStudyKeys";
import { UndoHost } from "./undo";

const STALE_MS = 6 * 60_000;

export function TopicView({
  initial,
  initialStale,
  welcome,
  hasLlm,
  starred: initialStarred = [],
}: {
  initial: FullTopic;
  initialStale: boolean;
  welcome: boolean;
  hasLlm: boolean;
  starred?: string[];
}) {
  const router = useRouter();
  const [topic, setTopic] = useState(initial);
  const [stale, setStale] = useState(initialStale); // generation stopped without finishing
  const [editing, setEditing] = useState(false);
  const [audioVersion, setAudioVersion] = useState(0);
  const [showWelcome, setShowWelcome] = useState(welcome);
  const [justReady, setJustReady] = useState(false);
  const [guided, setGuided] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [starred, setStarred] = useState<ReadonlySet<string>>(() => new Set(initialStarred));
  const [flagAt, setFlagAt] = useState(0);
  const mode = usePlayerSelector((s) => s.mode);

  // Leaving the page: stop audio, close the microphone, forget recordings and reveals.
  useEffect(
    () => () => {
      stop();
      releaseMic();
      resetReveal();
    },
    [],
  );
  // "?welcome=1" is for the first render only; a reload should not welcome again.
  useEffect(() => {
    if (welcome) window.history.replaceState(null, "", window.location.pathname);
  }, [welcome]);

  const openKeys = useCallback(() => setKeysOpen(true), []);
  useStudyKeys(openKeys);

  // ---------- generation polling ----------

  const reload = useCallback(async () => {
    try {
      const r = await api<{ topic: FullTopic }>(`/api/topics/${topic.id}`);
      setTopic((t) =>
        t.updatedAt === r.topic.updatedAt && t.stage === r.topic.stage && t.status === r.topic.status && sameSections(t, r.topic) ? t : r.topic,
      );
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
        if (next.status === "ready") setJustReady(true);
        router.refresh();
      }
    }, 2500);
    return () => clearInterval(t);
  }, [generating, stale, reload, router, topic.genStartedAt]);

  const resume = useCallback(async () => {
    try {
      await api(`/api/topics/${topic.id}/generate`, { json: {} });
      setStale(false);
      setTopic((t) => ({ ...t, status: "generating", error: null, genStartedAt: new Date().toISOString() }));
    } catch (e) {
      toast((e as Error).message, { tone: "error" });
    }
  }, [topic.id]);

  // ---------- edits ----------

  const saveSection = useCallback(
    async (sectionId: string, data: SectionData) => {
      setTopic((t) => ({ ...t, sections: t.sections.map((x) => (x.id === sectionId ? { ...x, data } : x)) }));
      try {
        await api(`/api/topics/${topic.id}/sections/${sectionId}`, { method: "PATCH", json: { data } });
        setAudioVersion((v) => v + 1);
      } catch (e) {
        toast((e as Error).message, { tone: "error" });
        void reload();
      }
    },
    [topic.id, reload],
  );

  const appendLine = useCallback((sectionId: string, line: Sentence) => {
    setTopic((t) => ({
      ...t,
      sections: t.sections.map((x) => (x.id === sectionId ? { ...x, data: { ...x.data, sentences: [...x.data.sentences, line] } } : x)),
    }));
    setAudioVersion((v) => v + 1);
  }, []);

  const patchTopic = useCallback(
    async (patch: { storyFr?: StoryLine[]; dialogue?: DialogueLine[] }) => {
      setTopic((t) => ({ ...t, ...patch }));
      try {
        await api(`/api/topics/${topic.id}`, { method: "PATCH", json: patch });
        setAudioVersion((v) => v + 1);
      } catch (e) {
        toast((e as Error).message, { tone: "error" });
        void reload();
      }
    },
    [topic.id, reload],
  );
  const saveStory = useCallback((storyFr: StoryLine[]) => patchTopic({ storyFr }), [patchTopic]);
  const saveDialogue = useCallback((dialogue: DialogueLine[]) => patchTopic({ dialogue }), [patchTopic]);

  const regenerate = useCallback(
    async (sectionId: string, extra?: string) => {
      setTopic((t) => ({ ...t, sections: t.sections.map((x) => (x.id === sectionId ? { ...x, status: "generating" } : x)) }));
      try {
        await api(`/api/topics/${topic.id}/sections/${sectionId}/regenerate`, { json: { extra: extra ?? null } });
      } catch (e) {
        toast((e as Error).message, { tone: "error" });
      }
      await reload();
      setAudioVersion((v) => v + 1);
    },
    [topic.id, reload],
  );

  const onStar = useCallback(
    async (lineId: string, on: boolean) => {
      const flip = (want: boolean) =>
        setStarred((s) => {
          const n = new Set(s);
          if (want) n.add(lineId);
          else n.delete(lineId);
          return n;
        });
      flip(on);
      try {
        await api("/api/review/star", { json: { topicId: topic.id, lineId, starred: on } });
        toast(on ? "Added to your Review." : "Removed from your Review.");
      } catch (e) {
        flip(!on);
        toast((e as Error).message, { tone: "error" });
      }
    },
    [topic.id],
  );

  const remove = async () => {
    const ok = await confirmDialog({
      title: "Delete this topic?",
      body: <p className="m-0">“{topic.titleFr || topic.title}” and its review cards will be deleted.</p>,
      consequences: ["Recordings stay available for other topics that use the same lines."],
      confirmLabel: "Delete topic",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/topics/${topic.id}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, { tone: "error" });
    }
  };

  // ---------- derived ----------

  const counts = useMemo(() => {
    const flagged = [
      ...topic.sections.flatMap((s) => [...s.data.words, ...s.data.sentences]),
      ...topic.storyFr,
      ...(topic.dialogue ?? []),
    ]
      .filter((x) => x.flag)
      .map((x) => x.id);
    return {
      words: topic.sections.reduce((n, s) => n + s.data.words.length, 0),
      sentences: topic.sections.reduce((n, s) => n + s.data.sentences.length, 0),
      flagged,
    };
  }, [topic]);

  const chips: Chip[] = useMemo(() => {
    const out: Chip[] = topic.sections
      .filter((s) => s.status === "ready")
      .map((s) => {
        const g = groupWords(s.data.words);
        const words = [...g.key, ...g.phrases, ...g.more];
        return {
          id: s.slug,
          num: topic.sections.indexOf(s) + 1,
          label: s.titleFr,
          lang: "fr" as const,
          lines: [...words.map((w) => w.fr), ...s.data.sentences.map((x) => x.fr)],
          ids: [...words.map((w) => w.id), ...s.data.sentences.map((x) => x.id)],
        };
      });
    if (topic.storyFr.length)
      out.push({ id: "story", num: "★", label: "Mon histoire", lang: "fr", lines: topic.storyFr.map((l) => l.fr), ids: topic.storyFr.map((l) => l.id) });
    if (topic.dialogue?.length)
      out.push({ id: "dialogue", num: <Icon name="chat" size={14} />, label: "Le dialogue", lang: "fr", lines: topic.dialogue.map((l) => l.fr), ids: topic.dialogue.map((l) => l.id) });
    if (topic.nextTime?.length) out.push({ id: "next-time", num: <Icon name="arrow-right" size={14} />, label: "Next time", lines: topic.nextTime.map((l) => l.fr), ids: [] });
    return out;
  }, [topic.sections, topic.storyFr, topic.dialogue, topic.nextTime]);

  const nextFlag = () => {
    const ids = counts.flagged;
    if (!ids.length) return;
    const id = ids[flagAt % ids.length];
    setFlagAt((n) => n + 1);
    const el = document.getElementById(`line-${id}`);
    if (!el) return;
    el.closest("details")?.setAttribute("open", "");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  };

  const ctx: StudyContext = useMemo(
    () => ({ topicId: topic.id, mode, scope: "page", editing, hasLlm, isExample: topic.isExample, starred, onStar }),
    [topic.id, mode, editing, hasLlm, topic.isExample, starred, onStar],
  );

  const ready = topic.status === "ready";
  const genActive = generating && !stale;
  const failed = topic.status === "failed" || stale;
  const studyable = ready && topic.sections.some((s) => s.status === "ready");

  const menu: MenuItem[] = [
    { label: editing ? "Done editing" : "Edit this topic", icon: "edit", onSelect: () => setEditing((e) => !e) },
    ...(studyable ? [{ label: "Study this topic", icon: "book" as const, onSelect: () => setGuided(true) }] : []),
    { label: "Keyboard shortcuts", icon: "list", onSelect: openKeys },
    { label: "Download as JSON", icon: "external", href: `/api/export?topic=${topic.id}` },
    ...(topic.isExample ? [] : [{ label: "Delete topic", icon: "trash" as const, danger: true, onSelect: remove }]),
  ];

  const date = new Date(topic.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <StudyProvider value={ctx}>
      <main className={`page topic-page${editing ? " is-editing" : ""}`} data-mode={mode}>
        <Link href="/" className="back">
          <Icon name="arrow-left" size={16} /> All topics
        </Link>

        {showWelcome && (
          <div className="welcome fade-in" role="region" aria-label="Welcome">
            <div className="grow">
              <p className="welcome-title">
                <strong lang="fr">Bienvenue !</strong> This is an example topic.
              </p>
              <p className="m-0">
                Tap <Icon name="speaker" size={16} className="inline-icon" /> next to any line to hear it. When you&apos;re ready, make one from your own day.
              </p>
            </div>
            <div className="row">
              <Link href="/new" className="btn btn-primary">
                Make my own topic
              </Link>
              <button type="button" className="btn btn-ghost" onClick={() => setShowWelcome(false)}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {justReady && <ReadyBanner titleFr={topic.titleFr} onDismiss={() => setJustReady(false)} />}

        {genActive && !topic.titleFr ? null : (
          <header className="topic-head">
            <div className="title-row">
              <h1 lang="fr">{topic.titleFr ? <Fr text={topic.titleFr} /> : "Nouveau sujet"}</h1>
              {!genActive && <MoreMenu items={menu} />}
            </div>
            <p className="sub">{topic.title || "Your topic is being written"}</p>
            {topic.isExample && !showWelcome && (
              <p className="example-note">
                Example topic · made from a three-sentence story · <Link href="/new">Make your own →</Link>
              </p>
            )}
            {!genActive && (
              <p className="meta topic-meta">
                <span>
                  {date} · {topic.level} · {counts.words} words · {counts.sentences} sentences
                </span>
                {topic.studiedAt && (
                  <span className="badge badge-ok">
                    <Icon name="check" size={12} /> Studied
                  </span>
                )}
                {counts.flagged.length > 0 && (
                  <button type="button" className="flag-chip" onClick={nextFlag} title="Go to the next line to check">
                    <span className="flag-mark" aria-hidden="true">
                      !
                    </span>
                    {counts.flagged.length} to check
                  </button>
                )}
              </p>
            )}
            {topic.summary && !genActive && (
              <p className="summary">
                <Rich text={topic.summary} />
              </p>
            )}
          </header>
        )}

        {genActive && (
          <GenerationProgress stage={topic.stage} sections={topic.sections} genStartedAt={topic.genStartedAt} sourceText={topic.sourceText || topic.story} titleFr={topic.titleFr} />
        )}

        {failed && (
          <div className="error-box stack">
            <p>
              <strong>This topic stopped before it was finished.</strong> Nothing is lost — tap {stale ? "Finish it" : "Try again"} to continue from where it
              stopped.
            </p>
            {(topic.error || topic.modelUsed) && (
              <details>
                <summary>What happened?</summary>
                {topic.error && <p className="small">{topic.error}</p>}
                {topic.modelUsed && <p className="small">Model: {topic.modelUsed}</p>}
              </details>
            )}
            <div className="row">
              <button className="btn btn-primary" onClick={resume} disabled={!hasLlm}>
                {stale ? "Finish it" : "Try again"}
              </button>
              {!hasLlm || topic.error?.includes("key") ? (
                <Link className="btn" href="/settings#ai">
                  Open Settings
                </Link>
              ) : null}
            </div>
          </div>
        )}

        {studyable && (
          <div className="study-start">
            <button type="button" className="btn btn-primary btn-large study-cta" onClick={() => setGuided(true)}>
              <Icon name="book" size={20} />
              <span>
                Study this topic <span className="cta-sub">about 10 min</span>
              </span>
            </button>
            <AudioBar topicId={topic.id} version={audioVersion} />
          </div>
        )}

        {studyable && <StudyBar chips={chips} editing={editing} onDoneEditing={() => setEditing(false)} onShortcuts={openKeys} />}

        {topic.sections.map((s, i) => (
          <SectionView key={s.id} section={s} index={i} onSave={saveSection} onAppend={appendLine} onRegenerate={regenerate} onRetry={resume} />
        ))}

        {topic.storyFr.length > 0 && <StoryView lines={topic.storyFr} genderNote={topic.genderNote} onSave={saveStory} />}

        {(topic.dialogue?.length ?? 0) > 0 && <DialogueView lines={topic.dialogue} onSave={saveDialogue} />}

        {!genActive && (topic.nextTime?.length ?? 0) > 0 && <NextTime lines={topic.nextTime} />}

        {!genActive && (
          <footer className="topic-foot">
            {(topic.sourceText || topic.story) && <PromptBox topic={topic} />}
            <dl className="legend">
              <div>
                <dt>
                  <span className="legend-btn device" aria-hidden="true" />
                </dt>
                <dd>Dashed button: your device&apos;s voice</dd>
              </div>
              <div>
                <dt>
                  <span className="legend-btn" aria-hidden="true" />
                </dt>
                <dd>Solid button: a natural recording</dd>
              </div>
              <div>
                <dt>
                  <span className="star" aria-hidden="true">
                    ★
                  </span>
                </dt>
                <dd>Core word — it goes to your Review</dd>
              </div>
            </dl>
            <p className="ai-note">
              {topic.isExample ? "Example topic, written by hand." : `Written by AI (${topic.modelUsed ?? "unknown model"}) — it may contain mistakes.`}
            </p>
          </footer>
        )}

        {!topic.isExample && ready && <InstallHint />}
      </main>

      {guided && <GuidedStudy topic={topic} onClose={() => setGuided(false)} onStudied={() => setTopic((t) => ({ ...t, studiedAt: new Date().toISOString() }))} onAppend={appendLine} />}
      <ShortcutsSheet open={keysOpen} onClose={() => setKeysOpen(false)} />
      <UndoHost />
    </StudyProvider>
  );
}

function sameSections(a: FullTopic, b: FullTopic) {
  return a.sections.length === b.sections.length && a.sections.every((s, i) => s.status === b.sections[i].status && s.id === b.sections[i].id);
}
