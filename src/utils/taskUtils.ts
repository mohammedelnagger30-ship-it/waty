import { Task, TaskPriority, TaskStatus, TaskCategory, RepeatType, Subtask, TaskTemplate } from '@/src/storage/entities';
import { generateId, nowISO, todayISODate } from '@/src/storage/repository';

export type DateGroup = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later';

export interface TaskGroup {
  key: DateGroup;
  tasks: Task[];
}

/** Format a Date as a LOCAL YYYY-MM-DD key (never UTC). */
export function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Format a Date as a LOCAL HH:mm string. */
export function toLocalTimeString(d: Date): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Round a Date up to the next half-hour block. */
export function roundUpToNextHalfHour(d: Date): Date {
  const result = new Date(d.getTime());
  result.setSeconds(0, 0);
  const minutes = result.getMinutes();
  if (minutes < 30) result.setMinutes(30);
  else { result.setMinutes(0); result.setHours(result.getHours() + 1); }
  return result;
}

export type QuickTimeKey = 'now' | 'later' | 'tomorrow' | 'morning' | 'evening' | 'clear';

export interface QuickTimePreset {
  key: QuickTimeKey;
  date: string;
  time: string;
}

/** Next occurrence of a given hour (today if still ahead, otherwise tomorrow). */
function nextHourAt(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * One-tap date/time presets shared by quick-add and the full task form.
 * Always uses LOCAL dates/times so reminders are correct in every timezone.
 */
export function getQuickTimePresets(): QuickTimePreset[] {
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const morning = nextHourAt(9);
  const evening = nextHourAt(19);

  return [
    { key: 'now', date: toLocalDateKey(now), time: toLocalTimeString(now) },
    { key: 'later', date: toLocalDateKey(later), time: toLocalTimeString(later) },
    { key: 'tomorrow', date: toLocalDateKey(tomorrow), time: toLocalTimeString(tomorrow) },
    { key: 'morning', date: toLocalDateKey(morning), time: toLocalTimeString(morning) },
    { key: 'evening', date: toLocalDateKey(evening), time: toLocalTimeString(evening) },
    { key: 'clear', date: toLocalDateKey(now), time: '' },
  ];
}

export function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalDateKey(d);
}

export function getEndOfWeekDate(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSunday = 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  return toLocalDateKey(d);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
}

export function getTaskGroup(task: Task): DateGroup {
  const today = todayISODate();
  const tomorrow = getTomorrowDate();
  const endOfWeek = getEndOfWeekDate();

  if (task.status === 'done' || task.status === 'cancelled') {
    // Completed/cancelled tasks don't appear in date groups
    // They'll be filtered out before grouping
    return 'later';
  }

  if (task.date < today) return 'overdue';
  if (task.date === today) return 'today';
  if (task.date === tomorrow) return 'tomorrow';
  if (task.date <= endOfWeek) return 'thisWeek';
  return 'later';
}

export function groupTasksByDate(tasks: Task[]): TaskGroup[] {
  const groups: Record<DateGroup, Task[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  const active = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');

  for (const task of active) {
    const group = getTaskGroup(task);
    groups[group].push(task);
  }

  const order: DateGroup[] = ['overdue', 'today', 'tomorrow', 'thisWeek', 'later'];
  return order
    .map((key) => ({ key, tasks: groups[key] }))
    .filter((g) => g.tasks.length > 0);
}

export type SortOption = 'date' | 'priority' | 'title' | 'status';

const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
const statusOrder: Record<TaskStatus, number> = {
  in_progress: 0,
  pending: 1,
  postponed: 2,
  done: 3,
  cancelled: 4,
};

export function sortTasks(tasks: Task[], sort: SortOption): Task[] {
  const sorted = [...tasks];
  switch (sort) {
    case 'date':
      sorted.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const ta = a.time ?? '99:99';
        const tb = b.time ?? '99:99';
        return ta.localeCompare(tb);
      });
      break;
    case 'priority':
      sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      break;
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'status':
      sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      break;
  }
  return sorted;
}

export interface FilterOptions {
  search: string;
  category: TaskCategory | 'all';
  priority: TaskPriority | 'all';
  status: TaskStatus | 'all';
}

export function filterTasks(tasks: Task[], opts: FilterOptions): Task[] {
  return tasks.filter((task) => {
    if (opts.search) {
      const q = opts.search.toLowerCase();
      const inTitle = task.title.toLowerCase().includes(q);
      const inDesc = task.description?.toLowerCase().includes(q) ?? false;
      const inTags = task.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!inTitle && !inDesc && !inTags) return false;
    }
    if (opts.category !== 'all') {
      if (task.category !== opts.category) return false;
    }
    if (opts.priority !== 'all' && task.priority !== opts.priority) return false;
    if (opts.status !== 'all' && task.status !== opts.status) return false;
    return true;
  });
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getNextRepeatDate(task: Task): string | null {
  if (task.repeat === 'none') return null;
  const today = todayISODate();
  const base = task.date < today ? today : task.date;

  if (task.repeat === 'daily') return addDays(base, 1);
  if (task.repeat === 'weekly') return addDays(base, 7);
  if (task.repeat === 'monthly') {
    const d = new Date(base + 'T00:00:00');
    d.setMonth(d.getMonth() + 1);
    return toISODate(d);
  }
  if (task.repeat === 'custom' && task.repeatDays && task.repeatDays.length > 0) {
    const d = new Date(today + 'T00:00:00');
    for (let i = 1; i <= 7; i += 1) {
      d.setDate(d.getDate() + 1);
      if (task.repeatDays.includes(d.getDay())) return toISODate(d);
    }
  }
  return null;
}

/** Creates the next occurrence of a repeating task, carrying over all linked data. */
export function createNextOccurrence(task: Task): Task | null {
  const date = getNextRepeatDate(task);
  if (!date) return null;
  const now = nowISO();
  return {
    ...task,
    id: generateId(),
    status: 'pending',
    date,
    subtasks: task.subtasks.map((subtask) => ({ ...subtask, id: generateId(), done: false })),
    actualMinutes: 0,
    pomodoroSessions: 0,
    completedAt: undefined,
    originalDate: undefined,
    rolloverCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** Shared completion helper: marks a task done and returns its next occurrence, if any. */
export function completeRepeatingTask(task: Task): { nextOccurrence: Task | null; completed: Task } {
  const now = nowISO();
  return {
    nextOccurrence: createNextOccurrence(task),
    completed: { ...task, status: 'done', completedAt: now, updatedAt: now },
  };
}

export function createDefaultTask(overrides: Partial<Task> = {}): Task {
  return {
    id: generateId(),
    title: '',
    priority: 'medium',
    status: 'pending',
    date: todayISODate(),
    category: 'personal',
    tags: [],
    subtasks: [],
    repeat: 'none',
    actualMinutes: 0,
    pomodoroSessions: 0,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...overrides,
  };
}

export function createSubtask(title: string): Subtask {
  return {
    id: generateId(),
    title,
    done: false,
  };
}

/** Build a fresh task from a reusable template recipe. */
export function taskFromTemplate(template: TaskTemplate, overrides: Partial<Task> = {}): Task {
  return createDefaultTask({
    title: template.title,
    description: template.description,
    category: template.category,
    priority: template.priority,
    estimatedMinutes: template.estimatedMinutes,
    tags: [...template.tags],
    subtasks: template.subtaskTitles.map(createSubtask),
    repeat: template.repeat,
    isMIT: template.isMIT,
    reminderOffsets: template.reminderOffsets ? [...template.reminderOffsets] : undefined,
    reminderCustomMinutes: template.reminderCustomMinutes,
    ...overrides,
  });
}

/** Turn an existing task into a template recipe (metadata only, no progress). */
export function templateFromTask(task: Task): Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    estimatedMinutes: task.estimatedMinutes,
    tags: [...task.tags],
    subtaskTitles: task.subtasks.map((s) => s.title),
    repeat: task.repeat,
    isMIT: task.isMIT,
    reminderOffsets: task.reminderOffsets ? [...task.reminderOffsets] : undefined,
    reminderCustomMinutes: task.reminderCustomMinutes,
  };
}

export function getSubtaskProgress(task: Task): number {
  if (task.subtasks.length === 0) return 0;
  const done = task.subtasks.filter((s) => s.done).length;
  return Math.round((done / task.subtasks.length) * 100);
}

export const priorityColors: Record<TaskPriority, { light: string; dark: string; bg: string }> = {
  high: { light: '#DC2626', dark: '#EF4444', bg: 'rgba(220, 38, 38, 0.12)' },
  medium: { light: '#F59E0B', dark: '#FBBF24', bg: 'rgba(245, 158, 11, 0.12)' },
  low: { light: '#16A34A', dark: '#22C55E', bg: 'rgba(22, 163, 74, 0.12)' },
};

export const categoryColors: Record<TaskCategory, string> = {
  work: '#1A9FE8',
  study: '#8B5CF6',
  health: '#22C55E',
  personal: '#F59E0B',
  family: '#EC4899',
  finance: '#14B8A6',
  custom: '#64748B',
};

export const allCategories: TaskCategory[] = ['work', 'study', 'health', 'personal', 'family', 'finance', 'custom'];
export const allPriorities: TaskPriority[] = ['high', 'medium', 'low'];
export const allStatuses: TaskStatus[] = ['pending', 'in_progress', 'done', 'postponed', 'cancelled'];
export const allRepeatTypes: RepeatType[] = ['none', 'daily', 'weekly', 'monthly', 'custom'];

export const weekDays = [0, 1, 2, 3, 4, 5, 6]; // 0=Sun..6=Sat

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatTime(time: string): string {
  // HH:mm -> display
  return time;
}

export function formatDateDisplay(dateStr: string, lang: 'ar' | 'en' = 'ar'): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = todayISODate();
  const tomorrow = getTomorrowDate();

  if (dateStr === today) return lang === 'ar' ? 'اليوم' : 'Today';
  if (dateStr === tomorrow) return lang === 'ar' ? 'غداً' : 'Tomorrow';

  const days = lang === 'ar'
    ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = lang === 'ar'
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}
