import type { Coach, Routine } from '../types';
import { todayKey } from './storage';

/**
 * A line chosen at random each time can never be prepared in advance: the
 * version synthesised during setup would not be the version spoken later, so
 * the user waits anyway. These pick deterministically from the day's date, so
 * setup and the morning itself agree on the exact words — while still varying
 * from one day to the next.
 */
function stableIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export function pickForDay<T>(items: T[], seed: string): T {
  return items[stableIndex(seed, items.length)];
}

export function greetingFor(coach: Coach, day: string = todayKey()): string {
  return pickForDay(coach.greetingLines, `${day}:greeting:${coach.id}`);
}

export function introFor(coach: Coach, day: string = todayKey()): string {
  return pickForDay(coach.introLines, `${day}:intro:${coach.id}`);
}

export function completionFor(coach: Coach, day: string = todayKey()): string {
  return pickForDay(coach.completionLines, `${day}:completion:${coach.id}`);
}

export function stuckFor(coach: Coach, stepIndex: number, day: string = todayKey()): string {
  return pickForDay(coach.stuckLines, `${day}:stuck:${coach.id}:${stepIndex}`);
}

export function nameOpenerFor(userName: string | null): string {
  return userName ? `${userName}. ` : '';
}

export function openingLineFor(coach: Coach, routine: Routine, userName: string | null, day: string = todayKey()): string {
  const first = routine.steps[0];
  const body = first?.speech ?? first?.instruction ?? '';
  return `${nameOpenerFor(userName)}${greetingFor(coach, day)} ${body}`.trim();
}

/**
 * Every line this coach will say during this routine, in the order they are
 * said — so preparing them in sequence means the earliest lines are ready
 * first even if the user starts before the whole set is done.
 */
export function morningLines(
  coach: Coach,
  routine: Routine,
  userName: string | null,
  options: { includeIntro: boolean },
  day: string = todayKey()
): string[] {
  const opener = nameOpenerFor(userName);
  const lines: string[] = [];
  if (options.includeIntro) lines.push(`${opener}${introFor(coach, day)}`);
  if (routine.steps.length) lines.push(openingLineFor(coach, routine, userName, day));
  routine.steps.forEach((step) => lines.push(step.speech ?? step.instruction));
  lines.push(`${opener}${completionFor(coach, day)}`);
  return [...new Set(lines.filter((l) => l && l.trim().length > 0))];
}
