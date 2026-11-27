import { RecurringPlan, Task } from '@/src/storage/entities';
import { recurringPlanRepository, taskRepository } from '@/src/storage/repositories';
import { generateId, nowISO, todayISODate } from '@/src/storage/repository';
import { createDefaultTask } from './taskUtils';

/** How far ahead occurrences are materialised so the planner can show them. */
const HORIZON_DAYS = 30;
const MAX_OCCURRENCES_PER_RUN = 500;
const DAY_MS = 86_400_000;

const WEEKDAYS_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayNumber(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function addDaysISO(iso: string, days: number): string {
  return new Date((dayNumber(iso) + days) * DAY_MS).toISOString().slice(0, 10);
}

/** 0=Sunday .. 6=Saturday, derived in UTC so local time zones cannot shift it. */
function weekdayOf(iso: string): number {
  return ((dayNumber(iso) + 4) % 7 + 7) % 7;
}

function validAnchor(plan: RecurringPlan): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(plan.anchorDate) ? plan.anchorDate : todayISODate();
}

export function matchesRecurringPlan(plan: RecurringPlan, isoDate: string): boolean {
  if (isoDate < validAnchor(plan)) return false;
  if (plan.mode === 'weekdays') {
    return (plan.weekdays ?? []).includes(weekdayOf(isoDate));
  }
  const interval = plan.intervalDays ?? 0;
  if (interval < 1) return false;
  return (dayNumber(isoDate) - dayNumber(validAnchor(plan))) % interval === 0;
}

export function formatRecurringSchedule(
  plan: Pick<RecurringPlan, 'mode' | 'weekdays' | 'intervalDays'>,
  language: 'ar' | 'en' = 'ar',
): string {
  if (plan.mode === 'interval') {
    const interval = Math.max(1, plan.intervalDays ?? 1);
    if (interval === 1) return language === 'ar' ? 'كل يوم' : 'Every day';
    if (interval === 2) return language === 'ar' ? 'كل يومين' : 'Every 2 days';
    return language === 'ar' ? `كل ${interval} أيام` : `Every ${interval} days`;
  }
  const days = [...(plan.weekdays ?? [])].sort((a, b) => a - b);
  if (days.length === 0) return language === 'ar' ? 'بدون أيام' : 'No days';
  if (days.length === 7) return language === 'ar' ? 'كل يوم' : 'Every day';
  const names = language === 'ar' ? WEEKDAYS_AR : WEEKDAYS_EN;
  return days.map((day) => names[day] ?? '').filter(Boolean).join(language === 'ar' ? '، ' : ', ');
}

function buildOccurrence(plan: RecurringPlan, date: string): Task {
  const timestamp = nowISO();
  return createDefaultTask({
    title: plan.title,
    date,
    time: plan.time || undefined,
    priority: plan.priority,
    category: plan.category,
    estimatedMinutes: plan.estimatedMinutes,
    tags: [...plan.tags],
    subtasks: plan.subtaskTitles.map((title) => ({ id: generateId(), title, done: false })),
    reminderOffsets: plan.reminderOffsets ? [...plan.reminderOffsets] : undefined,
    reminderCustomMinutes: plan.reminderCustomMinutes,
    goalId: plan.goalId,
    recurringPlanId: plan.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

let ensureQueue: Promise<number> = Promise.resolve(0);
// Avoid repeating the whole 30-day scan on every tab focus/foreground when no
// plan changed. Edits update `updatedAt`, so the fingerprint invalidates.
let lastRunKey: string | null = null;

function planFingerprint(plans: RecurringPlan[], horizonDays: number): string {
  return `${todayISODate()}|${horizonDays}|${plans
    .map((plan) => [
      plan.id,
      plan.active !== false ? '1' : '0',
      validAnchor(plan),
      plan.mode,
      (plan.weekdays ?? []).join(','),
      plan.intervalDays ?? 0,
      plan.time ?? '',
      plan.updatedAt ?? '',
    ].join(':'))
    .join('|')}`;
}

/**
 * Materialises recurring occurrences from today through a short horizon.
 * Past days are intentionally skipped; the anchor date only defines the
 * weekday/interval pattern, not a fixed calendar deadline.
 */
export function ensureRecurringTasks(horizonDays: number = HORIZON_DAYS): Promise<number> {
  const run = async (): Promise<number> => {
    const plans = await recurringPlanRepository.getAll();
    const active = plans.filter((plan) => plan.active !== false);
    if (active.length === 0) {
      lastRunKey = null;
      return 0;
    }

    const horizon = Math.max(0, horizonDays);
    const fingerprint = planFingerprint(plans, horizon);
    if (fingerprint === lastRunKey) return 0;

    const today = todayISODate();
    const end = addDaysISO(today, horizon);
    const storedTasks = await taskRepository.getAll();
    const existing = new Set(
      storedTasks
        .filter((task) => task.recurringPlanId)
        .map((task) => `${task.recurringPlanId}|${task.date}`),
    );
    const createdTasks: Task[] = [];

    for (const plan of active) {
      const anchor = validAnchor(plan);
      let cursor = anchor > today ? anchor : today;
      while (cursor <= end && createdTasks.length < MAX_OCCURRENCES_PER_RUN) {
        if (matchesRecurringPlan(plan, cursor)) {
          const key = `${plan.id}|${cursor}`;
          if (!existing.has(key)) {
            createdTasks.push(buildOccurrence(plan, cursor));
            existing.add(key);
          }
        }
        cursor = addDaysISO(cursor, 1);
      }
    }

    const added = await taskRepository.createMany(createdTasks);
    // Never cache a capped run: a later pass must be able to finish the horizon.
    if (createdTasks.length < MAX_OCCURRENCES_PER_RUN) lastRunKey = fingerprint;
    return added.length;
  };

  ensureQueue = ensureQueue.catch(() => 0).then(run);
  return ensureQueue;
}

/** Stops a whole recurring series; completed occurrences stay as history. */
export async function cancelRecurringPlan(id: string): Promise<void> {
  await recurringPlanRepository.update(id, { active: false });
  lastRunKey = null;
  const tasks = await taskRepository.getAll();
  const removable = tasks
    .filter((task) => task.recurringPlanId === id)
    // Keep completed/cancelled instances so past progress is not erased.
    .filter((task) => task.status !== 'done' && task.status !== 'cancelled')
    .map((task) => task.id);
  await taskRepository.deleteMany(removable);
}

/**
 * Applies schedule edits to a recurring series. Future unfinished occurrences
 * are regenerated from the new rule; past/completed history is preserved.
 */
export async function updateRecurringPlan(plan: RecurringPlan): Promise<void> {
  await recurringPlanRepository.update(plan.id, plan);
  lastRunKey = null;
  const today = todayISODate();
  const tasks = await taskRepository.getAll();
  const removable = tasks
    .filter((task) => task.recurringPlanId === plan.id && task.date >= today)
    .filter((task) => task.status !== 'done' && task.status !== 'cancelled')
    .map((task) => task.id);
  await taskRepository.deleteMany(removable);
}
