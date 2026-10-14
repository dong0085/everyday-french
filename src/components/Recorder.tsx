"use client";
// Record a voice memo (max 3 minutes, low bitrate so it fits the 4 MB upload limit), and a small chip
// to play back or remove a kept memo.

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

const MAX_SECONDS = 180;

export function recordingSupported(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

function pickMime(): string | undefined {
  for (const t of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return undefined;
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export function Recorder({ onRecorded, disabled }: { onRecorded: (blob: Blob, seconds: number) => void; disabled?: boolean }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const started = useRef(0);
  const meter = useRef<HTMLSpanElement>(null);
  const cleanup = useRef<() => void>(() => {});

  useEffect(
    () => () => {
      clearInterval(timer.current);
      cleanup.current();
      if (rec.current?.state === "recording") rec.current.stop();
    },
    [],
  );

  /** A live input level (0–1) written to a CSS variable, so the bars move without re-rendering. */
  const startMeter = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return () => {};
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let raf = 0;
      const loop = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        const level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
        meter.current?.style.setProperty("--level", level.toFixed(2));
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => {
        cancelAnimationFrame(raf);
        void ctx.close().catch(() => {});
      };
    } catch {
      return () => {};
    }
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMime();
      const r = new MediaRecorder(stream, { ...(mimeType && { mimeType }), audioBitsPerSecond: 32_000 });
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timer.current);
        cleanup.current();
        cleanup.current = () => {};
        setRecording(false);
        const secs = Math.max(1, Math.round((Date.now() - started.current) / 1000));
        const type = (r.mimeType || mimeType || "audio/webm").split(";")[0];
        if (chunks.length) onRecorded(new Blob(chunks, { type }), secs);
      };
      rec.current = r;
      started.current = Date.now();
      r.start(1000);
      cleanup.current = startMeter(stream);
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - started.current) / 1000);
        setSeconds(s);
        if (s >= MAX_SECONDS && r.state === "recording") r.stop();
      }, 250);
    } catch {
      setError("The microphone isn't available. Allow it in the browser, or use the mic on your keyboard.");
    }
  };

  const left = MAX_SECONDS - seconds;
  return (
    <div className="recorder" data-recording={recording || undefined}>
      <button
        type="button"
        className="rec-btn"
        onClick={() => (recording ? rec.current?.stop() : void start())}
        disabled={disabled && !recording}
        aria-label={recording ? `Stop recording (${clock(seconds)})` : "Record a voice memo"}
      >
        <Icon name={recording ? "stop" : "mic"} size={28} />
      </button>
      <div className="rec-info" aria-live="polite">
        {recording ? (
          <>
            <span className="row">
              <span className="rec-dot" aria-hidden="true" />
              <strong className="rec-time">{clock(seconds)}</strong>
              <span className="hint">/ 3:00 · tap to stop</span>
              <span className="rec-meter" ref={meter} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
            {left <= 15 && <span className="rec-warn">{left} seconds left</span>}
          </>
        ) : (
          <>
            <strong>Record a voice memo</strong>
            <span className="hint">or tap the mic on your keyboard to dictate</span>
          </>
        )}
        {error && <span className="field-error">{error}</span>}
      </div>
    </div>
  );
}

/** A kept voice memo: play it back, see how long it is, remove it. */
export function MemoChip({ url, seconds, onRemove, disabled }: { url: string; seconds: number | null; onRemove?: () => void; disabled?: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = () => {
    if (!audio.current) {
      const a = new Audio(url);
      a.onended = () => setPlaying(false);
      a.onpause = () => setPlaying(false);
      a.onplay = () => setPlaying(true);
      audio.current = a;
    }
    if (audio.current.paused) void audio.current.play().catch(() => setPlaying(false));
    else audio.current.pause();
  };
  return (
    <div className="memo-chip">
      <button type="button" className="icon-btn small" onClick={toggle} aria-label={playing ? "Pause the voice memo" : "Play the voice memo"}>
        <Icon name={playing ? "stop" : "play"} size={16} />
      </button>
      <span>
        Voice memo{seconds ? ` · ${clock(seconds)}` : ""}
      </span>
      {onRemove && (
        <button type="button" className="icon-btn small plain" onClick={onRemove} disabled={disabled} aria-label="Remove the voice memo">
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
