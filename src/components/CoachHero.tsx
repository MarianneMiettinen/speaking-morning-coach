import { useEffect, useState } from 'react';
import type { Coach } from '../types';
import { artSrcFor, CoachAvatar } from './CoachAvatar';

export function CoachHero({ coach, compact = false }: { coach: Coach; compact?: boolean }) {
  const [artFailed, setArtFailed] = useState(false);
  useEffect(() => setArtFailed(false), [coach.id]);

  if (artFailed) {
    return (
      <div className="coach-hero-fallback">
        <CoachAvatar coach={coach} size={compact ? 96 : 130} />
        <span className="coach-hero-name-plain">{coach.name}</span>
      </div>
    );
  }

  return (
    <div
      className={`coach-hero ${compact ? 'coach-hero-compact' : ''}`}
      style={{
        background: `radial-gradient(circle at 50% 25%, ${coach.accent}55, transparent 70%)`,
        boxShadow: `inset 0 0 0 2px ${coach.accent}55`,
      }}
    >
      <img
        src={artSrcFor(coach.id)}
        alt={coach.name}
        className="coach-hero-img"
        onError={() => setArtFailed(true)}
      />
      <div className="coach-hero-nameplate" style={{ background: `linear-gradient(to top, ${coach.accent}dd, transparent)` }}>
        <h1>{coach.name}</h1>
      </div>
    </div>
  );
}
