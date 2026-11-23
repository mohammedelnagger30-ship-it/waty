import { Task } from '@/src/storage/entities';
import { taskRepository, settingsRepository } from '@/src/storage';
import { todayISODate } from '@/src/storage/repository';
import { addDays } from '@/src/utils/taskUtils';

export const ROLLOVER_THRESHOLD = 3;

export async function runAutoRollover(): Promise<{ rolled: number; flagged: Task[] }> {
  const settings = await settingsRepository.getCurrent();
  if (!settings?.autoRolloverEnabled) return { rolled: 0, flagged: [] };

  const all = await taskRepository.getAll();
  const today = todayISODate();
  const flagged: Task[] = [];

  for (const task of all) {
    if (task.status === 'done' || task.status === 'cancelled') continue;
    if (task.date >= today) continue;

    const newCount = (task.rolloverCount ?? 0) + 1;
    await taskRepository.update(task.id, {
      date: today,
      originalDate: task.originalDate ?? task.date,
      rolloverCount: newCount,
    });

    if (newCount >= ROLLOVER_THRESHOLD) {
      flagged.push({ ...task, rolloverCount: newCount, date: today });
    }
  }

  return { rolled: flagged.length === 0 ? countRolled(all, today) : countRolled(all, today), flagged };
}

function countRolled(all: Task[], today: string): number {
  return all.filter((t) => t.date === today && (t.rolloverCount ?? 0) > 0).length;
}

export function getRolloverBadge(count: number): string | null {
  if (count < 1) return null;
  return `${count}x`;
}

export function shouldPromptRollover(task: Task): boolean {
  return (task.rolloverCount ?? 0) >= ROLLOVER_THRESHOLD;
}

export async function moveTaskToTomorrow(task: Task): Promise<Task | null> {
  return moveTaskToDate(task, addDays(task.date, 1));
}

export async function moveTaskToDate(task: Task, date: string): Promise<Task | null> {
  const newCount = task.date < todayISODate() ? (task.rolloverCount ?? 0) + 1 : task.rolloverCount ?? 0;
  const updated = await taskRepository.update(task.id, {
    date,
    status: 'pending',
    originalDate: task.originalDate ?? task.date,
    rolloverCount: newCount,
  });
  return updated;
}
