"use client";
// "Connect an AI account" sheet: one recommended provider with a step-by-step guide,
// the others behind "Other providers". Used at the first Generate and in Settings.

import { useMemo, useState } from "react";
import { RECOMMENDED_TEXT_PROVIDER, formatUsd, providersFor, topicCostUsd, type Provider, type Use } from "@/lib/providers/catalog";
import { api, Sheet, Spinner } from "./ui";

const USE_TITLE: Record<Use, string> = {
  text: "Connect an AI account",
  speech: "Connect a voice service",
  transcribe: "Connect speech-to-text",
};
const USE_WHY: Record<Use, string> = {
  text: "Everyday French is free. Topics are written by an AI model using your own account, so you only pay the AI company directly — usually a cent or less per topic, and some providers have a free tier.",
  speech: "Natural recordings are made with your own voice-service account. Each line is recorded once and kept, so you pay only once per line.",
  transcribe: "Voice memos are turned into text with your own account. A one-minute memo costs well under a cent.",
};

export function SetupAI({
  open,
  use,
  onClose,
  onDone,
  allowMock,
}: {
  open: boolean;
  use: Use;
  onClose: () => void;
  onDone: () => void;
  allowMock?: boolean;
}) {
  const options = useMemo(() => providersFor(use, allowMock), [use, allowMock]);
  const recommended = use === "text" ? RECOMMENDED_TEXT_PROVIDER : use === "speech" ? "elevenlabs" : "openai";
  const [pick, setPick] = useState<string>(recommended);
  const [showOthers, setShowOthers] = useState(false);
  const p = options.find((x) => x.id === pick) ?? options[0];

  return (
    <Sheet open={open} onClose={onClose} title={USE_TITLE[use]}>
      <p className="muted small">{USE_WHY[use]}</p>
      <ProviderForm key={p.id} provider={p} use={use} recommended={p.id === recommended} onDone={onDone} />
      <div style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-ghost btn-small" aria-expanded={showOthers} onClick={() => setShowOthers((s) => !s)}>
          {showOthers ? "Hide other providers ▴" : "Other providers ▾"}
        </button>
        {showOthers && (
          <div className="choice-grid" style={{ marginTop: 8 }}>
            {options.map((o) => (
              <button key={o.id} type="button" className="choice" aria-pressed={o.id === p.id} onClick={() => setPick(o.id)}>
                <strong>{o.name}</strong>
                {o.id === recommended && <small>Recommended</small>}
                {o.id === "custom" && <small>Advanced</small>}
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

export function ProviderForm({ provider: p, use, recommended, onDone }: { provider: Provider; use: Use; recommended?: boolean; onDone: () => void }) {
  const [key, setKey] = useState(p.id === "mock" ? "mock-key-for-tests" : "");
  const [baseUrl, setBaseUrl] = useState("");
  const [schema, setSchema] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const model = p.textModels?.find((m) => m.tag === "recommended") ?? p.textModels?.[0];
  const cost = use === "text" && model ? topicCostUsd(p.id, model.id) : null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (p.id === "mock") {
        // Test-only provider: no key to check, just set it as the default.
        const conn = { provider: "mock", model: "mock-model" };
        await api("/api/profile", {
          method: "PATCH",
          json: use === "text" ? { llm: conn } : use === "speech" ? { tts: { ...conn, model: "mock-tts", voice: "mock-voice", voiceName: "Mock voice" } } : { stt: { ...conn, model: "mock-stt" } },
        });
      } else {
        await api("/api/keys", { json: { provider: p.id, key: key.trim(), baseUrl: p.id === "custom" ? baseUrl.trim() : undefined, supportsJsonSchema: schema } });
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={save} style={{ marginTop: 12 }}>
      <div className="spread">
        <strong>{p.name}</strong>
        {recommended && <span className="badge badge-accent">Recommended</span>}
      </div>
      {p.note && <p className="muted small" style={{ margin: 0 }}>{p.note}</p>}
      {cost !== null && model && (
        <p className="small" style={{ margin: 0 }}>
          With {model.label}: about {formatUsd(cost)} per topic (estimate).
        </p>
      )}
      {p.guide && (
        <ol className="guide small">
          {p.guide.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ol>
      )}
      {p.keyUrl && (
        <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-small" style={{ justifySelf: "start" }}>
          Open {p.name} ↗
        </a>
      )}
      {p.id === "custom" && (
        <>
          <label className="field">
            <span>Base URL</span>
            <input type="url" inputMode="url" placeholder="https://api.example.com/v1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required />
          </label>
          <label className="checkbox small">
            <input type="checkbox" checked={schema} onChange={(e) => setSchema(e.target.checked)} />
            <span>This endpoint supports JSON-schema structured output (leave off if unsure)</span>
          </label>
        </>
      )}
      {p.id !== "mock" && (
        <label className="field">
          <span>API key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={p.keyHint ? `Starts with ${p.keyHint}` : "Paste your key"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
          />
          <span className="hint">Stored encrypted. Only used to make requests you ask for. Tip: set a monthly spending limit with the provider.</span>
        </label>
      )}
      {error && (
        <div className="error-box">
          <p>{error}</p>
        </div>
      )}
      <button className="btn btn-primary" type="submit" disabled={busy || (p.id !== "mock" && key.trim().length < 8)}>
        {busy ? (
          <>
            <Spinner /> Checking the key…
          </>
        ) : p.id === "mock" ? (
          "Use mock provider"
        ) : (
          "Check and save"
        )}
      </button>
    </form>
  );
}


