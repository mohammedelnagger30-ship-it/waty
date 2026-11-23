import {
  DailyReview,
  Goal,
  Habit,
  PomodoroSession,
  ReviewMood,
  Task,
  TaskCategory,
} from '@/src/storage/entities';
import { Language } from '@/src/i18n/translations';
import { addDays, categoryColors } from './taskUtils';
import { todayISODate } from '@/src/storage/repository';
import { getHabitCompletionRate, isHabitDueOn } from './habitUtils';

export type Period = '7' | '30' | 'all';

export interface DayActivity {
  date: string;
  completed: number;
  created: number;
  label: string;
}

export interface CategoryStat {
  key: TaskCategory;
  count: number;
  percent: number;
  color: string;
  label: string;
}

export interface MoodStat {
  key: ReviewMood;
  count: number;
  label: string;
  emoji: string;
  color: string;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  inProgressTasks: number;
  completionRate: number;
  focusMinutes: number;
  sessions: number;
  activeGoals: number;
  completedGoals: number;
  avgGoalProgress: number;
  habitConsistency: number;
  streak: number;
  daily: DayActivity[];
  categories: CategoryStat[];
  moods: MoodStat[];
  recent: Task[];
}

const categoryLabels: Record<TaskCategory, { ar: string; en: string }> = {
  work: { ar: 'عمل', en: 'Work' },
  study: { ar: 'دراسة', en: 'Study' },
  health: { ar: 'صحة', en: 'Health' },
  personal: { ar: 'شخصي', en: 'Personal' },
  family: { ar: 'عائلة', en: 'Family' },
  finance: { ar: 'مالية', en: 'Finance' },
  custom: { ar: 'أخرى', en: 'Other' },
};

const moodMeta: Record<ReviewMood, { ar: string; en: string; emoji: string; color: string }> = {
  great: { ar: 'ممتاز', en: 'Great', emoji: '😄', color: '#16A34A' },
  good: { ar: 'جيد', en: 'Good', emoji: '🙂', color: '#1A9FE8' },
  okay: { ar: 'عادي', en: 'Okay', emoji: '😐', color: '#F59E0B' },
  bad: { ar: 'صعب', en: 'Hard', emoji: '😞', color: '#DC2626' },
};

function dateOf(value?: string): string | undefined {
  if (!value) return undefined;
  return value.split('T')[0];
}

function dayLabel(dateStr: string, language: Language): string {
  const daysAr = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const index = new Date(dateStr + 'T00:00:00').getDay();
  return language === 'ar' ? daysAr[index] : daysEn[index];
}

function countStreak(dates: string[]): number {
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

function withinPeriod(dateStr: string, period: Period, today: string): boolean {
  if (period === 'all') return true;
  const days = Number(period);
  return dateStr >= addDays(today, -(days - 1)) && dateStr <= today;
}

export function computeDashboardStats(
  data: {
    tasks: Task[];
    goals: Goal[];
    habits: Habit[];
    reviews: DailyReview[];
    pomodoros: PomodoroSession[];
  },
  language: Language,
  period: Period = '7',
): DashboardStats {
  const today = todayISODate();
  const { tasks, goals, habits, reviews, pomodoros } = data;

  const completed = tasks.filter((task) => task.status === 'done');
  const completedInPeriod = completed.filter((task) =>
    withinPeriod(dateOf(task.completedAt) ?? task.date, period, today),
  );
  const active = tasks.filter(
    (task) => task.status !== 'done' && task.status !== 'cancelled',
  );

  // PomodoroSession rows are the single source of truth for focus time.
  // task.actualMinutes mirrors the same sessions, so counting both doubled it.
  const focusSessions = pomodoros.filter(
    (session) =>
      session.type === 'focus' &&
      withinPeriod(dateOf(session.startedAt) ?? today, period, today),
  );
  const focusMinutes = focusSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const sessions = focusSessions.length;

  const activeGoals = goals.filter((goal) => goal.status === 'active').length;
  const completedGoals = goals.filter((goal) => goal.status === 'completed').length;
  const avgGoalProgress =
    goals.length === 0
      ? 0
      : Math.round(goals.reduce((sum, goal) => sum + Math.min(goal.progress, 100), 0) / goals.length);

  let habitDue = 0;
  let habitDone = 0;
  for (const habit of habits) {
    const rate = getHabitCompletionRate(habit, period === 'all' ? 30 : Number(period));
    habitDue += 1;
    habitDone += rate;
  }
  const habitConsistency = habits.length === 0 ? 0 : Math.round(habitDone / habitDue);

  const streakDates = completed
    .filter((task) => withinPeriod(dateOf(task.completedAt) ?? task.date, period, today))
    .map((task) => dateOf(task.completedAt) ?? task.date);
  const streak = countStreak(streakDates);

  const dayCount = period === 'all' ? 7 : Number(period);
  const daily: DayActivity[] = Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(today, -(dayCount - 1 - index));
    return {
      date,
      label: dayLabel(date, language),
      completed: completed.filter((task) => (dateOf(task.completedAt) ?? task.date) === date).length,
      created: tasks.filter((task) => dateOf(task.createdAt) === date).length,
    };
  });

  const categoryCount: Partial<Record<TaskCategory, number>> = {};
  tasks.forEach((task) => {
    categoryCount[task.category] = (categoryCount[task.category] ?? 0) + 1;
  });
  const categoryTotal = Object.values(categoryCount).reduce((sum, count) => sum + (count ?? 0), 0);
  const categories: CategoryStat[] = (
    Object.entries(categoryCount) as Array<[TaskCategory, number]>
  )
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      key,
      count,
      percent: categoryTotal === 0 ? 0 : Math.round((count / categoryTotal) * 100),
      color: categoryColors[key],
      label: language === 'ar' ? categoryLabels[key].ar : categoryLabels[key].en,
    }));

  const moodCount: Partial<Record<ReviewMood, number>> = {};
  reviews
    .filter((review) => withinPeriod(review.date, period, today))
    .forEach((review) => {
      moodCount[review.mood] = (moodCount[review.mood] ?? 0) + 1;
    });
  const moods: MoodStat[] = (Object.entries(moodCount) as Array<[ReviewMood, number]>)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      key,
      count,
      label: language === 'ar' ? moodMeta[key].ar : moodMeta[key].en,
      emoji: moodMeta[key].emoji,
      color: moodMeta[key].color,
    }));

  const recent = [...completed]
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 5);

  const totalForRate = completedInPeriod.length + active.filter((task) =>
    withinPeriod(task.date, period, today),
  ).length;
  const completionRate =
    totalForRate === 0 ? 0 : Math.round((completedInPeriod.length / totalForRate) * 100);

  return {
    totalTasks: tasks.length,
    completedTasks: completed.length,
    activeTasks: active.length,
    inProgressTasks: tasks.filter((task) => task.status === 'in_progress').length,
    completionRate,
    focusMinutes,
    sessions,
    activeGoals,
    completedGoals,
    avgGoalProgress,
    habitConsistency,
    streak,
    daily,
    categories,
    moods,
    recent,
  };
}

export function habitDueToday(habit: Habit): boolean {
  return isHabitDueOn(habit, todayISODate());
}
