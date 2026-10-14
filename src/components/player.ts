"use client";
// Audio for the whole app: saved recordings first, the device's French voice otherwise.
// One player for the page, so starting a line always stops the previous one.
//
// Shadowing: after a line, the learner gets a "your turn" gap long enough to say it
// (max(1.4 × clip + 700 ms, 1.5 s)). Repeat plays normal → gap → slow → gap → normal → gap.
// Record & compare records the learner during the gap (in memory only, never uploaded),
// then plays the model and the learner's voice back to back.

import { useSyncExternalStore } from "react";

export type Speed = "normal" | "slow" | "slower";
// [recording playbackRate, device voice rate]. Safari clamps playbackRate below ~0.5.
const SPEEDS: Record<Speed, [number, number]> = { normal: [1, 0.9], slow: [0.8, 0.7], slower: [0.6, 0.55] };
export const SPEED_ORDER: Speed[] = ["normal", "slow", "slower"];
export const SPEED_LABEL: Record<Speed, string> = { normal: "1×", slow: "0.8×", slower: "0.6×" };

export type Mode = "all" | "hide-fr" | "hide-en" | "listen";
const MODES: Mode[] = ["all", "hide-fr", "hide-en", "listen"];

/** The learner's turn to speak, after a line. `id` changes for every new gap (restart a countdown on it). */
export type Gap = { id: number; ms: number; rec: boolean };

type State = {
  playing: string | null;
  speed: Speed;
  repeat: boolean;
  mode: Mode;
  clips: Record<string, string>;
  /** Id of the list playAll / playSequence is playing, so its button can show Stop. */
  list: string | null;
  gap: Gap | null;
  /** The line that is playing with the device voice because its recording did not load. */
  fallback: string | null;
  /** Show the IPA line under words (remembered on this device). */
  ipa: boolean;
  /** Record & compare is on (microphone open). Not remembered: it needs permission each visit. */
  record: boolean;
  /** Playing back the learner's own recording of this line. */
  mine: string | null;
};

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

const SERVER_STATE: State = {
  playing: null,
  speed: "normal",
  repeat: false,
  mode: "all",
  clips: {},
  list: null,
  gap: null,
  fallback: null,
  ipa: true,
  record: false,
  mine: null,
};
let state: State = SERVER_STATE;
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
  state = {
    ...state,
    speed: SPEEDS[speed] ? speed : "normal",
    repeat: store.get("repeat", "0") === "1",
    mode: MODES.includes(mode) ? mode : "all",
    ipa: store.get("ipa", "1") === "1",
  };
}
function subscribe(l: () => void) {
  loadPrefs();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function usePlayer(): State {
  return useSyncExternalStore(
    subscribe,
    () => (loadPrefs(), state),
    () => SERVER_STATE,
  );
}

/** Subscribes to one value of the player (return a primitive), so a button re-renders only when it changes. */
export function usePlayerSelector<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => (loadPrefs(), select(state)),
    () => select(SERVER_STATE),
  );
}

/** The current player state, for event handlers (not for render). */
export function playerState(): Readonly<State> {
  loadPrefs();
  return state;
}

export function setSpeed(speed: Speed) {
  store.set("speed", speed);
  emit({ speed });
  // Apply to the clip that is playing now, not only to the next one.
  if (audio && !audio.paused) audio.playbackRate = SPEEDS[speed][0];
}
export function cycleSpeed() {
  loadPrefs();
  setSpeed(SPEED_ORDER[(SPEED_ORDER.indexOf(state.speed) + 1) % SPEED_ORDER.length]);
}
export function setMode(mode: Mode) {
  store.set("mode", mode);
  emit({ mode });
}
export function setRepeat(repeat: boolean) {
  store.set("repeat", repeat ? "1" : "0");
  emit({ repeat });
}
export function setIpa(ipa: boolean) {
  store.set("ipa", ipa ? "1" : "0");
  emit({ ipa });
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
        // A list keeps playing on the lock screen, so the floor stays on while one plays.
        if (document.hidden && !state.list) void keepAlive?.suspend();
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
  const chosen = store.get("deviceVoice", "");
  frVoice =
    (chosen ? voices.find((v) => v.voiceURI === chosen) : undefined) ??
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

/** The French voices this device has (for the device-voice picker in Settings). */
export function frenchVoices(): { id: string; name: string; lang: string; current: boolean }[] {
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("fr"))
    .map((v) => ({ id: v.voiceURI, name: v.name, lang: v.lang, current: v === frVoice }));
}

/** Chooses the device voice by id (voiceURI); "" goes back to the automatic choice. Saved on this device. */
export function setDeviceVoice(id: string) {
  store.set("deviceVoice", id);
  pickVoice();
}

// ---------- playing ----------

let audio: HTMLAudioElement | null = null;
let mineAudio: HTMLAudioElement | null = null;
let token = 0; // bumps on every new request, so stale callbacks do nothing
let settleCurrent: (() => void) | null = null; // ends the clip or gap in progress (stop, skip)

/** One step slower than the chosen speed (the middle play of Repeat). */
const slower = (s: Speed): Speed => SPEED_ORDER[Math.min(SPEED_ORDER.indexOf(s) + 1, SPEED_ORDER.length - 1)];

/** Plays a line once. Resolves with how long it took (ms). */
function playOnce(text: string, myToken: number, speed: Speed = state.speed): Promise<number> {
  return new Promise((resolve) => {
    if (myToken !== token) return resolve(0);
    const started = Date.now();
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      settleCurrent = null;
      resolve(Date.now() - started);
    };
    settleCurrent = done;
    const device = (failed: boolean) => {
      if (settled || myToken !== token) return done();
      if (failed) emit({ fallback: text });
      speakDevice(text, speed).then(done);
    };
    const url = state.clips[text.trim()];
    if (!url) return device(false);
    audio ??= new Audio();
    audio.preservesPitch = true;
    audio.src = url;
    audio.playbackRate = SPEEDS[speed][0];
    audio.onended = done;
    audio.onerror = () => device(true);
    audio.play().catch((e: unknown) => {
      // AbortError: a newer play() replaced this one; nothing to fall back to.
      if (e instanceof DOMException && e.name === "AbortError") return done();
      device(true);
    });
  });
}

function speakDevice(text: string, speed: Speed): Promise<void> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === "undefined") return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    if (frVoice) u.voice = frVoice;
    u.rate = SPEEDS[speed][1];
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

const wait = (ms: number, myToken: number) =>
  new Promise<void>((resolve) => {
    if (myToken !== token) return resolve();
    const t = setTimeout(() => {
      settleCurrent = null;
      resolve();
    }, ms);
    settleCurrent = () => {
      clearTimeout(t);
      settleCurrent = null;
      resolve();
    };
  });

/** Long enough for a beginner to say the line after hearing it. */
export function speakGapMs(clipMs: number) {
  return Math.min(12_000, Math.max(1.4 * clipMs + 700, 1500));
}
/** A guess at how long a line takes to say, before it has been played. */
const estimateMs = (text: string) => Math.max(900, text.length * 75);

let gapId = 0;
/** The learner's turn: shows the countdown, records when Record & compare is on. Returns the recording, if any. */
async function turn(text: string, ms: number, myToken: number): Promise<string | null> {
  if (myToken !== token) return null;
  const rec = state.record && Boolean(micStream);
  emit({ gap: { id: ++gapId, ms, rec } });
  const recorder = rec ? startRecording() : null;
  await wait(ms, myToken);
  const url = recorder ? await recorder() : null;
  if (myToken === token) emit({ gap: null });
  if (url) {
    const old = recordings.get(text);
    if (old) URL.revokeObjectURL(old);
    recordings.set(text, url);
  }
  return myToken === token ? url : null;
}

/** Ends the gap now (the learner is ready). The line, if any, plays straight away. */
export function skipGap() {
  if (state.gap) settleCurrent?.();
}

function playMine(text: string, url: string, myToken: number): Promise<void> {
  return new Promise((resolve) => {
    if (myToken !== token) return resolve();
    emit({ mine: text });
    const end = () => {
      settleCurrent = null;
      if (myToken === token) emit({ mine: null });
      resolve();
    };
    settleCurrent = end;
    mineAudio ??= new Audio();
    mineAudio.src = url;
    mineAudio.onended = end;
    mineAudio.onerror = end;
    mineAudio.play().catch(end);
  });
}

/** Plays one line the way the study settings ask: once, Repeat loop, or Record & compare. */
async function runLine(text: string, myToken: number, opts: { gap?: boolean; last?: boolean } = {}) {
  if (myToken !== token) return;
  emit({ playing: text, fallback: null });
  if (state.record && micStream) {
    const ms = await playOnce(text, myToken);
    const mine = await turn(text, speakGapMs(ms), myToken);
    if (mine) {
      await playOnce(text, myToken);
      await wait(250, myToken);
      await playMine(text, mine, myToken);
    }
    return;
  }
  if (state.repeat) {
    for (const speed of [state.speed, slower(state.speed), state.speed]) {
      if (myToken !== token) return;
      const ms = await playOnce(text, myToken, speed);
      await turn(text, speakGapMs(ms), myToken);
    }
    return;
  }
  const ms = await playOnce(text, myToken);
  if (opts.gap) await turn(text, speakGapMs(ms), myToken);
  else if (!opts.last) await wait(450, myToken);
}

export function stop() {
  token++;
  audio?.pause();
  mineAudio?.pause();
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  settleCurrent?.();
  settleCurrent = null;
  emit({ playing: null, list: null, gap: null, mine: null });
  setSession(null);
}

/** Plays one line (Repeat / Record & compare apply). Tapping the line that is playing stops it. */
export async function speak(text: string) {
  if (state.playing === text || state.mine === text) return stop();
  stop();
  const mine = ++token;
  holdAudioOpen();
  await runLine(text, mine, { last: true });
  if (mine === token) emit({ playing: null });
}

export type PlayAllOptions = {
  /** Names the list: its button shows Stop while it plays, and tapping it again stops. */
  id?: string;
  /** Shown on the lock screen. */
  title?: string;
  /** Leave a "your turn" gap after each line (shadowing). */
  gaps?: boolean;
  /** Called when the whole list played to the end (not when stopped). */
  onDone?: () => void;
};

/** Plays lines in order. Calls onLine with the index before each one. */
export async function playAll(lines: string[], onLine?: (i: number) => void, opts: PlayAllOptions = {}) {
  if (opts.id && state.list === opts.id) return stop();
  stop();
  const mine = ++token;
  holdAudioOpen();
  emit({ list: opts.id ?? "list" });
  for (let i = 0; i < lines.length && mine === token; i++) {
    onLine?.(i);
    setSession(lines[i], opts.title);
    await runLine(lines[i], mine, { gap: opts.gaps, last: i === lines.length - 1 });
  }
  if (mine === token) {
    emit({ playing: null, list: null });
    setSession(null);
    opts.onDone?.();
  }
}

export type Step = { text: string; /** The learner says this line first (gap), then hears it. */ speak?: boolean };

/**
 * Role-play: plays the other person's lines; on the learner's lines leaves a gap to say it, then plays it.
 * onStep(i, "turn") fires when the learner's gap starts, onStep(i, "play") before a line plays.
 */
export async function playSequence(steps: Step[], opts: { id: string; title?: string; onStep?: (i: number, phase: "turn" | "play") => void; onDone?: () => void }) {
  if (state.list === opts.id) return stop();
  stop();
  const mine = ++token;
  holdAudioOpen();
  emit({ list: opts.id });
  for (let i = 0; i < steps.length && mine === token; i++) {
    const s = steps[i];
    setSession(s.text, opts.title);
    let recording: string | null = null;
    if (s.speak) {
      opts.onStep?.(i, "turn");
      emit({ playing: null });
      recording = await turn(s.text, speakGapMs(estimateMs(s.text)), mine);
      if (mine !== token) break;
    }
    opts.onStep?.(i, "play");
    emit({ playing: s.text, fallback: null });
    await playOnce(s.text, mine);
    if (recording) {
      await wait(250, mine);
      await playMine(s.text, recording, mine);
    }
    if (i < steps.length - 1) await wait(s.speak ? 700 : 450, mine);
  }
  if (mine === token) {
    emit({ playing: null, list: null });
    setSession(null);
    opts.onDone?.();
  }
}

// ---------- Record & compare (in memory only) ----------

let micStream: MediaStream | null = null;
const recordings = new Map<string, string>();

/** Turns Record & compare on (asks for the microphone) or off. Resolves false when the mic is not available. */
export async function setRecord(on: boolean): Promise<boolean> {
  if (!on) {
    releaseMic();
    return true;
  }
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return false;
  try {
    micStream ??= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    emit({ record: true });
    return true;
  } catch {
    return false;
  }
}

/** Closes the microphone and forgets every recording (call when leaving the page). */
export function releaseMic() {
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
  for (const url of recordings.values()) URL.revokeObjectURL(url);
  recordings.clear();
  if (state.record) emit({ record: false });
}

/** Starts recording; the returned function stops and resolves with an object URL (or null). */
function startRecording(): (() => Promise<string | null>) | null {
  if (!micStream) return null;
  try {
    const rec = new MediaRecorder(micStream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.start();
    return () =>
      new Promise((resolve) => {
        rec.onstop = () => resolve(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })) : null);
        try {
          rec.stop();
        } catch {
          resolve(null);
        }
      });
  } catch {
    return null;
  }
}

// ---------- lock screen (Media Session) ----------

function setSession(text: string | null, title?: string) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    if (!text) {
      navigator.mediaSession.playbackState = "none";
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({ title: text, artist: title ?? "Everyday French", album: "Everyday French" });
    navigator.mediaSession.playbackState = "playing";
    navigator.mediaSession.setActionHandler("pause", () => stop());
    navigator.mediaSession.setActionHandler("stop", () => stop());
  } catch {}
}
