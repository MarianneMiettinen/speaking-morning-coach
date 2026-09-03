// Curated from Kokoro-82M v1.0's own published voice grades (kokoro-js README /
// model card "Overall Grade" column) — not a personal listening judgment.
// Female voices top out at A/A-/B-; male voices top out at C+, which is a real
// limitation of the open training data, not a bug in this integration.
export interface CuratedVoice {
  id: string;
  label: string;
  kokoroVoice: string;
  gender: 'male' | 'female';
  grade: string;
}

export const CURATED_VOICES: CuratedVoice[] = [
  { id: 'warmFemale', label: 'Warm Female', kokoroVoice: 'af_heart', gender: 'female', grade: 'A' },
  { id: 'calmFemale', label: 'Calm Female', kokoroVoice: 'af_nicole', gender: 'female', grade: 'B-' },
  { id: 'warmMale', label: 'Warm Male', kokoroVoice: 'am_puck', gender: 'male', grade: 'C+' },
  { id: 'calmMale', label: 'Calm Male', kokoroVoice: 'am_michael', gender: 'male', grade: 'C+' },
  { id: 'strongMale', label: 'Strong Male', kokoroVoice: 'am_fenrir', gender: 'male', grade: 'C+' },
];

export const PREVIEW_TEXT =
  "Good morning. You don't need to figure everything out yet. Let's just take the first step.";

export function getCuratedVoice(id: string | null | undefined): CuratedVoice {
  return CURATED_VOICES.find((v) => v.id === id) ?? CURATED_VOICES[0];
}
