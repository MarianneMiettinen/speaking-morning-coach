import { KokoroTTS } from 'kokoro-js';
import { env } from '@huggingface/transformers';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tts: any = null;
const fileProgress = new Map<string, number>();

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
type InMessage = InitMessage | GenerateMessage;

async function handleInit() {
  if (tts) {
    postMessage({ type: 'ready' });
    return;
  }
  // Threaded WASM needs cross-origin isolation (COOP/COEP) for
  // SharedArrayBuffer, which most static hosts don't enable — pin to a
  // single thread so this works everywhere without extra server config.
  if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
  try {
    tts = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (info: { status: string; file?: string; progress?: number }) => {
        if (info.status === 'progress' && info.file && typeof info.progress === 'number') {
          fileProgress.set(info.file, info.progress);
          const values = Array.from(fileProgress.values());
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          postMessage({ type: 'progress', progress: Math.round(avg) });
        }
      },
    });
    postMessage({ type: 'ready' });
  } catch (err) {
    postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
}

async function handleGenerate(msg: GenerateMessage) {
  try {
    if (!tts) throw new Error('Voice engine not initialized.');
    const audio = await tts.generate(msg.text, { voice: msg.voice, speed: msg.speed });
    const blob: Blob = audio.toBlob();
    const buffer = await blob.arrayBuffer();
    (postMessage as (message: unknown, transfer: Transferable[]) => void)(
      { type: 'result', requestId: msg.requestId, buffer, mime: blob.type || 'audio/wav' },
      [buffer]
    );
  } catch (err) {
    postMessage({
      type: 'result-error',
      requestId: msg.requestId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  if (e.data.type === 'init') handleInit();
  else if (e.data.type === 'generate') handleGenerate(e.data);
};
