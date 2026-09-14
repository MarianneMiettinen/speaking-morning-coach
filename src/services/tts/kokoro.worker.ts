import { KokoroTTS, TextSplitterStream } from 'kokoro-js';
import { env } from '@huggingface/transformers';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tts: any = null;
const fileBytes = new Map<string, { loaded: number; total: number }>();

interface InitMessage {
  type: 'init';
}
interface GenerateMessage {
  type: 'generate';
  requestId: number;
  text: string;
  voice: string;
  speed: number;
}
interface CancelMessage {
  type: 'cancel';
  requestId: number;
}
type InMessage = InitMessage | GenerateMessage | CancelMessage;

// Synthesis is CPU-bound WASM: it blocks this worker until it finishes, and
// it cannot be interrupted once started. So jobs are queued explicitly rather
// than relying on the event loop, which lets a superseded job be dropped
// *before* it starts. Without this, clicking through a routine stacks minutes
// of dead work and the audio for step 2 arrives long after step 8.
const queue: GenerateMessage[] = [];
const cancelled = new Set<number>();
let draining = false;

// Guards against a second download being started while the first is still
// running. "Try again" used to post another init, so two ~90MB downloads and
// two WASM sessions competed for the same CPU and memory — making the thing
// the user was trying to rescue strictly slower.
let initInFlight: Promise<void> | null = null;

async function handleInit() {
  if (tts) {
    postMessage({ type: 'ready' });
    return;
  }
  if (initInFlight) {
    // Already downloading — the in-flight attempt will report ready/error.
    postMessage({ type: 'progress-note', message: 'already-loading' });
    return;
  }
  initInFlight = runInit().finally(() => {
    initInFlight = null;
  });
  await initInFlight;
}

async function runInit() {
  // Multi-threaded WASM needs SharedArrayBuffer, which needs cross-origin
  // isolation (COOP/COEP). Use the extra threads when the host provides it,
  // otherwise fall back to one thread rather than hanging on a missing SAB.
  if (env.backends.onnx.wasm) {
    const isolated = typeof self !== 'undefined' && (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated;
    env.backends.onnx.wasm.numThreads = isolated
      ? Math.max(1, Math.min(4, navigator.hardwareConcurrency || 1))
      : 1;
  }
  try {
    tts = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (info: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (info.status === 'progress' && info.file && typeof info.loaded === 'number' && typeof info.total === 'number') {
          fileBytes.set(info.file, { loaded: info.loaded, total: info.total });
          let loadedSum = 0;
          let totalSum = 0;
          for (const { loaded, total } of fileBytes.values()) {
            loadedSum += loaded;
            totalSum += total;
          }
          // Byte-weighted across every file being fetched, not a flat
          // average of per-file percentages — a small tokenizer file and
          // the ~90MB model weights shouldn't count equally.
          const pct = totalSum > 0 ? Math.round((loadedSum / totalSum) * 100) : 0;
          postMessage({ type: 'progress', progress: pct, loadedBytes: loadedSum, totalBytes: totalSum });
        }
      },
    });
    postMessage({ type: 'ready' });
  } catch (err) {
    postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
}

async function runJob(job: GenerateMessage) {
  const startedAt = Date.now();
  try {
    if (!tts) throw new Error('Voice engine not initialized.');
    // Stream sentence by sentence instead of synthesising the whole line
    // before making a sound. A full coaching line takes tens of seconds on one
    // WASM thread; its first sentence takes a few. The rest is generated while
    // the opening sentence is already playing.
    //
    // The splitter is driven by hand rather than passing the raw string to
    // tts.stream(): given a string, kokoro-js pushes it as ONE item and never
    // closes the splitter, so the iterator yields nothing and then waits for
    // input that never comes. Pushing and closing it ourselves both splits on
    // sentences and lets the stream actually finish.
    const splitter = new TextSplitterStream();
    const stream = tts.stream(splitter, { voice: job.voice, speed: job.speed });
    splitter.push(job.text);
    splitter.close();

    let index = 0;
    for await (const { audio } of stream) {
      if (cancelled.has(job.requestId)) break;
      const blob: Blob = audio.toBlob();
      const buffer = await blob.arrayBuffer();
      (postMessage as (message: unknown, transfer: Transferable[]) => void)(
        {
          type: 'chunk',
          requestId: job.requestId,
          index: index++,
          buffer,
          mime: blob.type || 'audio/wav',
          msSinceStart: Date.now() - startedAt,
        },
        [buffer]
      );
    }

    // Defensive: if the splitter produced nothing at all, fall back to a
    // single-shot generate so a line is never silently dropped.
    if (index === 0 && !cancelled.has(job.requestId)) {
      const audio = await tts.generate(job.text, { voice: job.voice, speed: job.speed });
      const blob: Blob = audio.toBlob();
      const buffer = await blob.arrayBuffer();
      (postMessage as (message: unknown, transfer: Transferable[]) => void)(
        {
          type: 'chunk',
          requestId: job.requestId,
          index: index++,
          buffer,
          mime: blob.type || 'audio/wav',
          msSinceStart: Date.now() - startedAt,
        },
        [buffer]
      );
    }
    if (cancelled.delete(job.requestId)) {
      postMessage({ type: 'result-cancelled', requestId: job.requestId });
      return;
    }
    postMessage({
      type: 'chunk-end',
      requestId: job.requestId,
      chunks: index,
      generateMs: Date.now() - startedAt,
    });
  } catch (err) {
    postMessage({
      type: 'result-error',
      requestId: job.requestId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const job = queue.shift()!;
      if (cancelled.delete(job.requestId)) {
        postMessage({ type: 'result-cancelled', requestId: job.requestId });
        continue;
      }
      await runJob(job);
    }
  } finally {
    draining = false;
  }
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    handleInit();
  } else if (msg.type === 'generate') {
    queue.push(msg);
    void drain();
  } else if (msg.type === 'cancel') {
    const queuedIndex = queue.findIndex((job) => job.requestId === msg.requestId);
    if (queuedIndex >= 0) {
      queue.splice(queuedIndex, 1);
      postMessage({ type: 'result-cancelled', requestId: msg.requestId });
    } else {
      // Either already running (can't interrupt WASM) or not seen yet.
      cancelled.add(msg.requestId);
    }
  }
};
