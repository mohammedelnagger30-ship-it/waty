/** Pure helpers for streaks, levels, heatmaps and time estimates. */

export type Streak = { current: number; longest: number; lastDate?: string };

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function dateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

/** Accepts ISO datetimes or YYYY-MM-DD and counts consecutive local days. */
export function computeStreak(values: Array<string | undefined | null>, now: Date = new Date()): Streak {
  const days = Array.from(new Set(values.filter((value): value is string => Boolean(value)).map(dateKey).filter(Boolean))).sort();
  if (!days.length) return { current: 0, longest: 0 };

  let longest = 0;
  let run = 0;
  let previous = '';
  for (const day of days) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  const today = dateKey(now);
  const yesterday = shiftDay(today, -1);
  const last = days[days.length - 1];
  let current = 0;
  if (last === today || last === yesterday) {
    current = 1;
    let cursor = last;
    for (let i = days.length - 2; i >= 0; i -= 1) {
      if (shiftDay(days[i], 1) !== cursor) break;
      current += 1;
      cursor = days[i];
    }
  }

  return { current, longest, lastDate: last };
}

export const LEVEL_STEPS = [0, 60, 160, 320, 560, 900, 1400, 2100, 3000, 4200];

export function levelFromXp(xp: number): { level: number; current: number; needed: number; progress: number } {
  const safe = Math.max(0, Math.floor(xp || 0));
  let level = 1;
  for (let i = 1; i < LEVEL_STEPS.length; i += 1) {
    if (safe >= LEVEL_STEPS[i]) level = i + 1;
    else break;
  }
  const base = LEVEL_STEPS[level - 1] ?? 0;
  const next = LEVEL_STEPS[level] ?? base + 1600;
  return {
    level,
    current: safe - base,
    needed: Math.max(1, next - base),
    progress: Math.min(1, (safe - base) / Math.max(1, next - base)),
  };
}

export type HeatCell = { date: string; count: number; week: number; day: number };

/** Last `weeks` weeks, Monday-first, suitable for a react-native-svg grid. */
export function buildHeatmap(
  values: Array<string | undefined | null>,
  weeks = 12,
  now: Date = new Date(),
): HeatCell[] {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (!value) return;
    const key = dateKey(value);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - dayOfWeek));
  const start = new Date(end);
  start.setDate(start.getDate() - (weeks * 7 - 1));

  const cells: HeatCell[] = [];
  for (let week = 0; week < weeks; week += 1) {
    for (let day = 0; day < 7; day += 1) {
      const cursor = new Date(start);
      cursor.setDate(start.getDate() + week * 7 + day);
      const key = dateKey(cursor);
      cells.push({ date: key, count: counts.get(key) || 0, week, day });
    }
  }
  return cells;
}

/** Suggests a better estimate after several completed sessions. */
export function suggestEstimate(estimatedMinutes: number, actualMinutes: number[]): number | null {
  if (!actualMinutes.length) return null;
  const average = actualMinutes.reduce((sum, value) => sum + value, 0) / actualMinutes.length;
  if (!estimatedMinutes || estimatedMinutes <= 0) return Math.round(average);
  const ratio = average / estimatedMinutes;
  if (ratio < 1.15 || ratio > 2.2) return null;
  return Math.round(average);
}
