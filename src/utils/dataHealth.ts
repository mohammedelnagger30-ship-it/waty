import type { TranslationKey } from '@/src/i18n';
import type {
  DailyReview,
  Goal,
  Habit,
  NotificationSettings,
  Plan,
  PomodoroSession,
  Settings,
  Task,
  TaskReminder,
  TaskTemplate,
  WeeklyReview,
} from '@/src/storage/entities';
import { findScheduleConflicts, toLocalDateKey } from './taskUtils';

/**
 * Read-only auditing of the data already stored by the app. It never mutates
 * storage; the repair helper below is deliberately limited to dependency links.
 */

export interface HealthCollections {
  tasks: Task[];
  goals: Goal[];
  plans: Plan[];
  habits: Habit[];
  reviews: DailyReview[];
  pomodoros: PomodoroSession[];
  weekly_reviews: WeeklyReview[];
  reminders: TaskReminder[];
  settings: Settings[];
  notif_settings: NotificationSettings[];
  task_templates: TaskTemplate[];
}

export type HealthSeverity = 'error' | 'warning' | 'info';

export interface HealthIssue {
  id: string;
  labelKey: TranslationKey;
  count: number;
  severity: HealthSeverity;
  weight: number;
}

export interface HealthReport {
  score: number;
  totalRecords: number;
  issues: HealthIssue[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value?: string): boolean {
  if (!value || !DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/** Task ids that take part in at least one dependency cycle. */
function findCycleTaskIds(tasks: Task[]): string[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const state = new Map<string, 0 | 1 | 2>();
  const cyclic = new Set<string>();

  const visit = (id: string) => {
    state.set(id, 1);
    for (const parentId of byId.get(id)?.dependsOn ?? []) {
      if (!byId.has(parentId)) continue;
      if (state.get(parentId) === 1) {
        cyclic.add(id);
        cyclic.add(parentId);
      } else if (!state.has(parentId)) {
        visit(parentId);
      }
    }
    state.set(id, 2);
  };

  tasks.forEach((task) => {
    if (!state.has(task.id)) visit(task.id);
  });
  return [...cyclic];
}

export function checkDataHealth(data: HealthCollections, now: Date = new Date()): HealthReport {
  const { tasks, goals, plans, habits, reviews, pomodoros, weekly_reviews, reminders } = data;
  const taskIds = new Set(tasks.map((task) => task.id));
  const today = toLocalDateKey(now);

  let brokenDeps = 0;
  tasks.forEach((task) => {
    (task.dependsOn ?? []).forEach((id) => {
      if (id === task.id || !taskIds.has(id)) brokenDeps += 1;
    });
  });

  const allRecords = [
    ...tasks,
    ...goals,
    ...plans,
    ...habits,
    ...reviews,
    ...pomodoros,
    ...weekly_reviews,
    ...reminders,
    ...data.settings,
    ...data.notif_settings,
    ...data.task_templates,
  ];
  const duplicates = allRecords.length - new Set(allRecords.map((item) => item.id)).size;

  const missingPlanTaskIds = new Set<string>();
  plans.forEach((plan) => {
    [...plan.taskIds, ...plan.phases.flatMap((phase) => phase.taskIds)].forEach((id) => {
      if (!taskIds.has(id)) missingPlanTaskIds.add(id);
    });
  });

  const specs: HealthIssue[] = [
    { id: 'brokenDeps', labelKey: 'data.health.brokenDeps', count: brokenDeps, severity: 'error', weight: 8 },
    { id: 'cycles', labelKey: 'data.health.cycles', count: findCycleTaskIds(tasks).length, severity: 'error', weight: 10 },
    { id: 'duplicates', labelKey: 'data.health.duplicates', count: duplicates, severity: 'error', weight: 12 },
    {
      id: 'invalidDates',
      labelKey: 'data.health.invalidDates',
      count: tasks.filter((task) => !validDate(task.date) || (!!task.deadline && !validDate(task.deadline))).length,
      severity: 'error',
      weight: 6,
    },
    {
      id: 'deadlineBeforeDate',
      labelKey: 'data.health.deadlineBeforeDate',
      count: tasks.filter((task) => !!task.deadline && task.deadline < task.date).length,
      severity: 'warning',
      weight: 4,
    },
    {
      id: 'orphanReminders',
      labelKey: 'data.health.orphanReminders',
      count: reminders.filter((reminder) => !taskIds.has(reminder.taskId)).length,
      severity: 'warning',
      weight: 4,
    },
    {
      id: 'orphanPomodoros',
      labelKey: 'data.health.orphanPomodoros',
      count: pomodoros.filter((session) => session.taskId !== 'free-focus' && !taskIds.has(session.taskId)).length,
      severity: 'info',
      weight: 1,
    },
    {
      id: 'habitConfig',
      labelKey: 'data.health.habitConfig',
      count: habits.filter((habit) => habit.frequency === 'custom' && !(habit.customDays?.length)).length,
      severity: 'warning',
      weight: 3,
    },
    {
      id: 'planLinks',
      labelKey: 'data.health.planLinks',
      count: missingPlanTaskIds.size,
      severity: 'info',
      weight: 1,
    },
    {
      id: 'conflicts',
      labelKey: 'data.health.conflicts',
      count: Object.keys(findScheduleConflicts(tasks)).length,
      severity: 'warning',
      weight: 3,
    },
    {
      id: 'overdue',
      labelKey: 'data.health.overdue',
      count: tasks.filter(
        (task) => task.status !== 'done' && task.status !== 'cancelled' && task.date < today,
      ).length,
      severity: 'info',
      weight: 1,
    },
  ];

  const rank: Record<HealthSeverity, number> = { error: 0, warning: 1, info: 2 };
  const issues = specs
    .filter((issue) => issue.count > 0)
    .sort((a, b) => rank[a.severity] - rank[b.severity] || b.count - a.count);
  // Cap each category so one noisy entity type cannot wipe the whole score.
  const penalty = issues.reduce((sum, issue) => sum + Math.min(issue.count, 4) * issue.weight, 0);

  return {
    score: Math.max(0, 100 - penalty),
    totalRecords: allRecords.length,
    issues,
  };
}

interface CycleEdge {
  childId: string;
  parentId: string;
}

/** The dependency edge that closes one cycle, or null when the graph is clean. */
function findOneCycleEdge(tasks: Task[]): CycleEdge | null {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const state = new Map<string, 0 | 1 | 2>();
  let edge: CycleEdge | null = null;

  const visit = (id: string): boolean => {
    state.set(id, 1);
    for (const parentId of byId.get(id)?.dependsOn ?? []) {
      if (!byId.has(parentId)) continue;
      if (state.get(parentId) === 1) {
        edge = { childId: id, parentId };
        return true;
      }
      if (!state.has(parentId) && visit(parentId)) return true;
    }
    state.set(id, 2);
    return false;
  };

  for (const task of tasks) {
    if (!state.has(task.id) && visit(task.id)) break;
  }
  return edge;
}

/**
 * Removes dependencies pointing at deleted/self tasks, then breaks any cycles
 * one edge at a time. Nothing else on a task is changed.
 */
export function repairTaskLinks(
  tasks: Task[],
): { tasks: Task[]; changed: Task[] } {
  const ids = new Set(tasks.map((task) => task.id));
  let next = tasks.map((task) => {
    const deps = task.dependsOn ?? [];
    const clean = deps.filter((id) => id !== task.id && ids.has(id));
    return clean.length === deps.length ? task : { ...task, dependsOn: clean };
  });

  for (let guard = 0; guard <= tasks.length; guard += 1) {
    const edge = findOneCycleEdge(next);
    if (!edge) break;
    next = next.map((task) =>
      task.id === edge!.childId
        ? { ...task, dependsOn: (task.dependsOn ?? []).filter((id) => id !== edge!.parentId) }
        : task,
    );
  }

  const original = new Map(tasks.map((task) => [task.id, task]));
  const changed = next.filter((task) => {
    const before = original.get(task.id);
    return (
      !!before &&
      JSON.stringify(before.dependsOn ?? []) !== JSON.stringify(task.dependsOn ?? [])
    );
  });
  return { tasks: next, changed };
}
