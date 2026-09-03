import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getCuratedVoice } from './voices';
import { isSpeechSupported, speak as browserSpeak, stopSpeaking as browserStop } from '../../lib/speech';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface EngineState {
  status: EngineStatus;
  progress: number; // 0-100, best effort
  errorMessage: string | null;
  device: 'wasm' | null;
}

let state: EngineState = { status: 'idle', progress: 0, errorMessage: null, device: null };
const listeners = new Set<() => void>();

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

// All model loading and inference happens in a Web Worker so a slow WASM
// synthesis (single-threaded — see kokoro.worker.ts) never blocks the main
// thread: React keeps rendering and Done/Skip/Easier stay clickable while
// the coach's voice is being generated.
let worker: Worker | null = null;
let loadPromise: Promise<void> | null = null;
let initWaiters: { resolve: () => void; reject: (err: Error) => void }[] = [];
const generationCache = new Map<string, Blob>();
const pendingGenerations = new Map<
  number,
  { resolve: (blob: Blob) => void; reject: (err: Error) => void }
>();
let genRequestSeq = 0;

let currentSource: AudioBufferSourceNode | null = null;
let playbackSeq = 0;
let pendingSpeak: { text: string; opts: SpeakOptions; seq: number } | null = null;

// A plain `new Audio(url).play()` called after an async gap (our generation
// is always async — a worker round-trip) gets silently blocked by browser
// autoplay policy on some platforms, especially Safari/iOS, which requires
// playback to start synchronously within a user gesture. A single
// AudioContext resumed synchronously inside a click handler (see
// `unlockAudio`) stays "unlocked" for the rest of the session, so buffers
// scheduled on it later — even from a worker callback seconds afterward —
// still play.
let audioCtx: AudioContext | null = null;

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
  type: 'progress' | 'ready' | 'error' | 'result' | 'result-error';
  progress?: number;
  message?: string;
  requestId?: number;
  buffer?: ArrayBuffer;
  mime?: string;
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./kokoro.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;
    if (msg.type === 'progress') {
      setState({ progress: msg.progress ?? state.progress });
    } else if (msg.type === 'ready') {
      setState({ status: 'ready', progress: 100, device: 'wasm' });
      initWaiters.forEach((w) => w.resolve());
      initWaiters = [];
    } else if (msg.type === 'error') {
      loadPromise = null;
      setState({ status: 'error', errorMessage: msg.message ?? 'Voice engine failed to start.' });
      initWaiters.forEach((w) => w.reject(new Error(msg.message)));
      initWaiters = [];
    } else if (msg.type === 'result' && msg.requestId !== undefined) {
      const entry = pendingGenerations.get(msg.requestId);
      pendingGenerations.delete(msg.requestId);
      if (entry && msg.buffer) entry.resolve(new Blob([msg.buffer], { type: msg.mime || 'audio/wav' }));
    } else if (msg.type === 'result-error' && msg.requestId !== undefined) {
      const entry = pendingGenerations.get(msg.requestId);
      pendingGenerations.delete(msg.requestId);
      entry?.reject(new Error(msg.message ?? 'Voice generation failed.'));
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
    pendingGenerations.forEach((entry) => entry.reject(new Error(message)));
    pendingGenerations.clear();
  };
  return worker;
}

export function initializeVoice(): Promise<void> {
  if (state.status === 'ready') return Promise.resolve();
  if (loadPromise) return loadPromise;

  setState({ status: 'loading', progress: 0, errorMessage: null });

  loadPromise = new Promise<void>((resolve, reject) => {
    initWaiters.push({ resolve, reject });
    getWorker().postMessage({ type: 'init' });
    setTimeout(() => {
      if (state.status !== 'loading') return;
      loadPromise = null;
      const timeoutErr = new Error('Voice setup timed out.');
      setState({ status: 'error', errorMessage: timeoutErr.message });
      initWaiters.forEach((w) => w.reject(timeoutErr));
      initWaiters = [];
    }, 180_000);
  });

  return loadPromise;
}

export function retryVoice(): Promise<void> {
  loadPromise = null;
  setState({ status: 'idle', errorMessage: null, progress: 0 });
  return initializeVoice();
}

function stopCurrentAudio() {
  playbackSeq += 1;
  pendingSpeak = null;
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      // already stopped/finished — fine
    }
    currentSource = null;
  }
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

function generateViaWorker(text: string, voice: string, speed: number): Promise<Blob> {
  const requestId = ++genRequestSeq;
  return new Promise((resolve, reject) => {
    pendingGenerations.set(requestId, { resolve, reject });
    getWorker().postMessage({ type: 'generate', requestId, text, voice, speed });
    setTimeout(() => {
      if (!pendingGenerations.has(requestId)) return;
      pendingGenerations.delete(requestId);
      reject(new Error('Voice generation timed out.'));
    }, 240_000);
  });
}

async function generate(text: string, kokoroVoice: string, speed: number): Promise<Blob> {
  const key = `${kokoroVoice}::${speed}::${text}`;
  const cached = generationCache.get(key);
  if (cached) return cached;
  const blob = await generateViaWorker(text, kokoroVoice, speed);
  generationCache.set(key, blob);
  return blob;
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
    return;
  }

  try {
    const voice = getCuratedVoice(opts.voiceId);
    const blob = await generate(text, voice.kokoroVoice, rate);
    if (mySeq !== playbackSeq) {
      if (import.meta.env.DEV) console.warn('[voiceEngine] superseded after generate', { mySeq, playbackSeq });
      return; // superseded by a newer step/replay/stop
    }
    if (!audioCtx) unlockAudio();
    if (!audioCtx) {
      if (import.meta.env.DEV) console.warn('[voiceEngine] no AudioContext available');
      return; // Web Audio unsupported — text stays fully usable
    }
    if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => {});
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    if (mySeq !== playbackSeq) {
      if (import.meta.env.DEV) console.warn('[voiceEngine] superseded after decode', { mySeq, playbackSeq });
      return; // superseded while decoding
    }
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    currentSource = source;
    source.start(0);
    if (import.meta.env.DEV) console.info('[voiceEngine] playing', { duration: audioBuffer.duration });
  } catch (err) {
    // Generation failed for this line only — text stays fully usable.
    if (import.meta.env.DEV) console.error('[voiceEngine] speak failed', err);
  }
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

export function prewarm(text: string, voiceId: string, rate = 1) {
  if (state.status !== 'ready' || !text) return;
  const voice = getCuratedVoice(voiceId);
  generate(text, voice.kokoroVoice, rate).catch(() => {});
}

export function isVoiceReady() {
  return state.status === 'ready';
}

if (import.meta.env.DEV) {
  (window as unknown as { __voiceEngineDebug: unknown }).__voiceEngineDebug = {
    getState: () => state,
    hasActiveSource: () => !!currentSource,
    getAudioContextState: () => audioCtx?.state ?? 'none',
    speak,
    initializeVoice,
    unlockAudio,
    getPendingCount: () => pendingGenerations.size,
    generateDirect: (text: string, voice: string, speed: number) => generateViaWorker(text, voice, speed),
  };
}
