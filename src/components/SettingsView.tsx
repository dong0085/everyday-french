"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LEVELS, type Level } from "@/lib/content/schema";
import { formatUsd, provider as providerInfo, providersFor, type Use } from "@/lib/providers/catalog";
import { api, Sheet, Spinner, toast } from "./ui";
import { SetupAI } from "./SetupAI";

type Conn = { provider: string; model: string; keyId?: string | null; voice?: string; voiceName?: string } | null;
type Key = { id: string; provider: string; label: string; baseUrl: string | null; last4: string; createdAt: string; lastUsedAt: string | null };
type Usage = { topicsTokens: number; llmCalls: number; ttsChars: number; ttsClips: number; sttSeconds: number; costUsd: number };

export type SettingsProps = {
  profile: { level: Level; selfGender: "m" | "f" | "x"; explainLang: "en" | "zh"; zhGloss: boolean; llm: Conn; tts: Conn; stt: Conn; email: string | null };
  keys: Key[];
  usage: Usage;
  allowMock: boolean;
};

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "never");

export function SettingsView({ profile, keys: initialKeys, usage, allowMock }: SettingsProps) {
  const router = useRouter();
  const [p, setP] = useState(profile);
  const [keys, setKeys] = useState(initialKeys);
  const [setup, setSetup] = useState<Use | null>(null);
  const [picker, setPicker] = useState<Use | null>(null);

  const patch = async (body: Record<string, unknown>, local: Partial<typeof p>) => {
    const before = p;
    setP((x) => ({ ...x, ...local }));
    try {
      await api("/api/profile", { method: "PATCH", json: body });
      toast("Saved.");
    } catch (e) {
      setP(before);
      toast((e as Error).message);
    }
  };

  const refreshKeys = async () => {
    const r = await api<{ keys: Key[] }>("/api/keys");
    setKeys(r.keys);
    router.refresh();
  };

  // Providers with a saved key for this use (the test-only mock counts while it is the current choice).
  const connected = (use: Use) => {
    const current = use === "text" ? p.llm : use === "speech" ? p.tts : p.stt;
    return providersFor(use, allowMock).filter((pr) => (pr.id === "mock" ? current?.provider === "mock" : keys.some((k) => k.provider === pr.id)));
  };

  return (
    <main className="page">
      <h1>Settings</h1>
      {p.email && <p className="sub">Signed in as {p.email}</p>}

      <section className="settings-section">
        <h2>About you</h2>
        <div className="card stack">
          <div className="field">
            <span className="label">French level</span>
            <div className="seg" role="group" aria-label="Level">
              {LEVELS.map((l) => (
                <button key={l} type="button" aria-pressed={p.level === l} onClick={() => patch({ level: l, setUp: true }, { level: l })}>
                  {l}
                </button>
              ))}
            </div>
            <span className="hint">New topics use this level. Existing topics keep theirs.</span>
          </div>
          <div className="field">
            <span className="label">Sentences about you use</span>
            <div className="seg" role="group" aria-label="Your gender in French">
              {(
                [
                  ["m", "il"],
                  ["f", "elle"],
                  ["x", "Not set"],
                ] as const
              ).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={p.selfGender === k} onClick={() => patch({ selfGender: k, setUp: true }, { selfGender: k })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="label">Explanations in</span>
            <div className="seg" role="group" aria-label="Explanation language">
              {(
                [
                  ["en", "English"],
                  ["zh", "中文"],
                ] as const
              ).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={p.explainLang === k} onClick={() => patch({ explainLang: k }, { explainLang: k })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={p.zhGloss} onChange={(e) => patch({ zhGloss: e.target.checked }, { zhGloss: e.target.checked })} />
            <span>Add a short Chinese meaning (中文) to words and sentences</span>
          </label>
        </div>
      </section>

      <ConnSection
        id="model"
        title="AI model for topics"
        use="text"
        conn={p.llm}
        hasAny={connected("text").length > 0}
        describe={(c) => {
          const m = providerInfo(c.provider)?.textModels?.find((x) => x.id === c.model);
          const cost = m?.price ? ` · about ${formatUsd((30_000 * m.price.in + 9_000 * m.price.out) / 1e6)} per topic` : "";
          return `${providerInfo(c.provider)?.name ?? c.provider} · ${m?.label ?? c.model}${cost}`;
        }}
        onChange={() => setPicker("text")}
        onConnect={() => setSetup("text")}
      />

      <ConnSection
        id="voice"
        title="Voice for recordings"
        use="speech"
        conn={p.tts}
        hasAny={connected("speech").length > 0}
        empty="Lines play with your device's built-in voice."
        describe={(c) => `${providerInfo(c.provider)?.name ?? c.provider} · ${c.voiceName ?? c.voice} · ${c.model}`}
        onChange={() => setPicker("speech")}
        onConnect={() => setSetup("speech")}
      />

      <ConnSection
        id="memos"
        title="Voice memos (speech to text)"
        use="transcribe"
        conn={p.stt}
        hasAny={connected("transcribe").length > 0}
        empty="Use your keyboard's dictation, or connect a service to record memos."
        describe={(c) => `${providerInfo(c.provider)?.name ?? c.provider} · ${c.model}`}
        onChange={() => setPicker("transcribe")}
        onConnect={() => setSetup("transcribe")}
      />

      <section className="settings-section">
        <h2>API keys</h2>
        <div className="card">
          {keys.length === 0 && <p className="muted" style={{ margin: 0 }}>No keys yet.</p>}
          {keys.map((k) => (
            <div className="key-row" key={k.id}>
              <div>
                <strong>{providerInfo(k.provider)?.name ?? k.provider}</strong>
                {k.provider === "custom" && <span className="muted"> · {k.label}</span>}
                <div className="meta">
                  ••••{k.last4} · added {date(k.createdAt)} · last used {date(k.lastUsedAt)}
                </div>
              </div>
              <button
                className="btn btn-small btn-danger"
                onClick={async () => {
                  if (!confirm("Remove this key? Also revoke it on the provider's website if you no longer use it.")) return;
                  try {
                    const r = await api<{ keys: Key[] }>(`/api/keys/${k.id}`, { method: "DELETE" });
                    setKeys(r.keys);
                    router.refresh();
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <p className="hint">Keys are encrypted before they are stored, and only used for requests you make. See Privacy for details.</p>
      </section>

      <section className="settings-section">
        <h2>This month</h2>
        <div className="usage-grid">
          <div className="card">
            <strong>{usage.llmCalls}</strong>
            <span className="meta">AI calls · {Math.round(usage.topicsTokens / 1000)}k tokens</span>
          </div>
          <div className="card">
            <strong>{usage.ttsChars.toLocaleString()}</strong>
            <span className="meta">characters recorded ({usage.ttsClips} lines)</span>
          </div>
          <div className="card">
            <strong>{usage.costUsd > 0 ? formatUsd(usage.costUsd) : "—"}</strong>
            <span className="meta">estimated cost</span>
          </div>
        </div>
        <p className="hint">Estimates. Your provider&apos;s dashboard shows the real amounts.</p>
      </section>

      <DataSection />

      <section className="settings-section">
        <form action="/auth/signout" method="post">
          <button className="btn" type="submit">
            Sign out
          </button>
        </form>
      </section>

      <SetupAI
        open={setup !== null}
        use={setup ?? "text"}
        allowMock={allowMock}
        onClose={() => setSetup(null)}
        onDone={async () => {
          setSetup(null);
          toast("Connected.");
          await refreshKeys();
          location.reload();
        }}
      />
      {picker && (
        <Picker
          use={picker}
          current={picker === "text" ? p.llm : picker === "speech" ? p.tts : p.stt}
          options={connected(picker)}
          keys={keys}
          onClose={() => setPicker(null)}
          onSave={async (conn) => {
            const field = picker === "text" ? "llm" : picker === "speech" ? "tts" : "stt";
            await patch({ [field]: conn }, { [field]: conn } as Partial<typeof p>);
            setPicker(null);
          }}
        />
      )}
    </main>
  );
}

function ConnSection(props: {
  id: string;
  title: string;
  use: Use;
  conn: Conn;
  hasAny: boolean;
  empty?: string;
  describe: (c: NonNullable<Conn>) => string;
  onChange: () => void;
  onConnect: () => void;
}) {
  return (
    <section className="settings-section" id={props.id}>
      <h2>{props.title}</h2>
      <div className="card stack">
        <p style={{ margin: 0 }}>{props.conn ? props.describe(props.conn) : <span className="muted">{props.empty ?? "Not set up yet."}</span>}</p>
        <div className="row">
          {props.hasAny && (
            <button className="btn btn-small" onClick={props.onChange}>
              Change
            </button>
          )}
          <button className={`btn btn-small${props.hasAny ? " btn-ghost" : " btn-primary"}`} onClick={props.onConnect}>
            {props.hasAny ? "Connect another account" : "Connect an account"}
          </button>
        </div>
      </div>
    </section>
  );
}

type Option = ReturnType<typeof providersFor>[number];

function Picker({
  use,
  current,
  options,
  keys,
  onClose,
  onSave,
}: {
  use: Use;
  current: Conn;
  options: Option[];
  keys: Key[];
  onClose: () => void;
  onSave: (conn: Record<string, unknown>) => Promise<void>;
}) {
  // Each connected key is a choice (custom endpoints can have several).
  const choices = options.flatMap((o) =>
    o.id === "mock" ? [{ provider: o, keyId: null as string | null, label: o.name }] : keys.filter((k) => k.provider === o.id).map((k) => ({ provider: o, keyId: k.id, label: o.id === "custom" ? `${o.name} · ${k.label}` : o.name })),
  );
  const initial = choices.find((c) => c.provider.id === current?.provider && (!c.keyId || !current?.keyId || c.keyId === current.keyId)) ?? choices[0];
  const [choice, setChoice] = useState(initial);
  const [model, setModel] = useState(current?.provider === initial?.provider.id ? current?.model ?? "" : "");
  const [voice, setVoice] = useState<{ id: string; name: string } | null>(current?.voice ? { id: current.voice, name: current.voiceName ?? current.voice } : null);
  const [models, setModels] = useState<{ id: string; label: string }[] | null>(null);
  const [voices, setVoices] = useState<{ id: string; name: string; description: string; previewUrl: string | null; french: boolean }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pr = choice?.provider;

  // Load the live model list (text) or the ElevenLabs voices for the chosen account.
  // Fixed lists (mock models, OpenAI voices) come straight from the catalog.
  useEffect(() => {
    if (!pr) return;
    let live = true;
    if (use === "text" && pr.id !== "mock")
      api<{ models: { id: string; label: string }[] }>(`/api/models?provider=${pr.id}${choice.keyId ? `&keyId=${choice.keyId}` : ""}`)
        .then((r) => live && setModels(r.models))
        .catch((e) => {
          if (!live) return;
          setError((e as Error).message);
          setModels(pr.textModels ?? []);
        });
    if (use === "speech" && pr.id === "elevenlabs")
      api<{ voices: NonNullable<typeof voices> }>("/api/voices")
        .then((r) => live && setVoices(r.voices))
        .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);

  const voiceList =
    use === "speech" && pr && pr.id !== "elevenlabs"
      ? (pr.voices ?? []).map((v) => ({ id: v.id, name: v.label, description: "", previewUrl: null, french: false }))
      : voices;

  const modelList = use === "text" ? (pr?.id === "mock" ? pr.textModels : models) : use === "speech" ? pr?.speechModels : pr?.transcribeModels;
  const chosenModel = model || modelList?.[0]?.id || "";

  return (
    <Sheet open onClose={onClose} title={use === "text" ? "AI model" : use === "speech" ? "Voice" : "Speech to text"}>
      <div className="stack">
        <label className="field">
          <span>Account</span>
          <select
            value={choices.indexOf(choice)}
            onChange={(e) => {
              setChoice(choices[Number(e.target.value)]);
              setModel("");
              setVoice(null);
              setModels(null);
              setVoices(null);
              setError(null);
            }}
          >
            {choices.map((c, i) => (
              <option key={i} value={i}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Model</span>
          {modelList ? (
            <select value={chosenModel} onChange={(e) => setModel(e.target.value)}>
              {modelList.map((m) => {
                const tag = "tag" in m ? (m as { tag?: string }).tag : undefined;
                return (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {tag === "recommended" ? " — recommended" : tag === "best" ? " — best quality" : tag === "cheap" ? " — cheapest" : tag === "may-make-mistakes" ? " — may make French mistakes" : ""}
                  </option>
                );
              })}
            </select>
          ) : (
            <span className="status-line">
              <Spinner /> Loading models…
            </span>
          )}
          {use === "text" && choice?.provider.id === "custom" && <span className="hint">Pick a model your endpoint serves.</span>}
        </label>
        {use === "speech" && (
          <div className="field">
            <span>Voice</span>
            {!voiceList ? (
              <span className="status-line">
                <Spinner /> Loading voices…
              </span>
            ) : (
              <div className="stack" style={{ gap: 6, maxHeight: 320, overflowY: "auto" }}>
                {voiceList.map((v) => (
                  <div key={v.id} className="row">
                    <button type="button" className="choice" style={{ flex: 1 }} aria-pressed={voice?.id === v.id} onClick={() => setVoice({ id: v.id, name: v.name })}>
                      <strong>
                        {v.name} {v.french && <span className="badge badge-accent">French</span>}
                      </strong>
                      {v.description && <small>{v.description}</small>}
                    </button>
                    {v.previewUrl && (
                      <button type="button" className="btn btn-small" onClick={() => new Audio(v.previewUrl!).play()} aria-label={`Hear ${v.name}`}>
                        ▶
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
          <div className="error-box">
            <p>{error}</p>
          </div>
        )}
        <button
          className="btn btn-primary"
          disabled={busy || !chosenModel || (use === "speech" && !voice)}
          onClick={async () => {
            setBusy(true);
            await onSave({
              provider: pr.id,
              model: chosenModel,
              keyId: choice.keyId,
              ...(use === "speech" && voice ? { voice: voice.id, voiceName: voice.name } : {}),
            });
            setBusy(false);
          }}
        >
          Save
        </button>
      </div>
    </Sheet>
  );
}

function DataSection() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <section className="settings-section">
      <h2>Your data</h2>
      <div className="card stack">
        <div className="row">
          <a className="btn btn-small" href="/api/export">
            Download all topics (JSON)
          </a>
          <label className="btn btn-small">
            Import topics…
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const r = await api<{ imported: number }>("/api/import", { json: JSON.parse(await f.text()) });
                  toast(`Imported ${r.imported} topic${r.imported === 1 ? "" : "s"}.`);
                  router.push("/");
                } catch (err) {
                  toast(err instanceof SyntaxError ? "That file is not valid JSON." : (err as Error).message);
                }
              }}
            />
          </label>
        </div>
        <div>
          <button
            className="btn btn-small btn-danger"
            disabled={busy}
            onClick={async () => {
              const typed = prompt("This deletes your account, topics, recordings and keys for good. Type DELETE to confirm.");
              if (typed !== "DELETE") return;
              setBusy(true);
              try {
                await api("/api/account", { method: "DELETE" });
                router.push("/");
                router.refresh();
              } catch (err) {
                toast((err as Error).message);
                setBusy(false);
              }
            }}
          >
            Delete my account
          </button>
          <p className="hint">Tip: download your topics first. Also revoke your API keys on each provider&apos;s website.</p>
        </div>
      </div>
    </section>
  );
}
