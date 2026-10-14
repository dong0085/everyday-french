"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { frenchVoices, setDeviceVoice, setSpeed, speak, stop, usePlayer, type Speed } from "../player";
import { api } from "../ui";
import { Icon } from "../Icon";
import { count } from "@/lib/format";
import { describeSpeech, Group, SavedTick, type Profile } from "./shared";

const SAMPLE = "Bonjour ! Je m'appelle Léa. On prend un café ?";
const REGION: Record<string, string> = { FR: "France", CA: "Canada", BE: "Belgium", CH: "Switzerland", LU: "Luxembourg" };

function region(lang: string) {
  const r = lang.split(/[-_]/)[1]?.toUpperCase();
  return (r && REGION[r]) ?? lang;
}

// The device's French voices, plus the saved choice. A string snapshot, so React sees a stable value.
function subscribeVoices(cb: () => void) {
  if (typeof speechSynthesis === "undefined") return () => {};
  speechSynthesis.addEventListener?.("voiceschanged", cb);
  return () => speechSynthesis.removeEventListener?.("voiceschanged", cb);
}
function voicesSnapshot() {
  let chosen = "";
  try {
    chosen = localStorage.getItem("ef.deviceVoice") ?? "";
  } catch {}
  return JSON.stringify({ chosen, voices: frenchVoices() });
}
const NO_VOICES = JSON.stringify({ chosen: "", voices: [] });

export function ListeningGroup({ p, onChangeVoice }: { p: Profile; onChangeVoice: () => void }) {
  const snap = useSyncExternalStore(subscribeVoices, voicesSnapshot, () => NO_VOICES);
  const { chosen: storedChoice, voices } = JSON.parse(snap) as { chosen: string; voices: ReturnType<typeof frenchVoices> };
  const [chosen, setChosen] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const { speed, playing } = usePlayer();
  const value = chosen ?? storedChoice;
  const current = voices.find((v) => v.current);
  const tick = (field: string) => {
    setSaved(field);
    setTimeout(() => setSaved((s) => (s === field ? null : s)), 1800);
  };

  return (
    <Group id="listening" title="Listening">
      <div className="setting">
        <div className="setting-head">
          <label className="label" htmlFor="device-voice">
            Device voice <span className="badge">Free</span>
          </label>
          <SavedTick show={saved === "voice"} />
        </div>
        {voices.length === 0 ? (
          <p className="muted small m-0">
            No French voice found on this device yet. You can add one in your device&apos;s speech settings, or connect a natural voice below.
          </p>
        ) : (
          <div className="input-with-actions">
            <select
              id="device-voice"
              value={value}
              onChange={(e) => {
                stop();
                setDeviceVoice(e.target.value);
                setChosen(e.target.value);
                tick("voice");
              }}
            >
              <option value="">Automatic{current && !value ? ` (${current.name})` : ""}</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {region(v.lang)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`icon-btn device${playing === SAMPLE ? " busy" : ""}`}
              aria-label={playing === SAMPLE ? "Stop the sample" : "Hear a sample"}
              onClick={() => void speak(SAMPLE)}
            >
              <Icon name={playing === SAMPLE ? "stop" : "play"} size={18} />
            </button>
          </div>
        )}
        <span className="hint">Used for lines without a recording. Saved on this device only.</span>
      </div>

      <div className="setting">
        <div className="setting-head">
          <span className="label" id="set-speed">
            Speed
          </span>
          <SavedTick show={saved === "speed"} />
        </div>
        <div className="seg" role="group" aria-labelledby="set-speed">
          {(
            [
              ["normal", "Normal"],
              ["slow", "Slow"],
              ["slower", "Slower"],
            ] as [Speed, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={speed === k}
              onClick={() => {
                setSpeed(k);
                tick("speed");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <NaturalVoice p={p} onChange={onChangeVoice} />
    </Group>
  );
}

function NaturalVoice({ p, onChange }: { p: Profile; onChange: () => void }) {
  const [quota, setQuota] = useState<{ left: number; limit: number } | null>(null);
  const eleven = p.tts?.provider === "elevenlabs";
  const keyId = p.tts?.keyId;
  useEffect(() => {
    if (!eleven) return;
    let live = true;
    api<{ charsLeft: number | null; charLimit?: number }>("/api/audio/quota")
      .then((r) => live && r.charsLeft !== null && r.charLimit && setQuota({ left: r.charsLeft, limit: r.charLimit }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [eleven, keyId]);

  if (!p.tts)
    return (
      <div className="setting">
        <span className="label">Natural voice</span>
        <p className="muted small m-0">
          Not set up. Lines play with your device voice. <a href="#voice">Connect a natural voice</a>
        </p>
      </div>
    );
  const d = describeSpeech(p.tts);
  const ratio = quota ? quota.left / Math.max(1, quota.limit) : 1;
  return (
    <div className="setting">
      <div className="list-row bare">
        <div className="grow">
          <span className="label">Natural voice</span>
          <div className="small">{d.main}</div>
        </div>
        <button type="button" className="btn btn-small" onClick={onChange}>
          Change
        </button>
      </div>
      {eleven && quota && (
        <div className="meter-row">
          <div className="meter" role="meter" aria-label="ElevenLabs characters left this month" aria-valuemin={0} aria-valuemax={quota.limit} aria-valuenow={quota.left}>
            <div className={`fill ${ratio < 0.1 ? "bad" : ratio < 0.3 ? "warn" : "ok"}`} style={{ width: `${Math.max(1, ratio * 100)}%` }} />
          </div>
          <span className="hint">
            {count(quota.left)} of {count(quota.limit)} characters left this month
          </span>
        </div>
      )}
    </div>
  );
}
