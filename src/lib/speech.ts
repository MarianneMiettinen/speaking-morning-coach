const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function isSpeechSupported() {
  return supported;
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!supported) return [];
  return window.speechSynthesis.getVoices();
}

export function speak(text: string, opts: { rate?: number; voiceURI?: string | null } = {}) {
  if (!supported) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = opts.rate ?? 1;
  if (opts.voiceURI) {
    const voice = getVoices().find((v) => v.voiceURI === opts.voiceURI);
    if (voice) utterance.voice = voice;
  }
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (!supported) return;
  window.speechSynthesis.cancel();
}
