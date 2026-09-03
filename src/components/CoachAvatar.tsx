import { useEffect, useState, type ReactElement } from 'react';
import type { Coach } from '../types';

const SHAPES: Record<Coach['archetype'], (accent: string) => ReactElement> = {
  'wandering-scholar': (accent) => (
    <>
      <path d="M50 20 L78 34 L50 48 L22 34 Z" fill={accent} opacity={0.9} />
      <rect x="46" y="48" width="8" height="30" rx="3" fill={accent} />
      <circle cx="50" cy="34" r="4" fill="#fff" opacity={0.8} />
    </>
  ),
  'energetic-drill': (accent) => (
    <>
      <rect x="30" y="24" width="40" height="16" rx="2" fill={accent} />
      <path d="M30 40 L70 40 L60 76 L40 76 Z" fill={accent} opacity={0.85} />
      <rect x="42" y="30" width="16" height="4" fill="#fff" opacity={0.7} />
    </>
  ),
  'calm-command': (accent) => (
    <>
      <path d="M50 22 L74 32 V52 C74 68 62 78 50 82 C38 78 26 68 26 52 V32 Z" fill={accent} opacity={0.9} />
      <circle cx="50" cy="48" r="8" fill="#fff" opacity={0.75} />
    </>
  ),
  'night-guardian': (accent) => (
    <>
      <path d="M50 20 C68 20 78 34 78 50 C78 66 65 80 50 80 C35 80 22 66 22 50 C22 34 32 20 50 20 Z" fill="#1c1c28" />
      <path d="M34 46 Q50 32 66 46 Q50 40 34 46 Z" fill={accent} />
      <circle cx="42" cy="52" r="3.5" fill={accent} />
      <circle cx="58" cy="52" r="3.5" fill={accent} />
    </>
  ),
  'veteran-trainer': (accent) => (
    <>
      <circle cx="50" cy="42" r="20" fill={accent} opacity={0.85} />
      <rect x="38" y="60" width="24" height="18" rx="6" fill={accent} opacity={0.6} />
      <circle cx="50" cy="42" r="7" fill="#fff" opacity={0.7} />
    </>
  ),
  'tiny-sage': (accent) => (
    <>
      <circle cx="50" cy="52" r="22" fill={accent} opacity={0.85} />
      <path d="M40 32 Q50 18 60 32" stroke={accent} strokeWidth="5" fill="none" opacity={0.7} />
      <circle cx="50" cy="52" r="6" fill="#fff" opacity={0.8} />
    </>
  ),
  'patient-teacher': (accent) => (
    <>
      <circle cx="50" cy="50" r="24" fill="none" stroke={accent} strokeWidth="5" opacity={0.85} />
      <circle cx="50" cy="50" r="10" fill={accent} opacity={0.75} />
    </>
  ),
  'noble-ranger': (accent) => (
    <>
      <path d="M50 18 L62 50 L50 44 L38 50 Z" fill={accent} opacity={0.9} />
      <rect x="47" y="44" width="6" height="34" fill={accent} opacity={0.6} />
    </>
  ),
  'reluctant-adventurer': (accent) => (
    <>
      <path d="M30 60 Q50 30 70 60 Q50 78 30 60 Z" fill={accent} opacity={0.85} />
      <circle cx="50" cy="55" r="6" fill="#fff" opacity={0.75} />
    </>
  ),
  'flamboyant-spirit': (accent) => (
    <>
      <path d="M50 18 C64 26 66 40 58 50 C70 52 74 66 62 78 C58 66 50 62 42 66 C40 54 46 48 54 46 C42 44 38 30 50 18 Z" fill={accent} opacity={0.9} />
    </>
  ),
  'inspiring-teacher': (accent) => (
    <>
      <rect x="28" y="34" width="44" height="32" rx="4" fill={accent} opacity={0.85} />
      <rect x="34" y="42" width="32" height="4" fill="#fff" opacity={0.6} />
      <rect x="34" y="50" width="22" height="4" fill="#fff" opacity={0.6} />
    </>
  ),
  'majestic-guardian': (accent) => (
    <>
      <circle cx="50" cy="48" r="22" fill={accent} opacity={0.85} />
      <path d="M28 48 Q22 30 34 22 Q30 38 36 48 Z" fill={accent} opacity={0.7} />
      <path d="M72 48 Q78 30 66 22 Q70 38 64 48 Z" fill={accent} opacity={0.7} />
    </>
  ),
};

/**
 * Real portraits live at /public/characters-art/{coach.id}.png — drop a file
 * in with that exact name and it appears automatically, no code changes.
 * Coaches without a file yet keep the code-drawn placeholder below.
 */
export function artSrcFor(coachId: string): string {
  return `/characters-art/${coachId}.png`;
}

export function CoachAvatar({ coach, size = 96 }: { coach: Coach; size?: number }) {
  const [artFailed, setArtFailed] = useState(false);
  useEffect(() => setArtFailed(false), [coach.id]);

  const wrapperStyle = {
    width: size,
    height: size,
    background: `radial-gradient(circle at 35% 30%, ${coach.accent}33, transparent 70%)`,
  };

  if (!artFailed) {
    return (
      <div className="coach-avatar" style={wrapperStyle}>
        <img
          src={artSrcFor(coach.id)}
          alt={coach.name}
          width={size}
          height={size}
          onError={() => setArtFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%', borderRadius: '50%' }}
        />
      </div>
    );
  }

  const draw = SHAPES[coach.archetype];
  return (
    <div className="coach-avatar" style={wrapperStyle}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={coach.name}>
        {draw(coach.accent)}
      </svg>
    </div>
  );
}
