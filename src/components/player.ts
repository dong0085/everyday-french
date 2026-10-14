"use client";
// Audio for the whole app: saved recordings first, the device's French voice otherwise.
// One player for the page, so starting a line always stops the previous one.

import { useSyncExternalStore } from "react";

export type Speed = "normal" | "slow" | "slower";
// [recording playbackRate, device voice rate]. Safari clamps playbackRate below ~0.5.
const SPEEDS: Record<Speed, [number, number]> = { normal: [1, 0.9], slow: [0.8, 0.7], slower: [0.6, 0.55] };

export type Mode = "all" | "hide-fr" | "hide-en" | "listen";
const MODES: Mode[] = ["all", "hide-fr", "hide-en", "listen"];

type State = { playing: string | null; speed: Speed; repeat: boolean; mode: Mode; clips: Record<string, string> };

const store = {
  get(key: string, fallback: string) {
    try {
      return localStorage.getItem("ef." + key) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem("ef." + key, value);
    } catch {}
  },
};

let state: State = { playing: null, speed: "normal", repeat: false, mode: "all", clips: {} };
let loadedPrefs = false;
const listeners = new Set<() => void>();
function emit(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
function loadPrefs() {
  if (loadedPrefs || typeof window === "undefined") return;
  loadedPrefs = true;
  const speed = store.get("speed", "normal") as Speed;
  const mode = store.get("mode", "all") as Mode;
  state = { ...state, speed: SPEEDS[speed] ? speed : "normal", repeat: store.get("repeat", "0") === "1", mode: MODES.includes(mode) ? mode : "all" };
}

const SERVER_STATE: State = { playing: null, speed: "normal", repeat: false, mode: "all", clips: {} };
export function usePlayer(): State {
  return useSyncExternalStore(
    (l) => {
      loadPrefs();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (loadPrefs(), state),
    () => SERVER_STATE,
  );
}

export function setSpeed(speed: Speed) {
  store.set("speed", speed);
  emit({ speed });
}
export function setMode(mode: Mode) {
  store.set("mode", mode);
  emit({ mode });
}
export function setRepeat(repeat: boolean) {
  store.set("repeat", repeat ? "1" : "0");
  emit({ repeat });
}
export function addClips(map: Record<string, string>) {
  emit({ clips: { ...state.clips, ...map } });
}
export function hasClip(text: string) {
  return Boolean(state.clips[text.trim()]);
}

// ---------- keep the audio output open (stops clicks on some USB speakers) ----------
// Some powered speakers mute their amplifier on pure digital silence and pop when sound starts
// or stops (with the device voice too, which plays outside the page). An inaudible noise floor
// (about -76 dB) keeps the output and the amplifier awake, so speech starts and ends cleanly.
// It starts on the first tap anywhere, so it is already running when the first line plays.

const NOISE_LEVEL = 0.00016;

let keepAlive: AudioContext | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
function holdAudioOpen() {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  try {
    if (!keepAlive) {
      keepAlive = new Ctx();
      const buffer = keepAlive.createBuffer(1, keepAlive.sampleRate * 2, keepAlive.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * NOISE_LEVEL;
      const floor = keepAlive.createBufferSource();
      floor.buffer = buffer;
      floor.loop = true;
      floor.connect(keepAlive.destination);
      floor.start();
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) void keepAlive?.suspend();
      });
    }
    if (keepAlive.state === "suspended") void keepAlive.resume();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => void keepAlive?.suspend(), 5 * 60_000);
  } catch {}
}
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", holdAudioOpen, { passive: true });
  document.addEventListener("keydown", holdAudioOpen);
}

// ---------- device voice ----------

let frVoice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (typeof speechSynthesis === "undefined") return;
  const voices = speechSynthesis.getVoices();
  frVoice =
    voices.find((v) => v.lang === "fr-FR" && /premium|enhanced|natural/i.test(v.name)) ??
    voices.find((v) => v.lang === "fr-FR" && /thomas|amélie|audrey|google/i.test(v.name)) ??
    voices.find((v) => v.lang === "fr-FR") ??
    voices.find((v) => v.lang.startsWith("fr")) ??
    null;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

// ---------- playing ----------

let audio: HTMLAudioElement | null = null;
let token = 0; // bumps on every new request, so stale callbacks do nothing

function playOnce(text: string, myToken: number): Promise<void> {
  return new Promise((resolve) => {
    if (myToken !== token) return resolve();
    const url = state.clips[text.trim()];
    if (url) {
      audio ??= new Audio();
      audio.preservesPitch = true;
      audio.src = url;
      audio.playbackRate = SPEEDS[state.speed][0];
      audio.onended = () => resolve();
      audio.onerror = () => speakDevice(text).then(resolve);
      audio.play().catch(() => speakDevice(text).then(resolve));
    } else {
      speakDevice(text).then(resolve);
    }
  });
}

function speakDevice(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === "undefined") return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    if (frVoice) u.voice = frVoice;
    u.rate = SPEEDS[state.speed][1];
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function stop() {
  token++;
  audio?.pause();
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  emit({ playing: null });
}

/** Plays one line (3 times with pauses when Repeat is on). Tapping the same line again stops it. */
export async function speak(text: string) {
  if (state.playing === text) return stop();
  stop();
  const mine = ++token;
  holdAudioOpen();
  emit({ playing: text });
  const times = state.repeat ? 3 : 1;
  for (let i = 0; i < times && mine === token; i++) {
    const started = Date.now();
    await playOnce(text, mine);
    if (i < times - 1 && mine === token) await wait(Math.min(4000, 800 + (Date.now() - started) * 0.8));
  }
  if (mine === token) emit({ playing: null });
}

/** Plays lines in order. Calls onLine with the index before each one. */
export async function playAll(lines: string[], onLine?: (i: number) => void) {
  stop();
  const mine = ++token;
  holdAudioOpen();
  for (let i = 0; i < lines.length && mine === token; i++) {
    onLine?.(i);
    emit({ playing: lines[i] });
    const times = state.repeat ? 3 : 1;
    for (let k = 0; k < times && mine === token; k++) {
      await playOnce(lines[i], mine);
      await wait(k < times - 1 ? 1200 : 450);
    }
  }
  if (mine === token) emit({ playing: null });
}
