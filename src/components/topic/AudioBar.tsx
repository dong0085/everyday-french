"use client";
// "N lines need audio" bar with the one-tap Generate audio flow (cost preview, progress, errors).

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { addClips } from "../player";
import { api, ApiError, Sheet, Spinner, toast } from "../ui";

type Missing = { text: string; prev: string | null; next: string | null };
type Info = { clips: Record<string, string>; missing: Missing[]; chars: number; tts: { provider: string; model: string; voiceName: string } | null };
type Quota = { concurrency: number; charsLeft: number | null; charLimit?: number; tier?: string };

export function AudioBar({ topicId, version }: { topicId: string; version: number }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [open, setOpen] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [progress, setProgress] = useState<{ done: number; failed: number; total: number } | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const cancelled = useRef(false);

  const load = async () => {
    try {
      const r = await api<Info>(`/api/topics/${topicId}/audio`);
      addClips(r.clips);
      setInfo(r);
    } catch {}
  };
  useEffect(() => {
    let live = true;
    api<Info>(`/api/topics/${topicId}/audio`)
      .then((r) => {
        if (!live) return;
        addClips(r.clips);
        setInfo(r);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [topicId, version]);

  if (!info) return null;
  const n = info.missing.length;

  if (!info.tts)
    return (
      <div className="banner">
        <p className="small">Lines play with your device&apos;s voice. A natural recorded voice is clearer to copy.</p>
        <Link href="/settings#voice" className="btn btn-small">
          Set up natural audio
        </Link>
      </div>
    );
  if (n === 0 && !progress) return null;

  const openSheet = async () => {
    setOpen(true);
    setFatal(null);
    setQuota(null);
    try {
      setQuota(await api<Quota>("/api/audio/quota"));
    } catch (e) {
      setFatal((e as Error).message);
    }
  };

  const run = async () => {
    cancelled.current = false;
    setFatal(null);
    const queue = [...info.missing];
    const total = queue.length;
    let done = 0;
    let failed = 0;
    setProgress({ done, failed, total });
    const worker = async () => {
      while (queue.length && !cancelled.current) {
        const item = queue.shift()!;
        try {
          const r = await api<{ text: string; url?: string }>("/api/audio", { json: item });
          if (r.url) addClips({ [r.text]: r.url });
          done++;
        } catch (e) {
          failed++;
          if (e instanceof ApiError && ["no_credit", "bad_key", "no_key", "too_many"].includes(e.code)) {
            cancelled.current = true;
            setFatal(e.message);
          }
        }
        setProgress({ done, failed, total });
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(quota?.concurrency ?? 2, 6)) }, worker));
    await load();
    setProgress(null);
    if (!cancelled.current) {
      setOpen(false);
      toast(failed ? `Audio ready, ${failed} line${failed > 1 ? "s" : ""} failed — try again for those.` : "Audio ready.");
    }
  };

  const el = info.tts.provider === "elevenlabs";
  const flash = /flash|turbo/.test(info.tts.model);
  const credits = Math.ceil(info.chars * (flash ? 0.5 : 1));
  const usd = info.tts.provider === "openai" ? (info.chars * 0.015) / (14 * 60) : null;
  const tooMuch = el && quota?.charsLeft != null && credits > quota.charsLeft;

  return (
    <>
      <div className="banner">
        <p className="small">
          {n} line{n === 1 ? "" : "s"} without a recording · voice: {info.tts.voiceName}
        </p>
        <button className="btn btn-small btn-primary" onClick={openSheet} data-testid="audio-open">
          Generate audio
        </button>
      </div>
      <Sheet open={open} onClose={() => !progress && setOpen(false)} title="Generate audio">
        <div className="stack">
          <p style={{ margin: 0 }}>
            {n} line{n === 1 ? "" : "s"} · {info.chars.toLocaleString()} characters · {info.tts.voiceName} ({info.tts.model})
          </p>
          {el && (
            <p className="muted small" style={{ margin: 0 }}>
              Uses about {credits.toLocaleString()} ElevenLabs credits{flash ? " (Flash costs half)" : ""}.
              {quota?.charsLeft != null ? ` You have ${quota.charsLeft.toLocaleString()} left this month.` : quota ? "" : " Checking your balance…"}
            </p>
          )}
          {usd !== null && (
            <p className="muted small" style={{ margin: 0 }}>
              About ${usd < 0.01 ? "0.01" : usd.toFixed(2)} of your OpenAI credit (estimate).
            </p>
          )}
          <p className="muted small" style={{ margin: 0 }}>
            Each line is recorded once and kept. Slow speeds reuse the same recording, so they cost nothing extra.
          </p>
          {tooMuch && (
            <div className="error-box">
              <p>That is more than your remaining ElevenLabs characters. Some lines will fail.</p>
            </div>
          )}
          {fatal && (
            <div className="error-box">
              <p>{fatal}</p>
            </div>
          )}
          {progress ? (
            <div className="stack">
              <div className="status-line">
                <Spinner /> {progress.done} of {progress.total} done{progress.failed ? ` · ${progress.failed} failed` : ""}
              </div>
              <div className="progress" aria-hidden="true">
                <span style={{ width: `${((progress.done + progress.failed) / progress.total) * 100}%` }} />
              </div>
              <button className="btn btn-small" onClick={() => (cancelled.current = true)}>
                Stop
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-block" onClick={run} data-testid="audio-run">
              Generate {n} recording{n === 1 ? "" : "s"}
            </button>
          )}
        </div>
      </Sheet>
    </>
  );
}
