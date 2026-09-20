import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CoachPicker } from './CoachPicker';
import { Mascot } from '../components/Mascot';
import { routines } from '../data/routines';
import { prepareLines, unlockAudio, useVoiceEngineState } from '../services/tts/voiceEngine';
import { morningLines } from '../lib/voiceLines';
import { VoiceSetupPanel } from '../components/VoiceSetupPanel';

type Step = 'welcome' | 'coach' | 'routine' | 'voice' | 'voiceLoading' | 'install' | 'ready';

const recommendedIds = ['minimum-morning', 'workday-launch', 'calm-morning'];

export function Onboarding() {
  const { settings, updateSettings, coach, routine } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const engine = useVoiceEngineState();
  const allReady = engine.status === 'ready' && engine.prepareTotal === 0;

  function finish() {
    updateSettings({ onboardingComplete: true });
    navigate('/');
  }

  if (step === 'welcome') {
    return (
      <div className="screen onboard-screen">
        <Mascot size={128} />
        <p className="greeting-line">Hi. I&apos;m here to help you start your mornings.</p>
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
        <p className="voice-note">
          Setting up takes a couple of minutes once. After that your first morning runs with no
          waiting at all.
        </p>
        <div className="launch-actions">
          <button
            className="btn-primary btn-huge"
            onClick={() => {
              unlockAudio();
              updateSettings({ voiceEnabled: true, voiceBackend: 'auto' });
              setStep('voiceLoading');
              // Download the model, then synthesise every line of the coach and
              // routine already chosen on the previous screens, so the first
              // morning is instant rather than generating as it goes.
              void prepareLines(
                morningLines(coach, routine, settings.userName, { includeIntro: true }),
                settings.voiceOverride ?? coach.defaultVoiceId,
                settings.speechRate
              );
            }}
          >
            ✨ Magically set up the voices
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
        <h1>Setting up {coach.name}&apos;s voice</h1>
        {/* The same panel the home screen and settings use, so setup looks and
            behaves identically wherever it is started or resumed. */}
        <VoiceSetupPanel />

        <button className={allReady ? 'btn-primary btn-huge' : 'btn-secondary'} onClick={() => setStep('install')}>
          {allReady
            ? 'Continue'
            : 'Continue — setup keeps running, and you can watch it on the home screen'}
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
