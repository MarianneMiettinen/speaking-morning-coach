import type { ProgressState } from '../types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: (progress: ProgressState) => boolean;
}

export const achievements: Achievement[] = [
  {
    id: 'first-light',
    title: 'First Light',
    description: 'Complete your very first morning.',
    icon: '🌅',
    isUnlocked: (p) => p.totalCompletions >= 1,
  },
  {
    id: 'five-sunrises',
    title: 'Five Sunrises',
    description: 'Complete 5 mornings — any pace, any order.',
    icon: '☀️',
    isUnlocked: (p) => p.totalCompletions >= 5,
  },
  {
    id: 'welcome-back',
    title: 'Welcome Back',
    description: "Return after a few days off and finish a morning anyway. Coming back is the whole skill.",
    icon: '🚪',
    isUnlocked: (p) => p.welcomeBackCount >= 1,
  },
  {
    id: 'shape-shifter',
    title: 'Shape-Shifter',
    description: 'Complete a morning with 3 different coaches.',
    icon: '🎭',
    isUnlocked: (p) => p.coachesUsed.length >= 3,
  },
  {
    id: 'explorer',
    title: 'Explorer',
    description: 'Complete 3 different morning scripts.',
    icon: '🧭',
    isUnlocked: (p) => p.routinesUsed.length >= 3,
  },
  {
    id: 'own-your-morning',
    title: 'Own Your Morning',
    description: 'Build and complete a routine you made yourself.',
    icon: '🛠️',
    isUnlocked: (p) => p.routinesUsed.some((id) => id.startsWith('custom-')),
  },
  {
    id: 'rescue-artist',
    title: 'Rescue Artist',
    description: "Use \"Make this easier\" 10 times. Resizing the step is a skill, not a shortcut.",
    icon: '🪜',
    isUnlocked: (p) => p.easierUsedCount >= 10,
  },
  {
    id: 'twenty-five-strong',
    title: 'Twenty-Five Strong',
    description: 'Complete 25 mornings.',
    icon: '🏔️',
    isUnlocked: (p) => p.totalCompletions >= 25,
  },
  {
    id: 'century',
    title: 'Century',
    description: 'Complete 100 mornings.',
    icon: '💯',
    isUnlocked: (p) => p.totalCompletions >= 100,
  },
];

export function getNewlyUnlocked(before: ProgressState, after: ProgressState): Achievement[] {
  return achievements.filter((a) => !a.isUnlocked(before) && a.isUnlocked(after));
}
