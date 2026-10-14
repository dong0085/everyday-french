"use client";
// "Change" sheet: which connected service, which model, and (natural voice) which voice.

import { useEffect, useRef, useState } from "react";
import { providersFor, TAG_LABEL, topicCostUsd, type Use } from "@/lib/providers/catalog";
import { approx } from "@/lib/format";
import { api, Sheet, Spinner } from "../ui";
import { stop } from "../player";
import { Icon } from "../Icon";
import type { Conn, Key } from "./shared";

type Option = ReturnType<typeof providersFor>[number];
type Model = { id: string; label: string; tag?: string };
type Voice = { id: string; name: string; description: string; previewUrl: string | null; french: boolean };

const TITLE: Record<Use, string> = { text: "Writing topics", speech: "Natural voice", transcribe: "Voice memos" };

export function Picker({
  use,
  current,
  options,
  keys,
  onClose,
  onSave,
  onConnectOther,
}: {
  use: Use;
  current: Conn;
  options: Option[];
  keys: Key[];
  onClose: () => void;
  onSave: (conn: Record<string, unknown>) => Promise<boolean>;
  onConnectOther: () => void;
}) {
  // Each connected key is a choice (custom endpoints can have several).
  const choices = options.flatMap((o) =>
    o.id === "mock"
      ? [{ provider: o, keyId: null as string | null, label: o.name }]
      : keys.filter((k) => k.provider === o.id).map((k) => ({ provider: o, keyId: k.id, label: o.id === "custom" ? `${o.name} · ${k.label}` : `${o.name} ••••${k.last4}` })),
  );
  const initial = choices.find((c) => c.provider.id === current?.provider && (!c.keyId || !current?.keyId || c.keyId === current.keyId)) ?? choices[0];
  const [choice, setChoice] = useState(initial);
  const [model, setModel] = useState(current?.provider === initial?.provider.id ? (current?.model ?? "") : "");
  const [voice, setVoice] = useState<{ id: string; name: string } | null>(current?.voice ? { id: current.voice, name: current.voiceName ?? current.voice } : null);
  const [models, setModels] = useState<Model[] | null>(null);
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const preview = useRef<HTMLAudioElement | null>(null);
  const pr = choice?.provider;

  // Load the live model list (text) or the ElevenLabs voices for the chosen key.
  // Fixed lists (mock models, OpenAI voices) come straight from the catalog.
  useEffect(() => {
    if (!pr) return;
    let live = true;
    if (use === "text" && pr.id !== "mock")
      api<{ models: Model[] }>(`/api/models?provider=${pr.id}${choice.keyId ? `&keyId=${choice.keyId}` : ""}`)
        .then((r) => live && setModels(r.models))
        .catch((e) => {
          if (!live) return;
          setError((e as Error).message);
          setModels(pr.textModels ?? []);
        });
    if (use === "speech" && pr.id === "elevenlabs")
      api<{ voices: Voice[] }>("/api/voices")
        .then((r) => live && setVoices(r.voices))
        .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);

  // Stop a voice sample when the sheet closes.
  useEffect(() => () => preview.current?.pause(), []);

  const voiceList: Voice[] | null =
    use === "speech" && pr && pr.id !== "elevenlabs" ? (pr.voices ?? []).map((v) => ({ id: v.id, name: v.label, description: "", previewUrl: null, french: false })) : voices;

  const rawModels: Model[] | null | undefined = use === "text" ? (pr?.id === "mock" ? pr.textModels : models) : use === "speech" ? pr?.speechModels : pr?.transcribeModels;
  // Live lists don't carry tags: take them from the catalog.
  const modelList = rawModels?.map((m) => ({ ...m, tag: m.tag ?? pr?.textModels?.find((x) => x.id === m.id)?.tag }));
  const chosenModel = model || modelList?.find((m) => m.tag === "recommended")?.id || modelList?.[0]?.id || "";
  const needle = filter.trim().toLowerCase();
  const shownModels = modelList?.filter((m) => !needle || `${m.label} ${m.id}`.toLowerCase().includes(needle) || m.id === chosenModel);

  const playSample = (v: Voice) => {
    if (!v.previewUrl) return;
    const a = (preview.current ??= new Audio());
    if (previewing === v.id) {
      a.pause();
      setPreviewing(null);
      return;
    }
    stop(); // one sound at a time: stop any line that is playing
    a.src = v.previewUrl;
    a.onended = () => setPreviewing(null);
    a.onerror = () => setPreviewing(null);
    setPreviewing(v.id);
    a.play().catch(() => setPreviewing(null));
  };

  const save = async () => {
    if (!pr) return;
    setBusy(true);
    preview.current?.pause();
    const ok = await onSave({
      provider: pr.id,
      model: chosenModel,
      keyId: choice.keyId,
      ...(use === "speech" && voice ? { voice: voice.id, voiceName: voice.name } : {}),
    });
    if (!ok) setBusy(false);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={TITLE[use]}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={busy || !chosenModel || (use === "speech" && !voice)} onClick={save}>
            {busy ? <Spinner /> : null} Save
          </button>
        </>
      }
    >
      <div className="stack picker">
        {choices.length > 1 ? (
          <div className="field" role="group" aria-labelledby="pick-service">
            <span id="pick-service">Service</span>
            <div className="radio-list">
              {choices.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={c === choice}
                  onClick={() => {
                    if (c === choice) return;
                    setChoice(c);
                    setModel("");
                    setVoice(null);
                    setModels(null);
                    setVoices(null);
                    setFilter("");
                    setError(null);
                  }}
                >
                  <strong>{c.label}</strong>
                  {c.provider.blurb && <small>{c.provider.blurb}</small>}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="m-0 small">
            <span className="muted">Service:</span> <strong>{choice?.label}</strong>
          </p>
        )}

        <div className="field" role="group" aria-labelledby="pick-model">
          <span id="pick-model">Model</span>
          {!shownModels ? (
            <span className="status-line">
              <Spinner /> Loading models…
            </span>
          ) : (
            <>
              {(modelList?.length ?? 0) > 10 && (
                <input type="search" placeholder="Search models" aria-label="Search models" value={filter} onChange={(e) => setFilter(e.target.value)} />
              )}
              <div className="radio-list picker-list">
                {shownModels.map((m) => {
                  const cost = use === "text" && pr ? topicCostUsd(pr.id, m.id) : null;
                  return (
                    <button key={m.id} type="button" aria-pressed={chosenModel === m.id} onClick={() => setModel(m.id)}>
                      <strong>{m.label}</strong>
                      <small className="picker-tags">
                        {m.tag && <span className={`badge${m.tag === "recommended" ? " badge-accent" : m.tag === "may-make-mistakes" ? " badge-warn" : ""}`}>{TAG_LABEL[m.tag] ?? m.tag}</span>}
                        {cost !== null && <span>≈ {approx(cost)} per topic</span>}
                        {use === "text" && cost === null && m.id !== m.label && <span className="ellipsis">{m.id}</span>}
                      </small>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {use === "text" && pr?.id === "custom" && <span className="hint">Pick a model your endpoint serves.</span>}
        </div>

        {use === "speech" && (
          <div className="field" role="group" aria-labelledby="pick-voice">
            <span id="pick-voice">Voice</span>
            {!voiceList ? (
              <span className="status-line">
                <Spinner /> Loading voices…
              </span>
            ) : (
              <div className="picker-list stack-sm">
                {voiceList.map((v) => (
                  <div key={v.id} className="voice-choice">
                    <div className="radio-list grow">
                      <button type="button" aria-pressed={voice?.id === v.id} onClick={() => setVoice({ id: v.id, name: v.name })}>
                        <strong>
                          {v.name} {v.french && <span className="badge badge-accent">French</span>}
                        </strong>
                        {v.description && <small>{v.description}</small>}
                      </button>
                    </div>
                    {v.previewUrl && (
                      <button
                        type="button"
                        className={`icon-btn${previewing === v.id ? " busy" : ""}`}
                        onClick={() => playSample(v)}
                        aria-label={previewing === v.id ? `Stop ${v.name}` : `Hear ${v.name}`}
                      >
                        <Icon name={previewing === v.id ? "stop" : "play"} size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <span className="hint">Changing the voice keeps old recordings; new lines use the new voice.</span>
          </div>
        )}

        {error && (
          <div className="error-box" role="alert">
            <p>{error}</p>
          </div>
        )}

        <button type="button" className="linklike self-start small" onClick={onConnectOther}>
          Connect another service
        </button>
      </div>
    </Sheet>
  );
}
