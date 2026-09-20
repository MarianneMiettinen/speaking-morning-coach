import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getCuratedVoice } from './voices';
import { isSpeechSupported, speak as browserSpeak, stopSpeaking as browserStop } from '../../lib/speech';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface EngineState {
  status: EngineStatus;
  progress: number; // 0-100, best effort
  errorMessage: string | null;
  device: 'wasm' | null;
  /** A line is being synthesised right now — used to explain the silence in the UI. */
  generating: boolean;
  /** How long the last full line took to synthesise, for diagnosing slow devices. */
  lastGenerateMs: number | null;
  /** How long until the first sentence of the last line started playing. */
  firstSoundMs: number | null;
  /** Download progress in bytes — so a stall is visible, not just a stuck %. */
  loadedBytes: number;
  totalBytes: number;
  /** Lines synthesised so far during one-off setup, and how many in total. */
  prepareDone: number;
  prepareTotal: number;
  /** Rough time left in setup, from how long the finished lines took. */
  prepareEtaMs: number | null;
  /** Bumped whenever a line is cached, so screens showing readiness re-render. */
  preparedVersion: number;
}

let state: EngineState = {
  status: 'idle',
  progress: 0,
  errorMessage: null,
  device: null,
  generating: false,
  lastGenerateMs: null,
  firstSoundMs: null,
  loadedBytes: 0,
  totalBytes: 0,
  prepareDone: 0,
  prepareTotal: 0,
  prepareEtaMs: null,
  preparedVersion: 0,
};
const listeners = new Set<() => void>();

/** Last thing the audio path did. Readable in production via window.__voiceEngine. */
let lastDiagnostic = 'nothing spoken yet';

function setState(patch: Partial<EngineState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getEngineState(): EngineState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useVoiceEngineState(): EngineState {
  return useSyncExternalStore(subscribe, getEngineState, getEngineState);
}

/** True for a few seconds right after the engine finishes loading — for a "voice ready" toast. */
export function useVoiceJustReady(): boolean {
  const engineState = useVoiceEngineState();
  const prevStatus = useRef(engineState.status);
  const [justReady, setJustReady] = useState(false);

  useEffect(() => {
    const wasReady = prevStatus.current === 'ready';
    const isReady = engineState.status === 'ready';
    prevStatus.current = engineState.status;
    if (!wasReady && isReady) {
      setJustReady(true);
      const timer = setTimeout(() => setJustReady(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [engineState.status]);

  return justReady;
}

// Model loading and inference run in a Web Worker so slow WASM synthesis never
// blocks the main thread: React keeps rendering and Done/Skip/Easier stay
// clickable while the coach's voice is being generated.
let worker: Worker | null = null;
let loadPromise: Promise<void> | null = null;
let initWaiters: { resolve: () => void; reject: (err: Error) => void }[] = [];

// Decoded audio, keyed by voice+speed+text. Decoded rather than raw, because
// decodeAudioData detaches the ArrayBuffer it is given — a cached raw buffer
// could only ever be played once.
const cachedAudio = new Map<string, AudioBuffer[]>();

let genRequestSeq = 0;
let playbackSeq = 0;
let pendingSpeak: { text: string; opts: SpeakOptions; seq: number } | null = null;

// A plain `new Audio(url).play()` called after an async gap (generation is
// always async — a worker round-trip) gets silently blocked by browser autoplay
// policy, especially on Safari/iOS, which requires playback to start inside a
// user gesture. A single AudioContext resumed synchronously inside a click
// stays unlocked for the rest of the session, so buffers scheduled on it
// later — from a worker callback seconds afterward — still play.
let audioCtx: AudioContext | null = null;
let activeSources: AudioBufferSourceNode[] = [];
// Where the next sentence should start, so chunks play back-to-back as one line
// instead of overlapping.
let nextStartTime = 0;

export function unlockAudio() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

interface WorkerMessage {
  type: 'progress' | 'progress-note' | 'ready' | 'error' | 'chunk' | 'chunk-end' | 'result-error' | 'result-cancelled';
  progress?: number;
  loadedBytes?: number;
  totalBytes?: number;
  message?: string;
  requestId?: number;
  buffer?: ArrayBuffer;
  mime?: string;
  index?: number;
  chunks?: number;
  msSinceStart?: number;
  generateMs?: number;
}

interface StreamHandlers {
  onChunk: (buffer: ArrayBuffer, msSinceStart: number) => void;
  onEnd: () => void;
  onError: (err: Error) => void;
}
const pendingStreams = new Map<number, StreamHandlers>();

function failAllStreams(message: string) {
  pendingStreams.forEach((h) => h.onError(new Error(message)));
  pendingStreams.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./kokoro.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;
    if (msg.type === 'progress') {
      lastProgressAt = Date.now();
      setState({
        progress: msg.progress ?? state.progress,
        loadedBytes: msg.loadedBytes ?? state.loadedBytes,
        totalBytes: msg.totalBytes ?? state.totalBytes,
      });
      // Past 100% the bytes are in and the model is being compiled and loaded
      // into WASM — a silent phase that emits no progress at all. Keeping the
      // stall timer running here would fail a download that actually
      // succeeded, which is the very bug this is meant to fix.
      if ((msg.progress ?? 0) >= 100) stopStallWatch();
    } else if (msg.type === 'progress-note') {
      // A duplicate init arrived while one was already running; the first
      // attempt is still alive, so keep waiting rather than reporting failure.
      lastProgressAt = Date.now();
    } else if (msg.type === 'ready') {
      stopStallWatch();
      setState({ status: 'ready', progress: 100, device: 'wasm', errorMessage: null });
      initWaiters.forEach((w) => w.resolve());
      initWaiters = [];
    } else if (msg.type === 'error') {
      stopStallWatch();
      loadPromise = null;
      setState({ status: 'error', errorMessage: msg.message ?? 'Voice engine failed to start.' });
      initWaiters.forEach((w) => w.reject(new Error(msg.message)));
      initWaiters = [];
    } else if (msg.type === 'chunk' && msg.requestId !== undefined) {
      const handlers = pendingStreams.get(msg.requestId);
      if (handlers && msg.buffer) handlers.onChunk(msg.buffer, msg.msSinceStart ?? 0);
    } else if (msg.type === 'chunk-end' && msg.requestId !== undefined) {
      const handlers = pendingStreams.get(msg.requestId);
      pendingStreams.delete(msg.requestId);
      if (typeof msg.generateMs === 'number') setState({ lastGenerateMs: msg.generateMs });
      handlers?.onEnd();
    } else if (msg.type === 'result-error' && msg.requestId !== undefined) {
      const handlers = pendingStreams.get(msg.requestId);
      pendingStreams.delete(msg.requestId);
      handlers?.onError(new Error(msg.message ?? 'Voice generation failed.'));
    } else if (msg.type === 'result-cancelled' && msg.requestId !== undefined) {
      const handlers = pendingStreams.get(msg.requestId);
      pendingStreams.delete(msg.requestId);
      handlers?.onError(new Error('cancelled'));
    }
  };
  worker.onerror = (e: ErrorEvent) => {
    const message = e.message || 'Voice engine crashed.';
    if (state.status === 'loading') {
      loadPromise = null;
      setState({ status: 'error', errorMessage: message });
      initWaiters.forEach((w) => w.reject(new Error(message)));
      initWaiters = [];
    }
    failAllStreams(message);
  };
  return worker;
}

// A fixed deadline is the wrong test for a ~90MB download: on a slow
// connection a perfectly healthy download gets killed and reported as "your
// device can't do this". What actually matters is whether bytes are still
// arriving, so give up only when progress genuinely stops.
const STALL_TIMEOUT_MS = 120_000;
let lastProgressAt = 0;
let stallWatch: ReturnType<typeof setInterval> | null = null;

function stopStallWatch() {
  if (stallWatch !== null) {
    clearInterval(stallWatch);
    stallWatch = null;
  }
}

function startStallWatch() {
  stopStallWatch();
  lastProgressAt = Date.now();
  stallWatch = setInterval(() => {
    if (state.status !== 'loading') {
      stopStallWatch();
      return;
    }
    if (Date.now() - lastProgressAt < STALL_TIMEOUT_MS) return;
    stopStallWatch();
    loadPromise = null;
    const mb = (state.loadedBytes / 1_000_000).toFixed(0);
    const err = new Error(
      state.loadedBytes > 0
        ? `Voice download stopped after ${mb} MB. Check your connection and try again.`
        : 'Voice download never started. Check your connection and try again.'
    );
    setState({ status: 'error', errorMessage: err.message });
    initWaiters.forEach((w) => w.reject(err));
    initWaiters = [];
  }, 5_000);
}

export function initializeVoice(): Promise<void> {
  if (state.status === 'ready') return Promise.resolve();
  if (loadPromise) return loadPromise;

  setState({ status: 'loading', progress: 0, errorMessage: null, loadedBytes: 0, totalBytes: 0 });
  startStallWatch();

  loadPromise = new Promise<void>((resolve, reject) => {
    initWaiters.push({ resolve, reject });
    getWorker().postMessage({ type: 'init' });
  });

  return loadPromise;
}

export function retryVoice(): Promise<void> {
  loadPromise = null;
  stopStallWatch();
  setState({ status: 'idle', errorMessage: null, progress: 0, loadedBytes: 0, totalBytes: 0 });
  return initializeVoice();
}

/**
 * Delete the cached model so a corrupted or half-written download can't wedge
 * every future attempt, then start over.
 */
export async function resetVoiceDownload(): Promise<void> {
  stopStallWatch();
  loadPromise = null;
  if (worker) {
    worker.terminate();
    worker = null;
  }
  setState({ status: 'idle', errorMessage: null, progress: 0, loadedBytes: 0, totalBytes: 0 });
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.includes('transformers') || k.includes('kokoro')).map((k) => caches.delete(k))
    );
  } catch {
    // Cache API unavailable or blocked — retrying from scratch is still worth a go.
  }
  return initializeVoice();
}

// One generation per distinct line, shared by everyone who wants it.
//
// Previously a prewarm and the playback of the same line were separate jobs:
// reaching a step whose prewarm was still running started a *second* identical
// generation and queued it behind the first, so the user waited for the line to
// be produced twice. Now a request for a line already in flight attaches to it,
// and is promoted ahead of background work.
interface GenerationListener {
  onChunk: (buffer: AudioBuffer) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

interface Generation {
  key: string;
  requestId: number;
  buffers: AudioBuffer[];
  listeners: Set<GenerationListener>;
  decodeChain: Promise<void>;
  startedAt: number;
}

const inFlight = new Map<string, Generation>();
let currentListener: { generation: Generation; listener: GenerationListener } | null = null;

function cacheKey(kokoroVoice: string, speed: number, text: string) {
  return `${kokoroVoice}::${speed}::${text}`;
}

function requestStream(text: string, voice: string, speed: number, priority: boolean, handlers: StreamHandlers): number {
  const requestId = ++genRequestSeq;
  pendingStreams.set(requestId, handlers);
  getWorker().postMessage({ type: 'generate', requestId, text, voice, speed, priority });
  return requestId;
}

function ensureGeneration(
  key: string,
  text: string,
  kokoroVoice: string,
  speed: number,
  priority: boolean
): Generation {
  const existing = inFlight.get(key);
  if (existing) {
    // Someone is now waiting on what was background work — move it to the front.
    if (priority) worker?.postMessage({ type: 'prioritise', requestId: existing.requestId });
    return existing;
  }

  const generation: Generation = {
    key,
    requestId: 0,
    buffers: [],
    listeners: new Set(),
    decodeChain: Promise.resolve(),
    startedAt: performance.now(),
  };
  inFlight.set(key, generation);

  generation.requestId = requestStream(text, kokoroVoice, speed, priority, {
    onChunk: (buffer) => {
      // Decoding is async, so serialise it: sentence 2 must never be handed out
      // before sentence 1, or a line plays out of order.
      generation.decodeChain = generation.decodeChain
        .then(async () => {
          if (!audioCtx) return;
          const audioBuffer = await audioCtx.decodeAudioData(buffer);
          generation.buffers.push(audioBuffer);
          generation.listeners.forEach((l) => l.onChunk(audioBuffer));
        })
        .catch((err) => {
          lastDiagnostic = `decode failed: ${err instanceof Error ? err.message : String(err)}`;
        });
    },
    onEnd: () => {
      generation.decodeChain
        .then(() => {
          if (generation.buffers.length) {
            cachedAudio.set(key, generation.buffers);
            setState({ preparedVersion: state.preparedVersion + 1 });
          }
          generation.listeners.forEach((l) => l.onDone());
        })
        .catch(() => {})
        .finally(() => inFlight.delete(key));
    },
    onError: (err) => {
      inFlight.delete(key);
      generation.listeners.forEach((l) => l.onError(err));
    },
  });

  return generation;
}

function stopCurrentAudio() {
  playbackSeq += 1;
  pendingSpeak = null;
  if (currentListener) {
    const { generation, listener } = currentListener;
    generation.listeners.delete(listener);
    // Nobody is waiting on this line any more. The worker can't interrupt a
    // sentence mid-synthesis, but it checks for cancellation between them — so
    // letting a line the user has already moved past run to completion is
    // exactly what makes the *next* line take 15-20 seconds to arrive.
    if (generation.listeners.size === 0) {
      worker?.postMessage({ type: 'cancel', requestId: generation.requestId });
      pendingStreams.delete(generation.requestId);
      inFlight.delete(generation.key);
    }
    currentListener = null;
  }
  if (state.generating) setState({ generating: false });
  activeSources.forEach((source) => {
    try {
      source.stop();
    } catch {
      // already stopped/finished — fine
    }
  });
  activeSources = [];
  nextStartTime = 0;
}

export function stop() {
  stopCurrentAudio();
  if (isSpeechSupported()) browserStop();
}

interface SpeakOptions {
  voiceId: string;
  rate?: number;
  backend?: 'auto' | 'browser';
}

/** Queue one sentence to play immediately after whatever is already scheduled. */
function scheduleBuffer(buffer: AudioBuffer, seq: number) {
  if (!audioCtx || seq !== playbackSeq) return;
  const startAt = Math.max(audioCtx.currentTime + 0.03, nextStartTime);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(startAt);
  activeSources.push(source);
  // Drop it once it has finished, otherwise every sentence ever played stays
  // referenced for the life of the session.
  source.onended = () => {
    activeSources = activeSources.filter((s) => s !== source);
  };
  nextStartTime = startAt + buffer.duration;
}

export async function speak(text: string, opts: SpeakOptions): Promise<void> {
  stopCurrentAudio();
  const mySeq = playbackSeq;
  const rate = opts.rate ?? 1;

  if (opts.backend === 'browser') {
    if (isSpeechSupported()) browserSpeak(text, { rate });
    return;
  }

  if (state.status !== 'ready') {
    if (state.status === 'idle') initializeVoice();
    // Don't just drop it: if the model finishes loading while this is still
    // the current step (nothing newer has superseded it), play it then —
    // otherwise a routine clicked through quickly never gets any audio at
    // all, even once the coach's voice is fully loaded.
    pendingSpeak = { text, opts, seq: mySeq };
    lastDiagnostic = `queued until voice is ready (status ${state.status})`;
    return;
  }

  unlockAudio();
  if (!audioCtx) {
    lastDiagnostic = 'no AudioContext available';
    return; // Web Audio unsupported — text stays fully usable
  }
  if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => {});
  if (mySeq !== playbackSeq) return;
  // A suspended context silently swallows playback: buffers get scheduled but
  // the clock never advances, so they erupt later when something else resumes
  // the context. Refuse to schedule onto a context that isn't running.
  if (audioCtx.state !== 'running') {
    lastDiagnostic = `audio blocked (context ${audioCtx.state})`;
    setState({ errorMessage: 'Tap anywhere to enable sound.' });
    return;
  }
  if (state.errorMessage === 'Tap anywhere to enable sound.') setState({ errorMessage: null });

  const voice = getCuratedVoice(opts.voiceId);
  const key = cacheKey(voice.kokoroVoice, rate, text);

  const cached = cachedAudio.get(key);
  if (cached) {
    cached.forEach((buffer) => scheduleBuffer(buffer, mySeq));
    lastDiagnostic = `played ${cached.length} cached sentence(s) instantly`;
    setState({ firstSoundMs: 0, generating: false });
    return;
  }

  setState({ generating: true, firstSoundMs: null });
  const generation = ensureGeneration(key, text, voice.kokoroVoice, rate, true);

  // Whatever this line already produced plays right now; the rest follows as
  // it arrives. Joining a half-finished prewarm is the common case.
  generation.buffers.forEach((buffer) => scheduleBuffer(buffer, mySeq));

  const listener: GenerationListener = {
    onChunk: (buffer) => {
      if (mySeq !== playbackSeq) return;
      scheduleBuffer(buffer, mySeq);
      if (state.firstSoundMs === null) {
        const ms = Math.round(performance.now() - generation.startedAt);
        lastDiagnostic = `first sentence playing after ${ms}ms`;
        setState({ firstSoundMs: ms });
      }
    },
    onDone: () => {
      if (currentListener?.listener === listener) currentListener = null;
      if (mySeq === playbackSeq) setState({ generating: false });
    },
    onError: (err) => {
      if (currentListener?.listener === listener) currentListener = null;
      if (err.message !== 'cancelled') lastDiagnostic = `speak failed: ${err.message}`;
      if (mySeq === playbackSeq) setState({ generating: false });
    },
  };
  generation.listeners.add(listener);
  currentListener = { generation, listener };
}

function tryPendingSpeak() {
  if (!pendingSpeak) return;
  if (state.status !== 'ready') return;
  if (pendingSpeak.seq !== playbackSeq) {
    pendingSpeak = null; // a newer step/replay already superseded it
    return;
  }
  const { text, opts } = pendingSpeak;
  pendingSpeak = null;
  void speak(text, opts);
}
subscribe(tryPendingSpeak);

/**
 * Generate and cache a line ahead of time so it plays the instant it's needed —
 * and, just as importantly, plays without gaps, since every sentence is already
 * decoded before the first one starts.
 */
export function prewarm(text: string, voiceId: string, rate = 1) {
  if (state.status !== 'ready' || !text) return;
  const voice = getCuratedVoice(voiceId);
  const key = cacheKey(voice.kokoroVoice, rate, text);
  if (cachedAudio.has(key) || inFlight.has(key)) return;
  unlockAudio(); // need a context to decode into; suspended is fine for decoding
  if (!audioCtx) return;
  ensureGeneration(key, text, voice.kokoroVoice, rate, false);
}

/** Resolves when this generation finishes, however it finishes. */
function whenGenerationSettles(generation: Generation): Promise<void> {
  return new Promise((resolve) => {
    const listener: GenerationListener = {
      onChunk: () => {},
      onDone: () => {
        generation.listeners.delete(listener);
        resolve();
      },
      onError: () => {
        generation.listeners.delete(listener);
        resolve();
      },
    };
    generation.listeners.add(listener);
  });
}

/**
 * Synthesise a whole morning's worth of lines up front, one at a time, so the
 * routine itself runs with everything already cached — instant, and gapless
 * between sentences. Downloading the model is only part of the first-run cost;
 * this is the part that actually removes the pauses.
 *
 * Lines are prepared in the order they will be spoken, so leaving early still
 * leaves the earliest lines ready.
 */
export async function prepareLines(texts: string[], voiceId: string, rate = 1): Promise<void> {
  await initializeVoice();
  if (state.status !== 'ready') return;
  unlockAudio(); // a context is needed to decode into; suspended is fine
  if (!audioCtx) return;

  const voice = getCuratedVoice(voiceId);
  const todo = [...new Set(texts.filter((t) => t && t.trim().length > 0))];
  setState({ prepareDone: 0, prepareTotal: todo.length, prepareEtaMs: null });

  const startedAt = performance.now();
  let synthesised = 0;
  for (const text of todo) {
    const key = cacheKey(voice.kokoroVoice, rate, text);
    if (!cachedAudio.has(key)) {
      const generation = ensureGeneration(key, text, voice.kokoroVoice, rate, false);
      await whenGenerationSettles(generation);
      synthesised += 1;
    }
    const done = state.prepareDone + 1;
    // Estimate from lines actually synthesised; ones already cached finish
    // instantly and would otherwise make the estimate wildly optimistic.
    const remaining = todo.length - done;
    const perLine = synthesised > 0 ? (performance.now() - startedAt) / synthesised : 0;
    setState({ prepareDone: done, prepareEtaMs: perLine > 0 ? Math.round(perLine * remaining) : null });
  }

  lastDiagnostic = `prepared ${todo.length} line(s) up front`;
  setState({ prepareTotal: 0, prepareDone: 0, prepareEtaMs: null });
}

/**
 * How much of a morning is already synthesised. Lets a screen tell the
 * difference between "the voice is installed" and "the voice will actually
 * speak without pausing", which are not the same thing and were previously
 * indistinguishable to the user.
 */
export function countPrepared(texts: string[], voiceId: string, rate = 1): { ready: number; total: number } {
  const voice = getCuratedVoice(voiceId);
  const unique = [...new Set(texts.filter((t) => t && t.trim().length > 0))];
  const ready = unique.filter((text) => cachedAudio.has(cacheKey(voice.kokoroVoice, rate, text))).length;
  return { ready, total: unique.length };
}

export function isVoiceReady() {
  return state.status === 'ready';
}

// Always available, including in the deployed build — without this there is no
// way to tell a blocked AudioContext from a slow synthesis on a real device.
(window as unknown as { __voiceEngine: unknown }).__voiceEngine = {
  getState: () => state,
  getDiagnostic: () => lastDiagnostic,
  getAudioContextState: () => audioCtx?.state ?? 'none',
  activeSourceCount: () => activeSources.length,
  pendingStreamCount: () => pendingStreams.size,
  cachedLines: () => cachedAudio.size,
  speak,
  prewarm,
  initializeVoice,
  unlockAudio,
  resetVoiceDownload,
};
