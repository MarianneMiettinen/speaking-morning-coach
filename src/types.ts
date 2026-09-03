export type Archetype =
  | 'wandering-scholar'
  | 'energetic-drill'
  | 'calm-command'
  | 'night-guardian'
  | 'veteran-trainer'
  | 'tiny-sage'
  | 'patient-teacher'
  | 'noble-ranger'
  | 'reluctant-adventurer'
  | 'flamboyant-spirit'
  | 'inspiring-teacher'
  | 'majestic-guardian';

export type CoachTheme = 'dusk' | 'parchment' | 'forest' | 'ember' | 'twilight';

export interface Coach {
  id: string;
  name: string;
  archetype: Archetype;
  description: string;
  tone: string;
  theme: CoachTheme;
  accent: string;
  defaultVoiceId: string;
  greetingLines: string[];
  encouragementLines: string[];
  stuckLines: string[];
  completionLines: string[];
  sampleLine: string;
}

export interface RoutineStep {
  id: string;
  title: string;
  instruction: string;
  speech?: string;
  easierVersion?: string;
  explanation?: string;
  estimatedSeconds?: number;
  optional?: boolean;
}

export type RoutineType = 'morning' | 'evening';

export interface Routine {
  id: string;
  name: string;
  description: string;
  type: RoutineType;
  steps: RoutineStep[];
  isCustom?: boolean;
  basedOn?: string;
}

export interface AppSettings {
  coachId: string;
  routineId: string;
  voiceEnabled: boolean;
  speechRate: number;
  voiceURI: string | null;
  voiceOverride: string | null;
  voiceBackend: 'auto' | 'browser';
  autoReadNext: boolean;
  morningWindowStart: string;
  morningWindowEnd: string;
  reduceMotion: boolean;
  largerText: boolean;
  onboardingComplete: boolean;
}

export interface ProgressState {
  lastMorningCompleted: string | null;
  lastSessionDate: string | null;
  parkedThoughts: string[];
}
