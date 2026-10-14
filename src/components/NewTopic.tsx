"use client";
// "What happened?" — the create flow: tell → (optional questions) → make the topic. Also "Save for later".
// The story is first; level, "I went…" and first language sit below it. The draft is kept in this
// browser (src/lib/draft.ts) so a reload or a trip to the AI provider's site never loses it.

import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { LEVELS, type Level } from "@/lib/content/schema";
import { clearDraft, parseDraft, readDraftRaw, saveDraft, type DraftAbout, type DraftQuestion } from "@/lib/draft";
import { api, ApiError, Spinner, toast } from "./ui";
import { Icon } from "./Icon";
import { MemoChip, Recorder, recordingSupported } from "./Recorder";
import { SetupAI } from "./SetupAI";
import { IDEAS, IDEA_KEYS, type IdeaKey } from "./home/ideas";

const noop = () => () => {};
const MIN_CHARS = 10;

type Gender = "m" | "f" | "x";
type L1 = "zh" | "en" | "other";

const LEVEL_TEXT: Record<Level, [string, string]> = {
  A1: ["Beginner", "Just starting"],
  A2: ["Elementary", "Everyday situations"],
  B1: ["Intermediate", "Longer sentences"],
  B2: ["Upper intermediate", "Natural French"],
};
const GENDERS: [Gender, string, string][] = [
  ["m", "Je suis allé", "je suis allé"],
  ["f", "Je suis allée", "je suis allée"],
  ["x", "Not sure / skip", "allé / allée: not set"],
];
const L1S: [L1, string][] = [
  ["zh", "中文"],
  ["en", "English"],
  ["other", "Other"],
];

type Props = {
  setUp: boolean;
  level: Level;
  selfGender: Gender;
  l1: L1;
  hasLlm: boolean;
  hasStt: boolean;
  allowMock: boolean;
  /** "about $0.06" or "free tier": what making one topic costs with the saved model, when known. */
  cost: string | null;
  idea: IdeaKey | null;
  capture: { id: string; text: string; audioUrl: string | null } | null;
};

type Memo = { blob: Blob; seconds: number; url: string };
type About = { level: Level; gender: Gender; l1: L1 };

function validAbout(a: DraftAbout | null | undefined): About | null {
  if (!a) return null;
  const ok = (LEVELS as readonly string[]).includes(a.level) && ["m", "f", "x"].includes(a.gender) && ["zh", "en", "other"].includes(a.l1);
  return ok ? (a as About) : null;
}

export function NewTopic(props: Props) {
  const router = useRouter();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The draft: what the person typed earlier in this browser. Read after hydration (null on the server).
  const useDraft = !props.capture && !props.idea;
  const rawDraft = useSyncExternalStore(noop, readDraftRaw, () => null);
  const draft = useDraft ? parseDraft(rawDraft) : null;

  // null = not touched yet in this visit → show the draft.
  const [edited, setEdited] = useState<string | null>(props.capture?.text ?? (props.idea ? IDEAS[props.idea].start : null));
  const [editedQuestions, setEditedQuestions] = useState<DraftQuestion[] | null | undefined>(undefined);
  const text = edited ?? draft?.text ?? "";
  const questions = editedQuestions === undefined ? (draft?.questions ?? null) : editedQuestions;
  const restored = edited === null && editedQuestions === undefined && Boolean(draft?.text.trim() || draft?.questions);

  // "About you" choices: this visit's edits, else the kept draft's, else the profile.
  const [aboutEdit, setAboutEdit] = useState<About | null>(null);
  const about: About = aboutEdit ?? validAbout(draft?.about) ?? { level: props.level, gender: props.selfGender, l1: props.l1 };
  const { level, gender, l1 } = about;
  const changeAbout = (patch: Partial<About>) => {
    const next = { ...about, ...patch };
    setAboutEdit(next);
    persist(text, questions, next);
  };
  const [aboutOpen, setAboutOpen] = useState(!props.setUp);
  const [hasLlm, setHasLlm] = useState(props.hasLlm);
  const [hasStt, setHasStt] = useState(props.hasStt);
  const [setupOpen, setSetupOpen] = useState<null | "text" | "transcribe">(null);
  const [pending, setPending] = useState<null | "questions">(null);
  const [busy, setBusy] = useState<null | "generate" | "questions" | "save" | "transcribe">(null);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState<Memo | null>(null);
  const canRecord = useSyncExternalStore(noop, recordingSupported, () => false);

  const enough = text.trim().length >= MIN_CHARS;
  const hasCaptureAudio = Boolean(props.capture?.audioUrl);

  // ---------- draft ----------

  // Called from event handlers only (typing, tapping), never during render.
  const persist = (t: string, qs: DraftQuestion[] | null, a: About | null = aboutEdit ?? (draft?.about ? about : null)) => {
    if (props.capture) return; // a saved note lives on the server already
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(t, qs, a), 400);
  };
  const setText = (t: string) => {
    setEdited(t);
    persist(t, questions);
  };
  const setQuestions = (qs: DraftQuestion[] | null) => {
    setEditedQuestions(qs);
    if (edited === null) setEdited(text);
    persist(text, qs);
  };
  const forgetDraft = () => {
    clearTimeout(saveTimer.current);
    clearDraft();
  };

  const focusStoryEnd = () =>
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });

  // ---------- actions ----------

  const saveProfile = async () => {
    if (!props.setUp || level !== props.level || gender !== props.selfGender || l1 !== props.l1)
      await api("/api/profile", { method: "PATCH", json: { level, selfGender: gender, l1, setUp: true } });
  };

  const addText = (t: string) => setText(text.trim() ? `${text.trim()}\n${t}` : t);

  const transcribe = async (m: Memo) => {
    setBusy("transcribe");
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", m.blob, "memo");
      form.append("seconds", String(m.seconds));
      const r = await api<{ text: string }>("/api/stt", { form });
      addText(r.text);
      URL.revokeObjectURL(m.url);
      setMemo(null);
    } catch (e) {
      setMemo(m);
      setError(`${(e as Error).message} Your recording is kept: you can save it for later.`);
    } finally {
      setBusy(null);
    }
  };

  const transcribeCapture = async () => {
    if (!props.capture) return;
    setBusy("transcribe");
    setError(null);
    try {
      const r = await api<{ text: string }>(`/api/captures/${props.capture.id}/transcribe`, { json: {} });
      addText(r.text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onRecorded = (blob: Blob, seconds: number) => {
    const m = { blob, seconds, url: URL.createObjectURL(blob) };
    if (memo) URL.revokeObjectURL(memo.url);
    if (hasStt) void transcribe(m);
    else setMemo(m);
  };

  const removeMemo = () => {
    if (memo) URL.revokeObjectURL(memo.url);
    setMemo(null);
  };

  const generate = async (answers?: DraftQuestion[], keyReady = hasLlm) => {
    if (!keyReady) {
      setSetupOpen("text");
      return;
    }
    setBusy("generate");
    setError(null);
    try {
      await saveProfile();
      const r = await api<{ id: string }>("/api/topics", { json: { text, answers, captureId: props.capture?.id } });
      forgetDraft();
      router.push(`/topics/${r.id}`);
    } catch (e) {
      setBusy(null);
      if (e instanceof ApiError && e.code === "no_key") setSetupOpen("text");
      else setError((e as Error).message);
    }
  };

  const ask = async (keyReady = hasLlm) => {
    if (!keyReady) {
      setPending("questions");
      setSetupOpen("text");
      return;
    }
    setBusy("questions");
    setError(null);
    try {
      await saveProfile();
      const r = await api<{ questions: string[] }>("/api/topics/questions", { json: { text } });
      if (!r.questions.length) {
        toast("No questions — your story is clear. Writing the topic now.");
        await generate(undefined, true);
        return;
      }
      setQuestions(r.questions.map((q) => ({ question: q, answer: "" })));
      requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(".questions textarea")?.focus());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy((b) => (b === "questions" ? null : b));
    }
  };

  const saveForLater = async () => {
    setBusy("save");
    setError(null);
    try {
      const cap = props.capture;
      if (cap && !memo) {
        // Same note, new words: keep its voice memo.
        await api(`/api/captures/${cap.id}`, { method: "PATCH", json: { text } });
      } else {
        const form = new FormData();
        form.append("text", text);
        if (memo) {
          form.append("audio", memo.blob, "memo");
          form.append("seconds", String(memo.seconds));
        }
        await api("/api/captures", { form });
        // The old note is replaced, unless it has a voice memo of its own (never lose a recording).
        if (cap && !hasCaptureAudio) await api(`/api/captures/${cap.id}`, { method: "DELETE" });
      }
      forgetDraft();
      toast("Saved. You'll find it on your topics page.");
      router.push("/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  // ---------- view ----------

  const helper =
    !text.trim() && (memo || hasCaptureAudio)
      ? "Turn the memo into text, or type a few words."
      : !enough
        ? "Write a little more (a sentence or two)."
        : `About 1 minute to write${props.cost ? ` · ${props.cost}` : ""}.`;
  const canSave = Boolean(text.trim() || memo) && busy === null;
  const genderShort = GENDERS.find((g) => g[0] === gender)?.[2];

  return (
    <main className="page new-page">
      <h1>What happened?</h1>
      <p className="sub">
        Write it in any language — <span lang="zh-Hans">中文</span>, English or <span lang="fr">français</span>. Three or four sentences is enough.
      </p>

      <div className="stack mt-4">
        {props.capture?.audioUrl && (
          <div className="card stack-sm">
            <span className="label">Your saved voice memo</span>
            <audio controls src={props.capture.audioUrl} className="memo-audio" />
            {hasStt ? (
              <button type="button" className="btn btn-small self-start" disabled={busy !== null} onClick={transcribeCapture}>
                <Icon name="pen" size={16} /> Turn it into text
              </button>
            ) : (
              <p className="hint m-0">
                To turn it into text, <button type="button" className="linklike" onClick={() => setSetupOpen("transcribe")}>connect speech-to-text</button>. Or type what you said.
              </p>
            )}
          </div>
        )}

        {questions ? (
          <div className="card story-quote">
            <div className="spread">
              <span className="eyebrow m-0">Your story</span>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  setQuestions(null);
                  focusStoryEnd();
                }}
              >
                <Icon name="edit" size={16} /> Edit
              </button>
            </div>
            <p className="m-0">{text}</p>
          </div>
        ) : (
          <div className="story-field">
            <label className="visually-hidden" htmlFor="story">
              What happened
            </label>
            <textarea
              id="story"
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={8000}
              rows={6}
              placeholder="Today I went to the pharmacy because…"
              aria-describedby="gen-help"
              autoFocus={!props.capture && props.setUp}
            />
            <div className="story-under">
              {restored ? (
                <span className="hint">
                  We kept what you wrote last time ·{" "}
                  <button
                    type="button"
                    className="linklike"
                    onClick={() => {
                      setEdited("");
                      setEditedQuestions(null);
                      forgetDraft();
                      focusStoryEnd();
                    }}
                  >
                    Clear
                  </button>
                </span>
              ) : (
                <span />
              )}
              <span className="hint story-helper" id="gen-help" aria-live="polite">
                {helper}
              </span>
            </div>
            {!text.trim() && (
              <div className="chips idea-chips" role="group" aria-label="Ideas to start from">
                {IDEA_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setText(IDEAS[k].start);
                      focusStoryEnd();
                    }}
                  >
                    <Icon name="plus" size={14} /> {IDEAS[k].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!questions && canRecord && (
          <div className="memo-area stack-sm">
            <Recorder disabled={busy !== null} onRecorded={onRecorded} />
            {memo && (
              <div className="stack-sm">
                <MemoChip url={memo.url} seconds={memo.seconds} onRemove={removeMemo} disabled={busy !== null} />
                {!hasStt && (
                  <p className="hint m-0">
                    To turn memos into text,{" "}
                    <button type="button" className="linklike" onClick={() => setSetupOpen("transcribe")}>
                      connect speech-to-text
                    </button>
                    . Or tap <strong>Save for later</strong> to keep it as it is.
                  </p>
                )}
                {hasStt && busy === null && (
                  <button type="button" className="btn btn-small self-start" onClick={() => void transcribe(memo)}>
                    <Icon name="repeat" size={16} /> Try turning it into text again
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {busy === "transcribe" && (
          <p className="status-line m-0" role="status">
            <Spinner /> Turning your memo into text…
          </p>
        )}

        {questions && (
          <section className="card questions stack" aria-labelledby="q-h">
            <div>
              <h2 id="q-h">A few questions to make it yours</h2>
              <p className="hint m-0">Answer in any language. Skip any you like.</p>
            </div>
            {questions.map((q, i) => (
              <label className="field" key={i}>
                <span>{q.question}</span>
                <textarea
                  className="answer"
                  rows={2}
                  maxLength={1000}
                  value={q.answer}
                  onChange={(e) => setQuestions(questions.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
                />
              </label>
            ))}
          </section>
        )}

        <AboutYou
          open={aboutOpen}
          firstRun={!props.setUp}
          level={level}
          gender={gender}
          l1={l1}
          summary={`Level ${level} · ${genderShort} · ${l1 === "other" ? "Other first language" : L1S.find((x) => x[0] === l1)?.[1]}`}
          onOpen={() => setAboutOpen(true)}
          onLevel={(v) => changeAbout({ level: v })}
          onGender={(v) => changeAbout({ gender: v })}
          onL1={(v) => changeAbout({ l1: v })}
        />

        {error && (
          <div className="error-box" role="alert">
            <p>{error}</p>
          </div>
        )}

        <div className="actions stack">
          <button
            className="btn btn-primary btn-large btn-block"
            disabled={!enough || busy !== null}
            onClick={() => generate(questions ?? undefined)}
            aria-describedby="gen-help"
            data-testid="generate"
          >
            {busy === "generate" ? (
              <>
                <Spinner /> Starting…
              </>
            ) : (
              <>
                <Icon name="sparkle" size={20} /> Make my topic
              </>
            )}
          </button>
          <div className="action-grid">
            {questions ? (
              <button className="btn btn-sub" disabled={!enough || busy !== null} onClick={() => generate(undefined)}>
                <Icon name="arrow-right" size={20} />
                <span>
                  Skip questions
                  <span className="sub-label">Make the topic from your story only</span>
                </span>
              </button>
            ) : (
              <button className="btn btn-sub" disabled={!enough || busy !== null} onClick={() => void ask()}>
                {busy === "questions" ? <Spinner /> : <Icon name="chat" size={20} />}
                <span>
                  {busy === "questions" ? "Thinking…" : "Ask me 2–3 questions first"}
                  <span className="sub-label">Adds details so it fits your story</span>
                </span>
              </button>
            )}
            <button className="btn btn-sub" disabled={!canSave} onClick={saveForLater}>
              {busy === "save" ? <Spinner /> : <Icon name="clipboard" size={20} />}
              <span>
                Save for later
                <span className="sub-label">No AI used. Finish it when you have time</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <SetupAI
        open={setupOpen !== null}
        use={setupOpen ?? "text"}
        allowMock={props.allowMock}
        from="create"
        onClose={() => {
          setSetupOpen(null);
          setPending(null);
        }}
        onDone={() => {
          const was = setupOpen;
          setSetupOpen(null);
          router.refresh();
          if (was === "text") {
            setHasLlm(true);
            if (pending === "questions") {
              setPending(null);
              void ask(true);
            } else if (enough) void generate(questions ?? undefined, true);
          } else {
            setHasStt(true);
            if (memo) void transcribe(memo);
            else if (hasCaptureAudio && !text.trim()) void transcribeCapture();
            else toast("Voice memos are ready.");
          }
        }}
      />
    </main>
  );
}

function AboutYou(p: {
  open: boolean;
  firstRun: boolean;
  level: Level;
  gender: Gender;
  l1: L1;
  summary: string;
  onOpen: () => void;
  onLevel: (l: Level) => void;
  onGender: (g: Gender) => void;
  onL1: (l: L1) => void;
}) {
  if (!p.open)
    return (
      <div className="about-line">
        <span className="hint">{p.summary}</span>
        <button type="button" className="btn btn-ghost btn-small" onClick={p.onOpen} aria-label="Change level, “I went…” and first language">
          Change
        </button>
      </div>
    );
  return (
    <section className="card about stack" aria-labelledby="about-h">
      <div>
        <h2 id="about-h">{p.firstRun ? "Three quick things about you" : "About you"}</h2>
        <p className="hint m-0">You can change these later in Settings.</p>
      </div>
      <div className="field">
        <span className="label" id="lvl-l">
          Your French level
        </span>
        <div className="choice-grid" role="group" aria-labelledby="lvl-l">
          {LEVELS.map((l) => (
            <button key={l} type="button" className="choice" aria-pressed={p.level === l} onClick={() => p.onLevel(l)}>
              <strong>
                {l} · {LEVEL_TEXT[l][0]}
              </strong>
              <small>{LEVEL_TEXT[l][1]}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label" id="g-l">
          When you say “I went…”, French needs to know:
        </span>
        <div className="seg seg-wrap" role="group" aria-labelledby="g-l">
          {GENDERS.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={p.gender === k} onClick={() => p.onGender(k)} lang={k === "x" ? undefined : "fr"}>
              {label}
            </button>
          ))}
        </div>
        <span className="hint">It only changes a few word endings.</span>
      </div>
      <div className="field">
        <span className="label" id="l1-l">
          Your first language
        </span>
        <div className="seg" role="group" aria-labelledby="l1-l">
          {L1S.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={p.l1 === k} onClick={() => p.onL1(k)} lang={k === "zh" ? "zh-Hans" : undefined}>
              {label}
            </button>
          ))}
        </div>
        <span className="hint">Notes then point out what works differently from your language.</span>
      </div>
    </section>
  );
}
