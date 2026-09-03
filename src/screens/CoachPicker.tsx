import { useNavigate } from 'react-router-dom';
import { coaches, useApp } from '../context/AppContext';
import { CoachAvatar } from '../components/CoachAvatar';
import { SideMenu } from '../components/SideMenu';

export function CoachPicker({ onSelect }: { onSelect?: (id: string) => void }) {
  const { settings, updateSettings } = useApp();
  const navigate = useNavigate();

  function choose(id: string) {
    updateSettings({ coachId: id });
    if (onSelect) onSelect(id);
    else navigate('/');
  }

  return (
    <div className="screen picker-screen">
      {!onSelect && <SideMenu />}
      <h1>Choose your coach</h1>
      <p className="picker-sub">You can change this anytime.</p>
      <div className="coach-grid">
        {coaches.map((c) => (
          <button
            key={c.id}
            className={`coach-card ${settings.coachId === c.id ? 'selected' : ''}`}
            onClick={() => choose(c.id)}
          >
            <CoachAvatar coach={c} size={72} />
            <span className="coach-card-name">{c.name}</span>
            <span className="coach-card-desc">{c.description}</span>
            <span className="coach-card-sample">&ldquo;{c.sampleLine}&rdquo;</span>
          </button>
        ))}
      </div>
      {!onSelect && (
        <button className="btn-secondary" onClick={() => navigate('/')}>Back</button>
      )}
    </div>
  );
}
