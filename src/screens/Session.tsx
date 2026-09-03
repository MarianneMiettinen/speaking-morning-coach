import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CoachAvatar } from '../components/CoachAvatar';
import { CoachHero } from '../components/CoachHero';
import { ProgressPath } from '../components/ProgressPath';
import { daysBetween, isWithinMorningWindow, todayKey } from '../lib/storage';
import { getNewlyUnlocked, type Achievement } from '../data/achievements';
import type { ProgressState, Routine } from '../types';
import {
  initializeVoice,
  prewarm,
  speak,
  stop as stopVoice,
  useVoiceEngineState,
  useVoiceJustReady,
} from '../services/tts/voiceEngine';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickLoreIndex(total: number): number {
  if (total <= 2) return -1;
  return 1 + Math.floor(Math.random() * (total - 2));
}

type Phase = 'launch' | 'intro' | 'active' | 'complete';

export function Session() {
  const { settings, updateSettings, progress, updateProgress, coach, routine, allRoutines } = useApp();
  const [phase, setPhase] = useState<Phase>('launch');
  const [stepIndex, setStepIndex] = useState(0);
  const [rescued, setRescued] = useState(false);
  const [overthinking, setOverthinking] = useState(false);
  const [parkText, setParkText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [introText, setIntroText] = useState('');
  const hasStartedSpeech = useRef(false);
  const loreIndexRef = useRef(-1);
  const engine = useVoiceEngineState();
  const voiceJustReady = useVoiceJustReady();

  const doneToday = progress.lastMorningCompleted === todayKey();
  const step = routine.steps[stepIndex];
  const total = routine.steps.length;
  const voiceOn = settings.voiceEnabled;
  const voiceId = settings.voiceOverride ?? coach.defaultVoiceId;
  const resumable =
    !doneToday &&
    !!progress.activeSession &&
    progress.activeSession.routineId === routine.id &&
    progress.activeSession.stepIndex < total;

  function nameOpener() {
    return settings.userName ? `${settings.userName}. ` : '';
  }

  function speakLine(text: string) {
    if (!voiceOn) return;
    speak(text, { voiceId, rate: settings.speechRate, backend: settings.voiceBackend });
  }

  useEffect(() => {
    return () => stopVoice();
  }, []);

  // Persist progress mid-routine so a closed tab/phone can resume later.
  useEffect(() => {
    if (phase !== 'active') return;
    updateProgress({
      activeSession: {
        routineId: routine.id,
        coachId: coach.id,
        stepIndex,
        rescued,
        updatedAt: new Date().toISOString(),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex, rescued]);

  useEffect(() => {
    if (phase !== 'active') return;
    setRescued(false);
    setOverthinking(false);
    setExpanded(false);
    if (!voiceOn || !settings.autoReadNext) return;
    const text = stepIndex === 0 && !hasStartedSpeech.current
      ? `${nameOpener()}${pick(coach.greetingLines)} ${step.speech ?? step.instruction}`
      : step.speech ?? step.instruction;
    hasStartedSpeech.current = true;
    speakLine(text);
    const next = routine.steps[stepIndex + 1];
    if (next) prewarm(next.speech ?? next.instruction, voiceId, settings.speechRate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex]);

  function beginActiveRoutine(startIndex: number, resumedRescued: boolean, skipGreeting: boolean) {
    hasStartedSpeech.current = skipGreeting;
    setStepIndex(startIndex);
    setRescued(resumedRescued);
    setPhase('active');
    if (voiceOn && settings.voiceBackend === 'auto') initializeVoice();
  }

  function startMorning() {
    loreIndexRef.current = pickLoreIndex(total);
    const alreadyIntroduced = progress.introducedCoaches.includes(coach.id);
    if (!alreadyIntroduced) {
      const line = pick(coach.introLines);
      setIntroText(line);
      setPhase('intro');
      speakLine(`${nameOpener()}${line}`);
      return;
    }
    beginActiveRoutine(0, false, false);
  }

  function confirmIntro() {
    updateProgress({ introducedCoaches: [...progress.introducedCoaches, coach.id] });
    // The intro screen already said hello and used the name slot — don't repeat it.
    beginActiveRoutine(0, false, true);
  }

  function resumeSession() {
    if (!progress.activeSession) return;
    loreIndexRef.current = -1;
    beginActiveRoutine(progress.activeSession.stepIndex, progress.activeSession.rescued, true);
  }

  function startOver() {
    loreIndexRef.current = pickLoreIndex(total);
    beginActiveRoutine(0, false, false);
  }

  function completeRoutine() {
    const today = todayKey();
    const gapDays = progress.lastMorningCompleted ? daysBetween(progress.lastMorningCompleted, today) : null;
    const isWelcomeBack = gapDays !== null && gapDays >= 3;
    const before: ProgressState = progress;
    const after: ProgressState = {
      ...before,
      lastMorningCompleted: today,
      lastSessionDate: today,
      activeSession: null,
      totalCompletions: before.totalCompletions + 1,
      completionDates: [...before.completionDates, today].slice(-90),
      coachesUsed: Array.from(new Set([...before.coachesUsed, coach.id])),
      routinesUsed: Array.from(new Set([...before.routinesUsed, routine.id])),
      welcomeBackCount: before.welcomeBackCount + (isWelcomeBack ? 1 : 0),
    };
    const unlocked = getNewlyUnlocked(before, after);
    after.unlockedAchievements = Array.from(new Set([...before.unlockedAchievements, ...unlocked.map((a) => a.id)]));
    updateProgress(after);
    setNewAchievements(unlocked);
  }

  function advance() {
    stopVoice();
    if (stepIndex + 1 >= total) {
      setPhase('complete');
      completeRoutine();
      speakLine(`${nameOpener()}${pick(coach.completionLines)}`);
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function goBack() {
    if (stepIndex === 0) return;
    stopVoice();
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function handleMakeEasier() {
    setRescued(true);
    setOverthinking(false);
    updateProgress({ easierUsedCount: progress.easierUsedCount + 1 });
    speakLine(`${pick(coach.stuckLines)} ${step.easierVersion ?? step.instruction}`);
  }

  function handleOverthinking() {
    setOverthinking(true);
    setRescued(false);
    speakLine(`${pick(coach.stuckLines)} You don't need to solve that now.`);
  }

  function parkThought() {
    if (parkText.trim()) {
      updateProgress({ parkedThoughts: [...progress.parkedThoughts, parkText.trim()] });
    }
    setParkText('');
    setOverthinking(false);
  }

  function replay() {
    const text = rescued ? step.easierVersion ?? step.instruction : step.speech ?? step.instruction;
    speakLine(text);
  }

  function switchRoutine(id: string) {
    updateSettings({ routineId: id });
  }

  const themeClass = `theme-${coach.theme}`;
  const voiceWarming = voiceOn && settings.voiceBackend === 'auto' && engine.status === 'loading';

  if (phase === 'launch') {
    const inWindow = isWithinMorningWindow(settings);
    return (
      <div className={`screen launch-screen ${themeClass}`}>
        <div className="launch-card">
          <CoachHero coach={coach} />
          <p className="greeting-line">{pick(coach.greetingLines)}</p>

          {doneToday ? (
            <>
              <p className="status-line">Morning routine completed ✓</p>
              <div className="launch-actions">
                <button className="btn-primary" onClick={startMorning}>Run again</button>
                <Link className="btn-secondary" to="/routines">Edit routine</Link>
              </div>
            </>
          ) : resumable ? (
            <div className="resume-banner">
              <p className="status-line">
                You paused at step {(progress.activeSession?.stepIndex ?? 0) + 1} of {total}.
              </p>
              <div className="launch-actions">
                <button className="btn-primary" onClick={resumeSession}>Continue where you left off →</button>
                <button className="btn-secondary" onClick={startOver}>Start over</button>
              </div>
            </div>
          ) : (
            <>
              <p className="status-line">{routine.name}{!inWindow ? ' · outside your usual morning window' : ''}</p>
              <button className="btn-primary btn-huge" onClick={startMorning}>
                START MORNING →
              </button>
            </>
          )}

          {voiceJustReady && <div className="toast">🔊 Coach voice ready</div>}

          <div className="quick-switch">
            <span className="quick-switch-label">Morning script</span>
            <select value={routine.id} onChange={(e) => switchRoutine(e.target.value)}>
              {allRoutines.map((r: Routine) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.badge ? ` — ${r.badge}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="launch-links">
            <Link to="/coaches">Change coach</Link>
            <Link to="/routines">Change routine</Link>
            <Link to="/achievements">Achievements</Link>
            <Link to="/settings">Settings</Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className={`screen launch-screen ${themeClass}`}>
        <div className="launch-card">
          <CoachHero coach={coach} />
          <p className="greeting-line">{settings.userName ? `${settings.userName} — ` : ''}{introText}</p>
          <button className="btn-primary btn-huge" onClick={confirmIntro}>
            BEGIN →
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className={`screen complete-screen ${themeClass}`}>
        <CoachAvatar coach={coach} size={160} />
        <h1>MORNING COMPLETE</h1>
        <p className="complete-line">{pick(coach.completionLines)}</p>
        <p className="complete-sub">You don't need the whole day figured out.</p>
        <p className="complete-next">Your next mission: open your first meaningful task.</p>
        {newAchievements.length > 0 && (
          <div className="toast toast-achievement" style={{ position: 'static', transform: 'none', margin: '16px 0' }}>
            🏆 Achievement unlocked: {newAchievements.map((a) => a.title).join(', ')}
          </div>
        )}
        <button className="btn-primary btn-huge" onClick={() => { setNewAchievements([]); setPhase('launch'); }}>
          BEGIN DAY →
        </button>
      </div>
    );
  }

  const displayTitle = rescued ? 'MAKE IT SMALLER' : step.title;
  const displayInstruction = rescued ? step.easierVersion ?? step.instruction : step.instruction;
  const longText = step.speech && step.speech !== step.instruction ? step.speech : null;
  const showLore = !rescued && !overthinking && stepIndex === loreIndexRef.current;

  return (
    <div className={`screen active-screen ${themeClass}`}>
      <div className="active-top-row">
        <button className="back-step-btn" onClick={goBack} disabled={stepIndex === 0} aria-label="Previous step">
          ‹ Back
        </button>
      </div>
      <CoachHero coach={coach} compact />

      {overthinking ? (
        <div className="overthinking-card">
          <p className="overthinking-line">You don't need to solve that now.</p>
          <input
            className="park-input"
            placeholder="Park this thought (optional)"
            value={parkText}
            onChange={(e) => setParkText(e.target.value)}
          />
          <button className="btn-primary" onClick={parkThought}>Back to the step →</button>
        </div>
      ) : (
        <div className="instruction-card">
          <h1 className="instruction-title">{displayTitle}</h1>
          <p className="instruction-text">{displayInstruction}</p>

          {longText && !rescued && (
            <button className="expand-toggle" onClick={() => setExpanded((v) => !v)}>
              {expanded ? '▴ Less' : '▾ More'}
            </button>
          )}
          {expanded && longText && !rescued && <p className="instruction-expanded">{longText}</p>}

          <button className="btn-primary btn-huge" onClick={advance}>
            {rescued ? 'DONE →' : 'I DID IT →'}
          </button>

          <div className="secondary-controls">
            {!rescued && step.easierVersion && (
              <button onClick={handleMakeEasier}>Make this easier</button>
            )}
            <button onClick={handleOverthinking}>I'm overthinking</button>
            <button onClick={advance}>Skip</button>
            {voiceOn && <button onClick={replay}>🔊 Replay</button>}
          </div>
          {voiceWarming && <p className="voice-warming">Preparing your coach&apos;s voice…</p>}
          {showLore && <p className="lore-aside">{pick(coach.loreLines)}</p>}
        </div>
      )}

      <ProgressPath total={total} current={stepIndex} accent={coach.accent} />

      <button className="pause-link" onClick={() => { stopVoice(); setPhase('launch'); }}>
        Pause
      </button>
      {voiceJustReady && <div className="toast">🔊 Coach voice ready</div>}
    </div>
  );
}
