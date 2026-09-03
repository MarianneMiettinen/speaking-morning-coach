import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { achievements } from '../data/achievements';

export function Achievements() {
  const { progress } = useApp();
  const navigate = useNavigate();

  return (
    <div className="screen achievements-screen">
      <h1>Achievements</h1>
      <p className="picker-sub">
        Not about a perfect streak — about showing up, and showing up again after a break.
      </p>

      <div className="achievement-stats">
        <div className="achievement-stat">
          <div className="achievement-stat-value">{progress.totalCompletions}</div>
          <div className="achievement-stat-label">Mornings completed</div>
        </div>
        <div className="achievement-stat">
          <div className="achievement-stat-value">{progress.coachesUsed.length}</div>
          <div className="achievement-stat-label">Coaches tried</div>
        </div>
        <div className="achievement-stat">
          <div className="achievement-stat-value">{progress.routinesUsed.length}</div>
          <div className="achievement-stat-label">Scripts tried</div>
        </div>
        <div className="achievement-stat">
          <div className="achievement-stat-value">{progress.welcomeBackCount}</div>
          <div className="achievement-stat-label">Comebacks</div>
        </div>
      </div>

      <div className="achievement-grid">
        {achievements.map((a) => {
          const unlocked = progress.unlockedAchievements.includes(a.id) || a.isUnlocked(progress);
          return (
            <div key={a.id} className={`achievement-card ${unlocked ? '' : 'locked'}`}>
              <span className="achievement-icon">{a.icon}</span>
              <div>
                <h3>{a.title}</h3>
                <p>{a.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {progress.parkedThoughts.length > 0 && (
        <>
          <h2 className="section-divider">Parked thoughts</h2>
          <div className="routine-list">
            {progress.parkedThoughts.map((t, i) => (
              <div key={i} className="step-card">
                <span className="step-card-text">{t}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="btn-primary" onClick={() => navigate('/')}>Back to Morning Coach</button>
    </div>
  );
}
