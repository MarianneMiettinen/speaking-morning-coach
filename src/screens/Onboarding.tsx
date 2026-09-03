import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CoachPicker } from './CoachPicker';
import { routines } from '../data/routines';
import { isSpeechSupported } from '../lib/speech';
import { initializeVoice, retryVoice, useVoiceEngineState } from '../services/tts/voiceEngine';

type Step = 'welcome' | 'coach' | 'routine' | 'voice' | 'voiceLoading' | 'install' | 'ready';

const recommendedIds = ['minimum-morning', 'workday-launch', 'calm-morning'];

export function Onboarding() {
  const { updateSettings, coach } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const engine = useVoiceEngineState();

  function finish() {
    updateSettings({ onboardingComplete: true });
    navigate('/');
  }

  if (step === 'welcome') {
    return (
      <div className="screen onboard-screen">
        <h1>Mornings shouldn&apos;t require twenty decisions.</h1>
        <p>Morning Coach gives you one instruction at a time.</p>
        <button className="btn-primary btn-huge" onClick={() => setStep('coach')}>Continue</button>
      </div>
    );
  }

  if (step === 'coach') {
    return (
      <div className="screen onboard-screen">
        <CoachPicker onSelect={() => setStep('routine')} />
      </div>
    );
  }

  if (step === 'routine') {
    return (
      <div className="screen onboard-screen">
        <h1>Choose your starting routine</h1>
        <div className="routine-list">
          {routines
            .filter((r) => recommendedIds.includes(r.id))
            .map((r) => (
              <button
                key={r.id}
                className="routine-card onboard-routine-card"
                onClick={() => {
                  updateSettings({ routineId: r.id });
                  setStep('voice');
                }}
              >
                {r.badge && <span className="routine-badge">{r.badge}</span>}
                <h3>{r.name}</h3>
                <p>{r.description}</p>
              </button>
            ))}
        </div>
        <button className="btn-secondary" onClick={() => setStep('voice')}>Customize later</button>
      </div>
    );
  }

  if (step === 'voice') {
    return (
      <div className="screen onboard-screen">
        <h1>Should your coach speak aloud?</h1>
        <p>Your coach&apos;s voice runs privately on your own device — no accounts, no subscriptions.</p>
        <div className="launch-actions">
          <button
            className="btn-primary"
            onClick={() => {
              updateSettings({ voiceEnabled: true, voiceBackend: 'auto' });
              initializeVoice();
              setStep('voiceLoading');
            }}
          >
            Yes
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              updateSettings({ voiceEnabled: false });
              setStep('install');
            }}
          >
            No
          </button>
        </div>
      </div>
    );
  }

  if (step === 'voiceLoading') {
    return (
      <div className="screen onboard-screen">
        <h1>Preparing your coach&apos;s voice</h1>
        {engine.status === 'error' ? (
          <>
            <p className="status-line">Natural voice couldn&apos;t start on this device.</p>
            <div className="launch-actions">
              <button className="btn-secondary" onClick={() => retryVoice()}>Try again</button>
              <button
                className="btn-secondary"
                onClick={() => { updateSettings({ voiceBackend: 'browser' }); setStep('install'); }}
              >
                {isSpeechSupported() ? 'Use device voice instead' : 'Continue without voice'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              First time only, your coach downloads its natural voice model. This may take a little
              longer on the first run — after that, it&apos;s instant.
            </p>
            <p className="status-line">Downloading voice{engine.progress > 0 ? `… ${engine.progress}%` : '…'}</p>
          </>
        )}
        <button className="btn-secondary" onClick={() => setStep('install')}>
          Continue{engine.status !== 'ready' ? ' — voice will finish preparing in the background' : ''}
        </button>
      </div>
    );
  }

  if (step === 'install') {
    return (
      <div className="screen onboard-screen">
        <h1>Make Morning Coach easy to launch</h1>
        <p>
          Install this page to your home screen or desktop so it opens instantly, no browser tabs to hunt for.
          Look for &ldquo;Install app&rdquo; or &ldquo;Add to Home Screen&rdquo; in your browser&apos;s menu.
        </p>
        <p>You can revisit full setup instructions anytime in Settings → Morning Launch.</p>
        <button className="btn-primary btn-huge" onClick={() => setStep('ready')}>Continue</button>
      </div>
    );
  }

  return (
    <div className="screen onboard-screen">
      <h1>You&apos;re set.</h1>
      <p>{coach.name} is ready when you are.</p>
      <button className="btn-primary btn-huge" onClick={finish}>START MY FIRST MORNING →</button>
    </div>
  );
}
