# Morning Coach

Part of the 30AppsBySep30 challenge. An installable web app for mornings when deciding what to do first is the hardest part. Pick a coach, pick a script, and get walked through one tiny instruction at a time — done, easier, or skip, nothing else to plan.

## Run it

```bash
npm install
npm run dev
```

## What's here

- **Core loop**: `/routines` + `/coaches` pick the script and personality, `/` runs the one-step-at-a-time coaching session, `/settings` covers voice, morning window, and launch setup.
- **12 original coaches** with distinct tone, avatar, and default voice (`src/data/coaches.ts`).
- **6 starter routines**, fully editable, plus a "build your own" flow with drag-to-reorder (`src/data/routines.ts`, `src/screens/RoutineEditor.tsx`).
- **Voice**: local, on-device text-to-speech via Kokoro-82M (no API key, no server, no subscription) with a browser-speech fallback. See `src/services/tts/`.
- Everything persists to `localStorage`. No accounts, no backend.

## Voice engine

Coach speech runs entirely in the browser using [Kokoro-82M](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) via `kokoro-js`, loaded and run inside a Web Worker (`src/services/tts/kokoro.worker.ts`) so synthesis never blocks the UI — Done/Skip/Easier stay clickable even mid-generation. `src/services/tts/voiceEngine.ts` is the only module the rest of the app talks to; it handles lazy loading, caching, timeouts, and falling back to the browser's built-in voice if Kokoro can't start.

First use downloads the model (cached by the browser afterward). No environment variables or manual setup are required — `npm install` is the only step.
