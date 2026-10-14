"use client";
// "Connect an AI service" sheet: one recommended service with a step-by-step guide, the others
// one tap away. Used at the first Generate (NewTopic) and in Settings.
// Contract: onDone() is called once a key is saved; onClose() when they leave without connecting.
// From Settings a success panel shows what was set up (onDone after Done, or closing the sheet from it).
// While making a topic there is no extra step: onDone() runs right away, so writing starts.

import { useEffect, useRef, useState } from "react";
import {
  RECOMMENDED_TEXT_PROVIDER,
  defaultTextModel,
  provider as providerInfo,
  providersFor,
  topicCostUsd,
  type Provider,
  type Use,
} from "@/lib/providers/catalog";
import { approx } from "@/lib/format";
import { api, Sheet, Spinner, Switch } from "./ui";
import { Icon } from "./Icon";

type Conn = { provider: string; model: string; voice?: string; voiceName?: string };
export type SetupDefaults = { llm?: Conn; tts?: Conn; stt?: Conn };

const USE_TITLE: Record<Use, string> = {
  text: "Connect an AI service",
  speech: "Connect a natural voice",
  transcribe: "Connect voice memos",
};
const USE_LABEL: Record<Use, string> = { text: "Topics", speech: "Natural voice", transcribe: "Voice memos" };
const RECOMMENDED: Record<Use, string> = { text: RECOMMENDED_TEXT_PROVIDER, speech: "elevenlabs", transcribe: "openai" };

function lead(use: Use, fromCreate: boolean) {
  if (use === "text")
    return `Everyday French has no AI of its own. Connect your own AI service once — it takes about 2 minutes.${fromCreate ? " Your story is saved." : ""}`;
  if (use === "speech") return "Natural voices come from your own voice service. Each line is recorded once and kept. Without one, lines play with your device's voice (free).";
  return "Voice memos are turned into text by your own service. A one-minute memo costs well under one cent.";
}

export function SetupAI({
  open,
  use,
  onClose,
  onDone,
  allowMock,
  from = "create",
  chooseUse = false,
}: {
  open: boolean;
  use: Use;
  onClose: () => void;
  onDone: () => void;
  allowMock?: boolean;
  /** "create": the person is in the middle of making a topic (the lead says their story is saved). */
  from?: "create" | "settings";
  /** Show a switch between topics / natural voice / voice memos at the top. */
  chooseUse?: boolean;
}) {
  // Done state lives here so closing the sheet from the success panel still counts as done.
  const [connected, setConnected] = useState(false);
  const close = (was = connected) => {
    setConnected(false);
    if (was) onDone();
    else onClose();
  };
  return (
    <Sheet open={open} onClose={() => close()} title={chooseUse ? "Connect an AI service" : USE_TITLE[use]}>
      {/* The body unmounts when the sheet closes, so every open starts fresh. */}
      <SetupBody initialUse={use} allowMock={allowMock} fromCreate={from === "create"} chooseUse={chooseUse} onConnected={() => setConnected(true)} onDone={() => close(true)} />
    </Sheet>
  );
}

function SetupBody({
  initialUse,
  allowMock,
  fromCreate,
  chooseUse,
  onConnected,
  onDone,
}: {
  initialUse: Use;
  allowMock?: boolean;
  fromCreate: boolean;
  chooseUse: boolean;
  onConnected: () => void;
  onDone: () => void;
}) {
  const [use, setUse] = useState<Use>(initialUse);
  const options = providersFor(use, allowMock);
  const recommended = RECOMMENDED[use];
  const [pick, setPick] = useState<string>(recommended);
  const [showOthers, setShowOthers] = useState(false);
  const [done, setDone] = useState<{ provider: Provider; defaults: SetupDefaults } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const p = options.find((x) => x.id === pick) ?? options.find((x) => x.id === recommended) ?? options[0];

  const choose = (id: string) => {
    setPick(id);
    setShowOthers(false);
    // The form is right below the list: bring it into view and put the cursor in the key field.
    requestAnimationFrame(() => {
      const form = formRef.current;
      if (!form) return;
      form.scrollIntoView({ block: "nearest", behavior: "smooth" });
      form.querySelector<HTMLElement>("input:not([type=checkbox]), button[type=submit]")?.focus({ preventScroll: true });
    });
  };

  if (done) return <Success provider={done.provider} defaults={done.defaults} onDone={onDone} />;

  return (
    <div className="setup stack">
      <p className="muted m-0">{lead(use, fromCreate)}</p>

      {chooseUse && (
        <div className="field">
          <span className="label" id="setup-use">
            What for?
          </span>
          <div className="seg fill" role="group" aria-labelledby="setup-use">
            {(["text", "speech", "transcribe"] as Use[]).map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={use === u}
                onClick={() => {
                  setUse(u);
                  setPick(RECOMMENDED[u]);
                  setShowOthers(false);
                }}
              >
                {USE_LABEL[u]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="setup-using">
        <span className="muted small">Service</span>
        <strong className="grow">{p.name}</strong>
        <button type="button" className="btn btn-ghost btn-small" aria-expanded={showOthers} aria-controls="setup-providers" onClick={() => setShowOthers((s) => !s)}>
          {showOthers ? "Hide list" : "Other providers"}
          <Icon name={showOthers ? "chevron-down" : "chevron-right"} size={16} />
        </button>
      </div>

      {showOthers && (
        <div className="radio-list provider-list" id="setup-providers" role="group" aria-label="AI services">
          {options.map((o) => (
            <ProviderRow key={o.id} p={o} use={use} recommended={o.id === recommended} selected={o.id === p.id} onPick={() => choose(o.id)} />
          ))}
        </div>
      )}

      <div ref={formRef}>
        <ProviderForm
          key={`${use}-${p.id}`}
          provider={p}
          use={use}
          recommended={p.id === recommended}
          onSwitch={(id) => choose(id)}
          onSaved={(defaults) => {
            if (fromCreate) return onDone();
            setDone({ provider: p, defaults });
            onConnected();
          }}
        />
      </div>
    </div>
  );
}

function costLine(p: Provider, use: Use): string | null {
  if (use !== "text") return p.freeTier ? "Free plan available." : null;
  const m = defaultTextModel(p);
  const cost = m ? topicCostUsd(p.id, m.id) : null;
  if (p.id === "mock") return "No cost.";
  if (p.freeTier) return cost !== null ? `Free tier: no cost. Paid: about ${approx(cost)} per topic.` : "Free tier: no cost.";
  return cost !== null ? `About ${approx(cost)} per topic (estimate).` : null;
}

function rowCost(p: Provider, use: Use): string | null {
  if (use !== "text" || p.id === "mock") return null;
  const m = defaultTextModel(p);
  const cost = m ? topicCostUsd(p.id, m.id) : null;
  if (cost === null) return null;
  return p.freeTier ? `Paid plan: about ${approx(cost)} per topic` : `About ${approx(cost)} per topic`;
}

function ProviderRow({ p, use, recommended, selected, onPick }: { p: Provider; use: Use; recommended: boolean; selected: boolean; onPick: () => void }) {
  const cost = rowCost(p, use);
  return (
    <button type="button" aria-pressed={selected} onClick={onPick}>
      <strong>
        {p.name} {recommended && <span className="badge badge-accent">Recommended</span>}
      </strong>
      <small>
        {p.blurb}
        {cost && <span className="provider-cost">{cost}</span>}
      </small>
    </button>
  );
}

export function ProviderForm({
  provider: p,
  use,
  recommended,
  onSaved,
  onSwitch,
}: {
  provider: Provider;
  use: Use;
  recommended?: boolean;
  onSaved: (defaults: SetupDefaults) => void;
  onSwitch?: (providerId: string) => void;
}) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [schema, setSchema] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cost = costLine(p, use);
  const trimmed = key.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 8;
  const canPaste = typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";
  const isMock = p.id === "mock";
  const haikuCost = topicCostUsd("anthropic", "claude-haiku-5-5");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isMock) {
        // Test-only provider: no key to check, just set it as the default.
        const conn = { provider: "mock", model: "mock-model" };
        const defaults: SetupDefaults =
          use === "text" ? { llm: conn } : use === "speech" ? { tts: { ...conn, model: "mock-tts", voice: "mock-voice", voiceName: "Mock voice" } } : { stt: { ...conn, model: "mock-stt" } };
        await api("/api/profile", { method: "PATCH", json: defaults });
        onSaved(defaults);
      } else {
        const r = await api<{ defaults?: SetupDefaults }>("/api/keys", {
          json: { provider: p.id, key: trimmed, baseUrl: p.id === "custom" ? baseUrl.trim() : undefined, supportsJsonSchema: schema },
        });
        onSaved(r.defaults ?? {});
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) setKey(text);
      else setError("Nothing to paste. Copy the key first.");
    } catch {
      setError("Couldn't read the clipboard. Long-press the field and choose Paste.");
    }
  };

  return (
    <form className="card stack setup-form" onSubmit={save}>
      <div className="spread">
        <strong>{p.name}</strong>
        {recommended && <span className="badge badge-accent">Recommended</span>}
      </div>
      {p.note && <p className="muted small m-0">{p.note}</p>}
      {cost && <p className="small m-0">{cost}</p>}

      {p.id === "google" && use === "text" && (
        <div className="callout setup-tradeoff">
          <p className="small">
            On the free tier, Google may use your prompts to improve its products. Your stories are personal: if you prefer, Claude Haiku costs about{" "}
            {haikuCost !== null ? approx(haikuCost) : "$0.01"} per topic and is not used for training.
          </p>
          {onSwitch && (
            <button type="button" className="btn btn-small" onClick={() => onSwitch("anthropic")}>
              Use Claude instead
            </button>
          )}
        </div>
      )}

      {p.guide && (
        <ol className="guide small">
          {p.guide.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ol>
      )}
      {p.keyUrl && (
        <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-small self-start">
          Open {p.keySite ?? p.name}
          <Icon name="external" size={16} />
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      )}

      {p.id === "custom" && (
        <>
          <label className="field">
            <span>Base URL</span>
            <input type="url" inputMode="url" placeholder="https://api.example.com/v1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required />
          </label>
          <Switch checked={schema} onChange={setSchema} label="Supports JSON-schema output" hint="Leave off if you are not sure." />
        </>
      )}

      {!isMock && (
        <div className="field">
          <label htmlFor={`key-${p.id}`}>
            <span className="label">API key</span>
          </label>
          <div className="input-with-actions">
            <input
              id={`key-${p.id}`}
              type={show ? "text" : "password"}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="done"
              placeholder={p.keyHint ? `Starts with ${p.keyHint}` : "Paste your key"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                setKey(e.clipboardData.getData("text").trim());
              }}
              aria-describedby={`key-hint-${p.id}`}
              aria-invalid={tooShort || undefined}
              required
            />
            {canPaste && (
              <button type="button" className="btn btn-small" onClick={paste}>
                <Icon name="clipboard" size={16} /> <span className="btn-label">Paste</span>
              </button>
            )}
            <button type="button" className="btn btn-small" aria-pressed={show} onClick={() => setShow((s) => !s)}>
              <Icon name={show ? "eye-off" : "eye"} size={16} /> <span className="btn-label">{show ? "Hide" : "Show"}</span>
            </button>
          </div>
          <span className={tooShort ? "field-error" : "hint"} id={`key-hint-${p.id}`}>
            {tooShort ? "This looks too short. Keys are usually 30 or more characters — check you copied all of it." : "Tip: set a monthly spending limit on the service's website."}
          </span>
        </div>
      )}

      {error && (
        <div className="error-box" role="alert">
          <p>{error}</p>
        </div>
      )}
      <button className="btn btn-primary" type="submit" disabled={busy || (!isMock && trimmed.length < 8)}>
        {busy ? (
          <>
            <Spinner /> Checking the key…
          </>
        ) : isMock ? (
          "Use mock provider"
        ) : (
          "Check key and continue"
        )}
      </button>
      {!isMock && (
        <p className="hint m-0 setup-lock">
          <Icon name="lock" size={16} /> Stored encrypted, used only for what you ask. <a href="/privacy#keys">How keys are stored</a>
        </p>
      )}
    </form>
  );
}

function Success({ provider: p, defaults, onDone }: { provider: Provider; defaults: SetupDefaults; onDone: () => void }) {
  const doneRef = useRef<HTMLButtonElement>(null);
  useEffect(() => doneRef.current?.focus(), []);
  const rows: [string, string][] = [];
  const name = (id: string) => providerInfo(id)?.name ?? id;
  if (defaults.llm) {
    const m = providerInfo(defaults.llm.provider)?.textModels?.find((x) => x.id === defaults.llm!.model);
    const cost = topicCostUsd(defaults.llm.provider, defaults.llm.model);
    rows.push(["Writing topics", `${name(defaults.llm.provider)} · ${m?.label ?? defaults.llm.model}${cost !== null ? ` · about ${approx(cost)} per topic` : ""}`]);
  }
  if (defaults.tts) rows.push(["Natural voice", `${name(defaults.tts.provider)} · ${defaults.tts.voiceName ?? defaults.tts.voice ?? defaults.tts.model}`]);
  if (defaults.stt) {
    const m = [...(providerInfo(defaults.stt.provider)?.transcribeModels ?? [])].find((x) => x.id === defaults.stt!.model);
    rows.push(["Voice memos", `${name(defaults.stt.provider)} · ${m?.label ?? defaults.stt.model}`]);
  }
  return (
    <div className="stack setup-success" role="status">
      <div className="setup-done-mark" aria-hidden="true">
        <Icon name="check" size={28} />
      </div>
      <p className="setup-done-title" lang="fr">
        C&apos;est fait !
      </p>
      <p className="m-0">
        <strong>{p.name}</strong> is connected.
      </p>
      {rows.length > 0 ? (
        <>
          <p className="muted small m-0">We also set it up for:</p>
          <ul className="setup-defaults">
            {rows.map(([k, v]) => (
              <li key={k}>
                <span className="muted">{k}</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
          {defaults.tts && <p className="hint m-0">New lines can now be recorded with this voice, which uses your account. Lines you already have keep their audio.</p>}
          <p className="hint m-0">You can change these any time in Settings → AI services.</p>
        </>
      ) : (
        <p className="muted small m-0">Your current choices did not change. To use this key, choose it in Settings → AI services.</p>
      )}
      <button
        ref={doneRef}
        type="button"
        className="btn btn-primary btn-block"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
}
