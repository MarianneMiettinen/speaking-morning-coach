import { KokoroTTS } from 'kokoro-js';
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
          postMessage({ type: 'progress', progress: pct });
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
