import { useApp } from '../context/AppContext';
import { morningLines } from '../lib/voiceLines';
import { isSpeechSupported } from '../lib/speech';
import {
  countPrepared,
  prepareLines,
  resetVoiceDownload,
  retryVoice,
  unlockAudio,
  useVoiceEngineState,
} from '../services/tts/voiceEngine';

function mb(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(0)} MB`;
}

/**
 * The whole voice setup experience in one place, so onboarding, the home
 * screen and settings all behave identically — including for someone who
 * skipped setup, started using the app, and is wondering why the coach pauses
 * before every line.
 */
export function VoiceSetupPanel({ onDone }: { onDone?: () => void }) {
  const { settings, updateSettings, coach, routine } = useApp();
  const engine = useVoiceEngineState();

  const voiceId = settings.voiceOverride ?? coach.defaultVoiceId;
  const lines = morningLines(coach, routine, settings.userName, { includeIntro: true });
  // preparedVersion is read so this recomputes as lines finish caching.
  const { ready, total } = countPrepared(lines, voiceId, settings.speechRate);
  void engine.preparedVersion;

  const allReady = engine.status === 'ready' && total > 0 && ready >= total;

  function startSetup() {
    unlockAudio(); // must happen inside the click for audio to work later
    if (!settings.voiceEnabled) updateSettings({ voiceEnabled: true, voiceBackend: 'auto' });
    void prepareLines(lines, voiceId, settings.speechRate);
  }

  if (settings.voiceBackend === 'browser') {
    return (
      <div className="voice-status">
        <p className="status-line">Using your device&apos;s built-in voice, which needs no setup.</p>
        <button className="btn-secondary" onClick={() => { updateSettings({ voiceBackend: 'auto' }); startSetup(); }}>
          Switch back to {coach.name}&apos;s natural voice
        </button>
      </div>
    );
  }

  if (engine.status === 'error') {
    return (
      <div className="voice-status voice-status-error">
        <p className="status-line">{engine.errorMessage ?? 'The voice could not start.'}</p>
        <div className="launch-actions">
          <button className="btn-secondary" onClick={() => retryVoice()}>Try again</button>
          <button className="btn-secondary" onClick={() => void resetVoiceDownload()}>
            Download again from scratch
          </button>
          {isSpeechSupported() && (
            <button className="btn-secondary" onClick={() => updateSettings({ voiceBackend: 'browser' })}>
              Use device voice instead
            </button>
          )}
        </div>
      </div>
    );
  }

  if (engine.prepareTotal > 0) {
    const pct = Math.round((engine.prepareDone / engine.prepareTotal) * 100);
    return (
      <div className="voice-status">
        <p className="status-line">
          Getting {coach.name} ready… {engine.prepareDone} of {engine.prepareTotal}
          {engine.prepareEtaMs !== null && engine.prepareEtaMs > 5000 && (
            <> · about {Math.ceil(engine.prepareEtaMs / 60000)} min left</>
          )}
        </p>
        <div className="voice-progress-track">
          <div className="voice-progress-fill" style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
        <p className="voice-note">
          You can leave this screen — it keeps going, and the earliest lines are finished first.
        </p>
      </div>
    );
  }

  if (engine.status === 'loading') {
    const downloaded = engine.progress >= 100;
    return (
      <div className="voice-status">
        <p className="status-line">
          {downloaded
            ? 'Almost there — installing the voice…'
            : `Downloading the voice… ${engine.progress}%${
                engine.totalBytes > 0 ? ` (${mb(engine.loadedBytes)} of ${mb(engine.totalBytes)})` : ''
              }`}
        </p>
        <div className="voice-progress-track">
          <div className="voice-progress-fill" style={{ width: `${Math.max(2, engine.progress)}%` }} />
        </div>
        <p className="voice-note">This part happens once, then it is stored on your device.</p>
      </div>
    );
  }

  if (allReady) {
    return (
      <div className="voice-status">
        <p className="status-line">✓ {coach.name} is ready — every line of this morning will play instantly.</p>
        {onDone && (
          <button className="btn-primary" onClick={onDone}>
            Continue
          </button>
        )}
      </div>
    );
  }

  // Installed but this morning's lines are not made yet — the case where the
  // coach still pauses before speaking and nothing on screen explained why.
  return (
    <div className="voice-status">
      <p className="status-line">
        {ready > 0
          ? `${ready} of ${total} lines ready — the rest are made as you go, which is why the coach pauses.`
          : 'Your coach can speak, but each line is made as you reach it — so there is a pause before every one.'}
      </p>
      <div className="voice-progress-track">
        <div
          className="voice-progress-fill"
          style={{ width: `${total > 0 ? Math.max(2, Math.round((ready / total) * 100)) : 2}%` }}
        />
      </div>
      <button className="btn-primary btn-huge" onClick={startSetup}>
        ✨ Set all voices ready for use
      </button>
      <p className="voice-note">Takes a couple of minutes once. After that the coach never pauses.</p>
    </div>
  );
}
