import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CoachHero } from '../components/CoachHero';
import { SideMenu } from '../components/SideMenu';
import { VoiceSetupPanel } from '../components/VoiceSetupPanel';
import { Icon } from '../components/Icon';

export function VoiceSetup() {
  const { coach, routine, settings, updateSettings } = useApp();
  const navigate = useNavigate();

  return (
    <div className={`screen launch-screen theme-${coach.theme}`}>
      <SideMenu />
      <div className="launch-card">
        <CoachHero coach={coach} compact />
        <h2 className="voice-setup-title">Get {coach.name}&apos;s voice ready</h2>
        <p className="picker-sub">
          {coach.name} will speak {routine.name} aloud. Preparing it once means no pauses during your
          morning — it all runs on your device, with nothing to pay for.
        </p>

        <VoiceSetupPanel onDone={() => navigate('/')} />

        <div className="home-nav">
          <button className="nav-tile" onClick={() => navigate('/')}>
            <Icon name="home" size={26} />
            <span>Home</span>
          </button>
          {settings.voiceEnabled && (
            <button
              className="nav-tile"
              onClick={() => {
                updateSettings({ voiceEnabled: false });
                navigate('/');
              }}
            >
              <Icon name="close" size={26} />
              <span>No voice</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
