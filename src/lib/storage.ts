import type { AppSettings, ProgressState, Routine } from '../types';

const SETTINGS_KEY = 'mc.settings';
const PROGRESS_KEY = 'mc.progress';
const CUSTOM_ROUTINES_KEY = 'mc.customRoutines';

export const defaultSettings: AppSettings = {
  coachId: 'elderwyn',
  routineId: 'minimum-morning',
  voiceEnabled: true,
  speechRate: 1,
  voiceURI: null,
  voiceOverride: null,
  voiceBackend: 'auto',
  autoReadNext: true,
  morningWindowStart: '05:00',
  morningWindowEnd: '12:00',
  reduceMotion: false,
  largerText: false,
  onboardingComplete: false,
};

const defaultProgress: ProgressState = {
  lastMorningCompleted: null,
  lastSessionDate: null,
  parkedThoughts: [],
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...defaultProgress };
    return { ...defaultProgress, ...JSON.parse(raw) };
  } catch {
    return { ...defaultProgress };
  }
}

export function saveProgress(progress: ProgressState) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function loadCustomRoutines(): Routine[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ROUTINES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomRoutines(routines: Routine[]) {
  localStorage.setItem(CUSTOM_ROUTINES_KEY, JSON.stringify(routines));
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function isWithinMorningWindow(settings: AppSettings, date = new Date()): boolean {
  const [startH, startM] = settings.morningWindowStart.split(':').map(Number);
  const [endH, endM] = settings.morningWindowEnd.split(':').map(Number);
  const minutes = date.getHours() * 60 + date.getMinutes();
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  if (start <= end) return minutes >= start && minutes <= end;
  return minutes >= start || minutes <= end;
}
