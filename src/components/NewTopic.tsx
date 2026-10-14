"use client";
// "What happened?" — the create flow: tell → (optional questions) → generate. Also "Save for later".

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { LEVELS, type Level } from "@/lib/content/schema";
import { api, ApiError, Spinner, toast } from "./ui";
import { Recorder, recordingSupported } from "./Recorder";
import { SetupAI } from "./SetupAI";

const noop = () => () => {};

const LEVEL_TEXT: Record<Level, string> = {
  A1: "Just starting: short sentences, present and past",
  A2: "Basic: everyday situations",
  B1: "Intermediate: longer sentences",
  B2: "Upper intermediate: natural French",
};

type Props = {
  setUp: boolean;
  level: Level;
  selfGender: "m" | "f" | "x";
  hasLlm: boolean;
  hasStt: boolean;
  allowMock: boolean;
  capture: { id: string; text: string; audioUrl: string | null } | null;
};

export function NewTopic(props: Props) {
  const router = useRouter();
  const [text, setText] = useState(props.capture?.text ?? "");
  const [level, setLevel] = useState<Level>(props.level);
  const [gender, setGender] = useState(props.selfGender);
  const [hasLlm, setHasLlm] = useState(props.hasLlm);
  const [setupOpen, setSetupOpen] = useState<null | "text" | "transcribe">(null);
  const [pending, setPending] = useState<null | "questions">(null);
  const [questions, setQuestions] = useState<{ question: string; answer: string }[] | null>(null);
  const [busy, setBusy] = useState<null | "generate" | "questions" | "save" | "transcribe">(null);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState<{ blob: Blob; seconds: number } | null>(null);
  const canRecord = useSyncExternalStore(noop, recordingSupported, () => false);

  const enough = text.trim().length >= 10;

  const saveProfile = async () => {
    if (!props.setUp || level !== props.level || gender !== props.selfGender)
      await api("/api/profile", { method: "PATCH", json: { level, selfGender: gender, setUp: true } });
  };

  const transcribe = async (blob: Blob, seconds: number) => {
    setBusy("transcribe");
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, "memo");
      form.append("seconds", String(seconds));
      const r = await api<{ text: string }>("/api/stt", { form });
      setText((t) => (t.trim() ? `${t.trim()}\n${r.text}` : r.text));
      setMemo(null);
    } catch (e) {
      setMemo({ blob, seconds });
      setError(`${(e as Error).message} Your recording is kept: you can save it for later.`);
    } finally {
      setBusy(null);
    }
  };

  const generate = async (answers?: { question: string; answer: string }[]) => {
    if (!hasLlm) {
      setSetupOpen("text");
      return;
    }
    setBusy("generate");
    setError(null);
    try {
      await saveProfile();
      const r = await api<{ id: string }>("/api/topics", { json: { text, answers, captureId: props.capture?.id } });
      router.push(`/topics/${r.id}`);
    } catch (e) {
      setBusy(null);
      if (e instanceof ApiError && e.code === "no_key") setSetupOpen("text");
      else setError((e as Error).message);
    }
  };

  const ask = async () => {
    if (!hasLlm) {
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
        await generate();
        return;
      }
      setQuestions(r.questions.map((q) => ({ question: q, answer: "" })));
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
      const form = new FormData();
      form.append("text", text);
      if (memo) form.append("audio", memo.blob, "memo");
      await api("/api/captures", { form });
      if (props.capture) await api(`/api/captures/${props.capture.id}`, { method: "DELETE" });
      toast("Saved. You'll find it on your topics page.");
      router.push("/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <main className="page">
      <h1>What happened?</h1>
      <p className="sub">Describe it in any language — Chinese, English or French. A few sentences are enough; details make it yours.</p>

      <div className="stack" style={{ marginTop: 16 }}>
        {!props.setUp && (
          <div className="card stack">
            <div className="field">
              <span className="label">Your French level</span>
              <div className="choice-grid">
                {LEVELS.map((l) => (
                  <button key={l} type="button" className="choice" aria-pressed={level === l} onClick={() => setLevel(l)}>
                    <strong>{l}</strong>
                    <small>{LEVEL_TEXT[l]}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">In French, should sentences about you use…</span>
              <div className="seg" role="group" aria-label="Your gender in French">
                {(
                  [
                    ["m", "il (je suis allé)"],
                    ["f", "elle (je suis allée)"],
                    ["x", "Not set"],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={gender === k} onClick={() => setGender(k)}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="hint">French changes some words depending on who is speaking. You can change this in Settings.</span>
            </div>
          </div>
        )}

        {props.capture?.audioUrl && (
          <div className="card stack">
            <span className="label">Your saved voice memo</span>
            <audio controls src={props.capture.audioUrl} style={{ width: "100%" }} />
            {props.hasStt && (
              <button
                type="button"
                className="btn btn-small"
                disabled={busy !== null}
                onClick={async () => {
                  setBusy("transcribe");
                  setError(null);
                  try {
                    const r = await api<{ text: string }>(`/api/captures/${props.capture!.id}/transcribe`, { json: {} });
                    setText((t) => (t.trim() ? `${t.trim()}\n${r.text}` : r.text));
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Turn it into text
              </button>
            )}
          </div>
        )}

        <label className="field">
          <span className="visually-hidden">What happened</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={8000}
            rows={7}
            placeholder="e.g. Today I went to look at a used Peugeot 208. The seller let me drive it, I asked about the contrôle technique, and we agreed on 9 500 €."
            autoFocus={!props.capture}
          />
          <span className="hint">Tip: use the microphone on your phone&apos;s keyboard to dictate.</span>
        </label>

        <div className="row">
          {canRecord &&
            (props.hasStt ? (
              <Recorder disabled={busy !== null} onRecorded={(blob, secs) => transcribe(blob, secs)} />
            ) : (
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setSetupOpen("transcribe")}>
                🎙 Set up voice memos
              </button>
            ))}
          {busy === "transcribe" && (
            <span className="status-line">
              <Spinner /> Turning your memo into text…
            </span>
          )}
        </div>

        {questions && (
          <div className="card stack">
            <strong>A few questions (answer any, skip the rest)</strong>
            {questions.map((q, i) => (
              <label className="field" key={i}>
                <span className="small">{q.question}</span>
                <input type="text" value={q.answer} onChange={(e) => setQuestions((qs) => qs!.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
              </label>
            ))}
          </div>
        )}

        {error && (
          <div className="error-box">
            <p>{error}</p>
          </div>
        )}

        <div className="stack">
          <button className="btn btn-primary btn-block" disabled={!enough || busy !== null} onClick={() => generate(questions ?? undefined)} data-testid="generate">
            {busy === "generate" ? (
              <>
                <Spinner /> Starting…
              </>
            ) : (
              "Make my topic"
            )}
          </button>
          <div className="row" style={{ justifyContent: "space-between" }}>
            {!questions && (
              <button className="btn btn-ghost btn-small" disabled={!enough || busy !== null} onClick={ask}>
                {busy === "questions" ? (
                  <>
                    <Spinner /> Thinking…
                  </>
                ) : (
                  "Ask me questions first"
                )}
              </button>
            )}
            <button className="btn btn-ghost btn-small" disabled={(!text.trim() && !memo) || busy !== null} onClick={saveForLater}>
              Save for later
            </button>
          </div>
          <p className="hint">“Save for later” keeps your note (and voice memo) without using any AI, so you can make the topic when you have time.</p>
        </div>
      </div>

      <SetupAI
        open={setupOpen !== null}
        use={setupOpen ?? "text"}
        allowMock={props.allowMock}
        onClose={() => setSetupOpen(null)}
        onDone={() => {
          const was = setupOpen;
          setSetupOpen(null);
          router.refresh();
          if (was === "text") {
            setHasLlm(true);
            toast("Connected. Writing your topic…");
            if (pending === "questions") {
              setPending(null);
              setTimeout(() => void ask(), 0);
            } else if (enough) setTimeout(() => void generateAfterSetup(), 0);
          } else toast("Voice memos are ready.");
        }}
      />
    </main>
  );

  async function generateAfterSetup() {
    setBusy("generate");
    try {
      await saveProfile();
      const r = await api<{ id: string }>("/api/topics", { json: { text, answers: questions ?? undefined, captureId: props.capture?.id } });
      router.push(`/topics/${r.id}`);
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }
}
