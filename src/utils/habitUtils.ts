import { Habit, HabitFrequency } from '@/src/storage/entities';
import { generateId, nowISO, todayISODate } from '@/src/storage/repository';
import { addDays } from './taskUtils';

export interface HabitInput {
  title: string;
  description?: string;
  frequency: HabitFrequency;
  customDays?: number[];
  color?: string;
  reminderTime?: string;
}

export interface HabitDay {
  date: string;
  due: boolean;
  done: boolean;
  isToday: boolean;
}

export function createHabit(input: HabitInput): Habit {
  const now = nowISO();
  return {
    id: generateId(),
    title: input.title,
    description: input.description,
    frequency: input.frequency,
    customDays: input.customDays ?? [],
    streak: 0,
    bestStreak: 0,
    completedDates: [],
    color: input.color,
    reminderTime: input.reminderTime,
    createdAt: now,
    updatedAt: now,
  };
}

function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay();
}

export function isHabitDueOn(habit: Habit, dateStr: string): boolean {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'custom') return (habit.customDays ?? []).includes(dayOfWeek(dateStr));
  const createdDay = dayOfWeek(habit.createdAt.split('T')[0] ?? todayISODate());
  return dayOfWeek(dateStr) === createdDay;
}

export function isHabitCompletedOn(habit: Habit, dateStr: string): boolean {
  return habit.completedDates.includes(dateStr);
}

function consecutiveDates(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  let best = 0;
  let current = 0;
  let cursor = [...set].sort()[0];
  const last = [...set].sort().slice(-1)[0];
  while (cursor <= last) {
    if (set.has(cursor)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

function currentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  const today = todayISODate();
  let cursor = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function toggleHabitDate(habit: Habit, dateStr: string): Habit {
  const done = habit.completedDates.includes(dateStr);
  const completedDates = done
    ? habit.completedDates.filter((item) => item !== dateStr)
    : [...habit.completedDates, dateStr].sort();
  return {
    ...habit,
    completedDates,
    lastCompletedDate: done
      ? completedDates.slice(-1)[0]
      : dateStr,
    streak: currentStreak(completedDates),
    bestStreak: Math.max(habit.bestStreak, consecutiveDates(completedDates)),
    updatedAt: nowISO(),
  };
}

export function getHabitWeek(habit: Habit, endDate: string = todayISODate(), weekStartsOn = 0): HabitDay[] {
  const end = new Date(endDate + 'T00:00:00');
  const endDay = end.getDay();
  const diff = (endDay - weekStartsOn + 7) % 7;
  const start = new Date(end);
  start.setDate(start.getDate() - diff);
  const today = todayISODate();

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    const date = day.toISOString().split('T')[0];
    return {
      date,
      due: isHabitDueOn(habit, date),
      done: isHabitCompletedOn(habit, date),
      isToday: date === today,
    };
  });
}

export function getHabitCompletionRate(habit: Habit, days = 7): number {
  const today = todayISODate();
  let due = 0;
  let done = 0;
  for (let i = 0; i < days; i += 1) {
    const date = addDays(today, -i);
    if (!isHabitDueOn(habit, date)) continue;
    due += 1;
    if (isHabitCompletedOn(habit, date)) done += 1;
  }
  return due === 0 ? 0 : Math.round((done / due) * 100);
}
