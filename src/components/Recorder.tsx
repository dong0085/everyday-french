"use client";
// Record a voice memo (max 3 minutes, low bitrate so it fits the 4 MB upload limit).

import { useEffect, useRef, useState } from "react";

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

export function Recorder({ onRecorded, disabled }: { onRecorded: (blob: Blob, seconds: number) => void; disabled?: boolean }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const started = useRef(0);

  useEffect(() => () => clearInterval(timer.current), []);

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
        setRecording(false);
        const secs = Math.round((Date.now() - started.current) / 1000);
        const type = (r.mimeType || mimeType || "audio/webm").split(";")[0];
        if (chunks.length) onRecorded(new Blob(chunks, { type }), secs);
      };
      rec.current = r;
      started.current = Date.now();
      r.start(1000);
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => {
        const s = Math.round((Date.now() - started.current) / 1000);
        setSeconds(s);
        if (s >= MAX_SECONDS) r.stop();
      }, 500);
    } catch {
      setError("The microphone is not available. Check the browser's permission, or use your keyboard's dictation.");
    }
  };

  return (
    <div className="stack" style={{ gap: 6 }}>
      {recording ? (
        <button type="button" className="btn" onClick={() => rec.current?.stop()}>
          <span className="rec">
            <span className="rec-dot" /> Stop · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} / 3:00
          </span>
        </button>
      ) : (
        <button type="button" className="btn" onClick={start} disabled={disabled}>
          🎙 Record
        </button>
      )}
      {error && <span className="hint">{error}</span>}
    </div>
  );
}
