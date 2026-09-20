import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { isSpeechSupported } from '../lib/speech';
import { morningLines } from '../lib/voiceLines';
import { countPrepared, initializeVoice, resetVoiceDownload, retryVoice, useVoiceEngineState } from '../services/tts/voiceEngine';

function mb(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(0)} MB`;
}

/**
 * One place that answers "what is the voice doing right now". Rendered on the
 * home screen too, because the download outlives the setup screen it started
 * on — leaving that screen used to mean losing all sight of it.
 */
export function VoiceStatus() {
  const { settings, updateSettings, coach, routine } = useApp();
  const engine = useVoiceEngineState();
  const [resetting, setResetting] = useState(false);

  if (!settings.voiceEnabled) {
    return (
      <div className="voice-status">
        <p className="status-line">Your coach is silent — voice is switched off.</p>
        <Link className="btn-secondary" to="/voice-setup">
          🔊 Turn on your coach&apos;s voice
        </Link>
      </div>
    );
  }

  if (settings.voiceBackend === 'browser') {
    return (
      <div className="voice-status">
        <p className="status-line">Using your device&apos;s built-in voice.</p>
        <button
          className="btn-secondary"
          onClick={() => {
            updateSettings({ voiceBackend: 'auto' });
            initializeVoice();
          }}
        >
          Try the natural voice again
        </button>
      </div>
    );
  }

  // Second half of one-off setup: the model is here, the lines are being made.
  if (engine.prepareTotal > 0) {
    const pct = Math.round((engine.prepareDone / engine.prepareTotal) * 100);
    return (
      <div className="voice-status">
        <p className="status-line">
          Teaching your coach this morning&apos;s lines… {engine.prepareDone} of {engine.prepareTotal}
          {engine.prepareEtaMs !== null && engine.prepareEtaMs > 5000 && (
            <> · about {Math.ceil(engine.prepareEtaMs / 60000)} min left</>
          )}
        </p>
        <div className="voice-progress-track">
          <div className="voice-progress-fill" style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
        <p className="voice-note">
          Done once. After this your coach speaks the moment each step appears, with no pauses.
        </p>
      </div>
    );
  }

  if (engine.status === 'loading') {
    const hasBytes = engine.totalBytes > 0;
    const downloaded = engine.progress >= 100;
    return (
      <div className="voice-status">
        <p className="status-line">
          {downloaded ? (
            <>Almost ready — setting up the voice…</>
          ) : (
            <>
              Preparing your coach&apos;s voice… {engine.progress}%
              {hasBytes && ` (${mb(engine.loadedBytes)} of ${mb(engine.totalBytes)})`}
            </>
          )}
        </p>
        <div className="voice-progress-track">
          <div className="voice-progress-fill" style={{ width: `${Math.max(2, engine.progress)}%` }} />
        </div>
        <p className="voice-note">
          First time only — the voice runs on your device, so it downloads once and is then free forever.
          You can keep using the app while it finishes.
        </p>
      </div>
    );
  }

  if (engine.status === 'error') {
    return (
      <div className="voice-status voice-status-error">
        <p className="status-line">{engine.errorMessage ?? 'The voice could not start.'}</p>
        <div className="launch-actions">
          <button className="btn-secondary" onClick={() => retryVoice()}>Try again</button>
          <button
            className="btn-secondary"
            disabled={resetting}
            onClick={async () => {
              setResetting(true);
              try {
                await resetVoiceDownload();
              } finally {
                setResetting(false);
              }
            }}
          >
            {resetting ? 'Starting over…' : 'Download again from scratch'}
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

  // Installed but this morning is not prepared, or never set up at all. This
  // used to render nothing, so someone who skipped setup got a coach that
  // paused before every line with no hint that anything could be done.
  const lines = morningLines(coach, routine, settings.userName, { includeIntro: true });
  const { ready, total } = countPrepared(lines, settings.voiceOverride ?? coach.defaultVoiceId, settings.speechRate);
  void engine.preparedVersion; // re-render as lines finish caching
  if (total > 0 && ready >= total) return null; // nothing to nag about

  return (
    <div className="voice-status">
      <p className="status-line">
        {ready > 0
          ? `${ready} of ${total} lines ready — your coach pauses to make the rest.`
          : 'Your coach pauses before speaking, because each line is made as you reach it.'}
      </p>
      <Link className="btn-primary" to="/voice-setup">
        ✨ Set all voices ready for use
      </Link>
      <p className="voice-note">A couple of minutes once, then no pauses.</p>
    </div>
  );
}
