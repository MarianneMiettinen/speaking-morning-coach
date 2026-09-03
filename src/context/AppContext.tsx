import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppSettings, ProgressState, Routine } from '../types';
import {
  defaultSettings,
  loadCustomRoutines,
  loadProgress,
  loadSettings,
  saveCustomRoutines,
  saveProgress,
  saveSettings,
} from '../lib/storage';
import { routines as builtInRoutines } from '../data/routines';
import { coaches, getCoach } from '../data/coaches';

interface AppContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  progress: ProgressState;
  updateProgress: (patch: Partial<ProgressState>) => void;
  customRoutines: Routine[];
  allRoutines: Routine[];
  addOrUpdateCustomRoutine: (routine: Routine) => void;
  deleteCustomRoutine: (id: string) => void;
  coach: ReturnType<typeof getCoach>;
  routine: Routine;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [customRoutines, setCustomRoutines] = useState<Routine[]>(() => loadCustomRoutines());

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }

  function updateProgress(patch: Partial<ProgressState>) {
    setProgress((prev) => {
      const next = { ...prev, ...patch };
      saveProgress(next);
      return next;
    });
  }

  function addOrUpdateCustomRoutine(routine: Routine) {
    setCustomRoutines((prev) => {
      const idx = prev.findIndex((r) => r.id === routine.id);
      const next = idx >= 0 ? prev.map((r) => (r.id === routine.id ? routine : r)) : [...prev, routine];
      saveCustomRoutines(next);
      return next;
    });
  }

  function deleteCustomRoutine(id: string) {
    setCustomRoutines((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveCustomRoutines(next);
      return next;
    });
  }

  const allRoutines = useMemo(() => [...builtInRoutines, ...customRoutines], [customRoutines]);
  const coach = useMemo(() => getCoach(settings.coachId ?? defaultSettings.coachId), [settings.coachId]);
  const routine = useMemo(
    () => allRoutines.find((r) => r.id === settings.routineId) ?? allRoutines[0],
    [allRoutines, settings.routineId]
  );

  const value: AppContextValue = {
    settings,
    updateSettings,
    progress,
    updateProgress,
    customRoutines,
    allRoutines,
    addOrUpdateCustomRoutine,
    deleteCustomRoutine,
    coach,
    routine,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { coaches };
