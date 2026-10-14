"use client";

import type { Use } from "@/lib/providers/catalog";
import { Icon } from "../Icon";
import { describeMemos, describeSpeech, describeText, Group, providerName, SavedTick, shortDate, usesKey, type Conn, type Key, type Profile } from "./shared";

const USED_FOR: [keyof Pick<Profile, "llm" | "tts" | "stt">, string][] = [
  ["llm", "topics"],
  ["tts", "natural voice"],
  ["stt", "voice memos"],
];

export function ServicesGroup({
  p,
  keys,
  canChange,
  onConnect,
  onChange,
  onRemove,
  saved,
}: {
  saved: string | null;
  p: Profile;
  keys: Key[];
  canChange: (use: Use) => boolean;
  onConnect: (use: Use | null) => void;
  onChange: (use: Use) => void;
  onRemove: (k: Key) => void;
}) {
  return (
    <Group id="ai" title="AI services" hint="You bring your own AI service and pay it directly. Everyday French itself is free.">
      <ServiceRow
        id="model"
        title="Writing topics"
        conn={p.llm}
        main={p.llm ? describeText(p.llm).main : null}
        sub={p.llm ? describeText(p.llm).cost : null}
        empty="Not connected — needed to write new topics"
        use="text"
        saved={saved === "llm"}
        canChange={canChange("text")}
        onConnect={onConnect}
        onChange={onChange}
      />
      <ServiceRow
        id="voice"
        title="Natural voice"
        conn={p.tts}
        main={p.tts ? describeSpeech(p.tts).main : null}
        sub={p.tts ? describeSpeech(p.tts).model : null}
        empty="Not connected — lines use your device voice (free)"
        use="speech"
        saved={saved === "tts"}
        canChange={canChange("speech")}
        onConnect={onConnect}
        onChange={onChange}
      />
      <ServiceRow
        id="memos"
        title="Voice memos"
        conn={p.stt}
        main={p.stt ? describeMemos(p.stt).main : null}
        sub={null}
        empty="Not connected — use your keyboard's dictation"
        use="transcribe"
        saved={saved === "stt"}
        canChange={canChange("transcribe")}
        onConnect={onConnect}
        onChange={onChange}
      />

      <div className="setting">
        <span className="label">Connected keys</span>
        {keys.length === 0 ? (
          <p className="muted small m-0">No keys yet.</p>
        ) : (
          <ul className="key-list">
            {keys.map((k) => {
              const used = USED_FOR.filter(([f]) => usesKey(p[f], k)).map(([, label]) => label);
              return (
                <li key={k.id} className="key-row">
                  <div className="grow">
                    <strong>{providerName(k.provider)}</strong>
                    {k.provider === "custom" && <span className="muted"> · {k.label}</span>}
                    <span className="muted"> ••••{k.last4}</span>
                    <div className="key-uses">
                      {used.length ? (
                        <span className="badge badge-ok">Used for: {used.join(", ")}</span>
                      ) : (
                        <span className="badge">Not used right now</span>
                      )}
                    </div>
                    <div className="meta" suppressHydrationWarning>
                      Added {shortDate(k.createdAt)} · last used {shortDate(k.lastUsedAt)}
                    </div>
                  </div>
                  <button type="button" className="btn btn-small btn-danger" onClick={() => onRemove(k)} aria-label={`Remove ${providerName(k.provider)} key ending ${k.last4}`}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="setting">
        <button type="button" className={`btn ${keys.length ? "" : "btn-primary "}self-start`} onClick={() => onConnect(null)}>
          <Icon name="plus" size={18} /> Connect an AI service
        </button>
        <p className="hint m-0">
          Keys are encrypted before they are stored and used only for what you ask. <a href="/privacy#keys">How keys are stored</a>
        </p>
      </div>
    </Group>
  );
}

function ServiceRow(props: {
  id: string;
  title: string;
  conn: Conn;
  main: string | null;
  sub: string | null;
  empty: string;
  use: Use;
  saved: boolean;
  canChange: boolean;
  onConnect: (use: Use) => void;
  onChange: (use: Use) => void;
}) {
  const on = Boolean(props.conn);
  return (
    <div className="list-row service-row" id={props.id}>
      <span className={`status-dot${on ? " on" : ""}`} aria-hidden="true" />
      <div className="grow">
        <div className="setting-head">
          <span className="label">{props.title}</span>
          <SavedTick show={props.saved} />
        </div>
        {on ? (
          <div className="small">
            {props.main}
            {props.sub && <span className="muted"> · {props.sub}</span>}
          </div>
        ) : (
          <div className="small muted">{props.empty}</div>
        )}
      </div>
      {props.canChange ? (
        <button type="button" className="btn btn-small" onClick={() => props.onChange(props.use)}>
          {on ? "Change" : "Choose"}
          <span className="visually-hidden"> {props.title.toLowerCase()}</span>
        </button>
      ) : (
        <button type="button" className="btn btn-small btn-primary" onClick={() => props.onConnect(props.use)}>
          Connect<span className="visually-hidden"> {props.title.toLowerCase()}</span>
        </button>
      )}
    </div>
  );
}
