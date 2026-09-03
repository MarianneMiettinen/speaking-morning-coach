import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CoachAvatar } from '../components/CoachAvatar';
import { ProgressPath } from '../components/ProgressPath';
import { isWithinMorningWindow, todayKey } from '../lib/storage';
import { initializeVoice, prewarm, speak, stop as stopVoice, useVoiceEngineState } from '../services/tts/voiceEngine';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Phase = 'launch' | 'active' | 'complete';

export function Session() {
  const { settings, progress, updateProgress, coach, routine } = useApp();
  const [phase, setPhase] = useState<Phase>('launch');
  const [stepIndex, setStepIndex] = useState(0);
  const [rescued, setRescued] = useState(false);
  const [overthinking, setOverthinking] = useState(false);
  const [parkText, setParkText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const hasStartedSpeech = useRef(false);
  const engine = useVoiceEngineState();

  const doneToday = progress.lastMorningCompleted === todayKey();
  const step = routine.steps[stepIndex];
  const total = routine.steps.length;
  const voiceOn = settings.voiceEnabled;
  const voiceId = settings.voiceOverride ?? coach.defaultVoiceId;

  function speakLine(text: string) {
    if (!voiceOn) return;
    speak(text, { voiceId, rate: settings.speechRate, backend: settings.voiceBackend });
  }

  useEffect(() => {
    return () => stopVoice();
  }, []);

  useEffect(() => {
    if (phase !== 'active') return;
    setRescued(false);
    setOverthinking(false);
    setExpanded(false);
    if (!voiceOn || !settings.autoReadNext) return;
    const text = stepIndex === 0 && !hasStartedSpeech.current
      ? `${pick(coach.greetingLines)} ${step.speech ?? step.instruction}`
      : step.speech ?? step.instruction;
    hasStartedSpeech.current = true;
    speakLine(text);
    const next = routine.steps[stepIndex + 1];
    if (next) prewarm(next.speech ?? next.instruction, voiceId, settings.speechRate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex]);

  function startMorning() {
    hasStartedSpeech.current = false;
    setStepIndex(0);
    setPhase('active');
    if (voiceOn && settings.voiceBackend === 'auto') initializeVoice();
  }

  function advance() {
    stopVoice();
    if (stepIndex + 1 >= total) {
      setPhase('complete');
      updateProgress({ lastMorningCompleted: todayKey(), lastSessionDate: todayKey() });
      speakLine(pick(coach.completionLines));
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handleMakeEasier() {
    setRescued(true);
    setOverthinking(false);
    speakLine(`${pick(coach.stuckLines)} ${step.easierVersion ?? step.instruction}`);
  }

  function handleOverthinking() {
    setOverthinking(true);
    setRescued(false);
    speakLine("You don't need to solve that now.");
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

  const themeClass = `theme-${coach.theme}`;
  const voiceWarming = voiceOn && settings.voiceBackend === 'auto' && engine.status === 'loading';

  if (phase === 'launch') {
    const inWindow = isWithinMorningWindow(settings);
    return (
      <div className={`screen launch-screen ${themeClass}`}>
        <div className="launch-card">
          <CoachAvatar coach={coach} size={120} />
          <h1>{coach.name}</h1>
          <p className="greeting-line">{pick(coach.greetingLines)}</p>
          {doneToday ? (
            <>
              <p className="status-line">Morning routine completed ✓</p>
              <div className="launch-actions">
                <button className="btn-primary" onClick={startMorning}>Run again</button>
                <Link className="btn-secondary" to="/routines">Edit routine</Link>
              </div>
            </>
          ) : (
            <>
              <p className="status-line">{routine.name}{!inWindow ? ' · outside your usual morning window' : ''}</p>
              <button className="btn-primary btn-huge" onClick={startMorning}>
                START MORNING →
              </button>
            </>
          )}
          <div className="launch-links">
            <Link to="/coaches">Change coach</Link>
            <Link to="/routines">Change routine</Link>
            <Link to="/settings">Settings</Link>
          </div>
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
        <button className="btn-primary btn-huge" onClick={() => setPhase('launch')}>
          BEGIN DAY →
        </button>
      </div>
    );
  }

  const displayTitle = rescued ? 'MAKE IT SMALLER' : step.title;
  const displayInstruction = rescued ? step.easierVersion ?? step.instruction : step.instruction;
  const longText = step.speech && step.speech !== step.instruction ? step.speech : null;

  return (
    <div className={`screen active-screen ${themeClass}`}>
      <div className="active-top">
        <CoachAvatar coach={coach} size={72} />
        <span className="coach-name-small">{coach.name}</span>
      </div>

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
            {step.optional && <button onClick={advance}>Skip</button>}
            {voiceOn && <button onClick={replay}>🔊 Replay</button>}
          </div>
          {voiceWarming && <p className="voice-warming">Preparing your coach&apos;s voice…</p>}
        </div>
      )}

      <ProgressPath total={total} current={stepIndex} accent={coach.accent} />

      <button className="pause-link" onClick={() => { stopVoice(); setPhase('launch'); }}>
        Pause
      </button>
    </div>
  );
}
