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
  introLines: string[];
  loreLines: string[];
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
  badge?: string;
}

export interface AppSettings {
  userName: string | null;
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

export interface ActiveSession {
  routineId: string;
  coachId: string;
  stepIndex: number;
  rescued: boolean;
  updatedAt: string;
}

export interface ProgressState {
  lastMorningCompleted: string | null;
  lastSessionDate: string | null;
  parkedThoughts: string[];
  activeSession: ActiveSession | null;
  totalCompletions: number;
  completionDates: string[];
  coachesUsed: string[];
  routinesUsed: string[];
  introducedCoaches: string[];
  easierUsedCount: number;
  welcomeBackCount: number;
  unlockedAchievements: string[];
}
