"use client";

import { LEVELS, type Level } from "@/lib/content/schema";
import { Switch } from "../ui";
import { Group, SavedTick, type Patch, type Profile } from "./shared";

const LEVEL_TEXT: Record<Level, string> = {
  A1: "I know a few words",
  A2: "I can talk about my day simply",
  B1: "I can handle most everyday talk",
  B2: "I want more nuance",
};

const GENDER: [Profile["selfGender"], string, string][] = [
  ["m", "Je suis allé", "Masculine forms"],
  ["f", "Je suis allée", "Feminine forms"],
  ["x", "Not set", "Masculine forms, with a note about the feminine"],
];

export function LearningGroup({ p, patch, saved }: { p: Profile; patch: Patch; saved: string | null }) {
  return (
    <Group id="learning" title="Learning">
      <div className="setting" role="group" aria-labelledby="set-level">
        <div className="setting-head">
          <span className="label" id="set-level">
            Level
          </span>
          <SavedTick show={saved === "level"} />
        </div>
        <div className="radio-list">
          {LEVELS.map((l) => (
            <button key={l} type="button" aria-pressed={p.level === l} onClick={() => patch({ level: l, setUp: true }, { level: l }, "level")}>
              <strong>{l}</strong>
              <small>{LEVEL_TEXT[l]}</small>
            </button>
          ))}
        </div>
        <span className="hint">New topics use this level. Topics you already have keep theirs.</span>
      </div>

      <div className="setting" role="group" aria-labelledby="set-gender">
        <div className="setting-head">
          <span className="label" id="set-gender">
            How French talks about you
          </span>
          <SavedTick show={saved === "gender"} />
        </div>
        <div className="radio-list">
          {GENDER.map(([k, title, text]) => (
            <button key={k} type="button" aria-pressed={p.selfGender === k} onClick={() => patch({ selfGender: k, setUp: true }, { selfGender: k }, "gender")}>
              <strong className={k === "x" ? undefined : "fr-inline"} lang={k === "x" ? undefined : "fr"}>
                {title}
              </strong>
              <small>{text}</small>
            </button>
          ))}
        </div>
        <span className="hint">French changes some words to match the person speaking: “I went” is allé for a man, allée for a woman.</span>
      </div>

      <div className="setting" role="group" aria-labelledby="set-l1">
        <div className="setting-head">
          <span className="label" id="set-l1">
            First language
          </span>
          <SavedTick show={saved === "l1"} />
        </div>
        <div className="seg">
          {(
            [
              ["zh", "中文"],
              ["en", "English"],
              ["other", "Other"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" lang={k === "zh" ? "zh-Hans" : undefined} aria-pressed={p.l1 === k} onClick={() => patch({ l1: k }, { l1: k }, "l1")}>
              {label}
            </button>
          ))}
        </div>
        <span className="hint">Notes point out what your language does differently.</span>
      </div>

      <div className="setting" role="group" aria-labelledby="set-help">
        <div className="setting-head">
          <span className="label" id="set-help">
            Help language
          </span>
          <SavedTick show={saved === "help"} />
        </div>
        <div className="seg">
          {(
            [
              ["en", "English"],
              ["zh", "中文"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              lang={k === "zh" ? "zh-Hans" : undefined}
              aria-pressed={p.explainLang === k}
              onClick={() => {
                if (p.explainLang === k) return;
                // Help in Chinese: Chinese meanings are almost always wanted too.
                if (k === "zh" && !p.zhGloss) patch({ explainLang: k, zhGloss: true }, { explainLang: k, zhGloss: true }, "help");
                else patch({ explainLang: k }, { explainLang: k }, "help");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="hint">Notes and explanations in new topics use this language.</span>
      </div>

      <div className="setting">
        <div className="setting-head">
          <Switch
            checked={p.zhGloss}
            onChange={(v) => patch({ zhGloss: v }, { zhGloss: v }, "gloss")}
            label={
              <>
                Show Chinese meanings <span lang="zh-Hans">（中文释义）</span>
              </>
            }
            hint="A short Chinese meaning under words and sentences in new topics."
          />
          <SavedTick show={saved === "gloss"} />
        </div>
      </div>
    </Group>
  );
}
