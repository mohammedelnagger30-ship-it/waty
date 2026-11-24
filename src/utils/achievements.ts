/** Pure badge rules derived from data the app already stores. */

export type BadgeId = 'first_step' | 'deep_focus' | 'week_streak' | 'habit_keeper' | 'reflector';

export interface Badge {
  id: BadgeId;
  earned: boolean;
  value: number;
  target: number;
}

export interface BadgeInput {
  completedTasks: number;
  focusMinutes: number;
  streak: number;
  habitCompletions: number;
  reviews: number;
}

/** Small, understandable milestones — no extra storage or package needed. */
export function buildBadges(input: BadgeInput): Badge[] {
  const rules: Array<[BadgeId, number, number]> = [
    ['first_step', input.completedTasks, 1],
    ['deep_focus', input.focusMinutes, 120],
    ['week_streak', input.streak, 7],
    ['habit_keeper', input.habitCompletions, 10],
    ['reflector', input.reviews, 3],
  ];
  return rules.map(([id, value, target]) => ({
    id,
    value: Math.max(0, Math.floor(value)),
    target,
    earned: value >= target,
  }));
}
