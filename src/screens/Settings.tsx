import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getVoices, isSpeechSupported } from '../lib/speech';
import { CURATED_VOICES, PREVIEW_TEXT, getCuratedVoice } from '../services/tts/voices';
import { initializeVoice, retryVoice, speak, unlockAudio, useVoiceEngineState } from '../services/tts/voiceEngine';
import { SideMenu } from '../components/SideMenu';

export function Settings() {
  const { settings, updateSettings, coach, routine } = useApp();
  const navigate = useNavigate();
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const engine = useVoiceEngineState();

  useEffect(() => {
    if (!isSpeechSupported()) return;
    const load = () => setBrowserVoices(getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  const resolvedVoiceId = settings.voiceOverride ?? coach.defaultVoiceId;
  const usingBrowserFallback = settings.voiceBackend === 'browser';

  function previewVoice(voiceId: string) {
    unlockAudio();
    speak(PREVIEW_TEXT, { voiceId, rate: settings.speechRate, backend: settings.voiceBackend });
    if (!usingBrowserFallback) initializeVoice();
  }

  return (
    <div className="screen settings-screen">
      <SideMenu />
      <h1>Settings</h1>

      <section>
        <h2>Personalization</h2>
        <label>
          Your name (optional — used sparingly, never forced)
          <input
            type="text"
            value={settings.userName ?? ''}
            placeholder="e.g. Marianne"
            onChange={(e) => updateSettings({ userName: e.target.value.trim() || null })}
          />
        </label>
        <button className="btn-secondary" onClick={() => navigate('/achievements')}>🏆 Achievements</button>
      </section>

      <section>
        <h2>Coach</h2>
        <p>{coach.name} — {coach.description}</p>
        <button className="btn-secondary" onClick={() => navigate('/coaches')}>Change coach</button>
      </section>

      <section>
        <h2>Voice</h2>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.voiceEnabled}
            onChange={(e) => { unlockAudio(); updateSettings({ voiceEnabled: e.target.checked }); }}
          />
          Voice on
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.autoReadNext}
            onChange={(e) => updateSettings({ autoReadNext: e.target.checked })}
          />
          Auto-speak each new step
        </label>

        {settings.voiceEnabled && (
          <>
            <label>
              Coach voice
              <select
                value={settings.voiceOverride ?? ''}
                onChange={(e) => updateSettings({ voiceOverride: e.target.value || null })}
              >
                <option value="">Coach default ({getCuratedVoice(coach.defaultVoiceId).label})</option>
                {CURATED_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </label>
            <button className="btn-secondary" onClick={() => previewVoice(resolvedVoiceId)}>
              ▶ Preview voice
            </button>

            <label>
              Speaking speed: {settings.speechRate.toFixed(1)}x
              <input
                type="range"
                min="0.6"
                max="1.6"
                step="0.1"
                value={settings.speechRate}
                onChange={(e) => updateSettings({ speechRate: Number(e.target.value) })}
              />
            </label>

            {!usingBrowserFallback && engine.status === 'loading' && (
              <p className="status-line">
                Preparing your coach&apos;s voice{engine.progress > 0 ? `… ${engine.progress}%` : '…'}<br />
                <span className="voice-note">First time only — your coach&apos;s natural voice runs on your device, so there are no voice subscription fees.</span>
              </p>
            )}

            {!usingBrowserFallback && engine.status === 'error' && (
              <div className="voice-error">
                <p className="status-line">Natural voice couldn&apos;t start on this device.</p>
                <div className="launch-actions">
                  <button className="btn-secondary" onClick={() => retryVoice()}>Try again</button>
                  <button className="btn-secondary" onClick={() => updateSettings({ voiceBackend: 'browser' })}>
                    Use device voice instead
                  </button>
                </div>
              </div>
            )}

            {usingBrowserFallback && (
              <div className="voice-error">
                <p className="status-line">Using your device&apos;s built-in voice instead of your coach&apos;s natural voice.</p>
                <button className="btn-secondary" onClick={() => { updateSettings({ voiceBackend: 'auto' }); initializeVoice(); }}>
                  Try natural voice again
                </button>
                {isSpeechSupported() && browserVoices.length > 0 && (
                  <label>
                    Device voice
                    <select
                      value={settings.voiceURI ?? ''}
                      onChange={(e) => updateSettings({ voiceURI: e.target.value || null })}
                    >
                      <option value="">Default</option>
                      {browserVoices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <h2>Morning routine</h2>
        <p>{routine.name}</p>
        <button className="btn-secondary" onClick={() => navigate('/routines')}>Choose / edit routine</button>
      </section>

      <section>
        <h2>Morning window</h2>
        <label>
          Starts
          <input
            type="time"
            value={settings.morningWindowStart}
            onChange={(e) => updateSettings({ morningWindowStart: e.target.value })}
          />
        </label>
        <label>
          Ends
          <input
            type="time"
            value={settings.morningWindowEnd}
            onChange={(e) => updateSettings({ morningWindowEnd: e.target.value })}
          />
        </label>
      </section>

      <section>
        <h2>Morning launch</h2>
        <p><strong>Windows:</strong> Install this page as an app (browser menu → Install app), then drag the installed app&apos;s shortcut into your Startup folder (<code>Win+R</code>, type <code>shell:startup</code>, Enter) so it opens automatically when you log in.</p>
        <p><strong>Phone:</strong> Add Morning Coach to your home screen from your browser&apos;s share/menu button for a one-tap launch. If your phone has an automation app (like Shortcuts on iPhone, or a routine feature on Android), set it to open this page at your wake-up time.</p>
      </section>

      <section>
        <h2>Accessibility</h2>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.reduceMotion}
            onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
          />
          Reduce motion
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.largerText}
            onChange={(e) => updateSettings({ largerText: e.target.checked })}
          />
          Larger text
        </label>
      </section>

      <section>
        <h2>Future</h2>
        <p className="status-line">Evening Coach — coming soon</p>
      </section>

      <button className="btn-primary" onClick={() => navigate('/')}>Back to Morning Coach</button>
    </div>
  );
}
