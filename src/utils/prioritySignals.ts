import type { Task } from '@/src/storage/entities';
import { toLocalDateKey } from './taskUtils';

/** Pure, storage-free signals that turn the existing task graph into advice. */

export interface ImpactTask {
  task: Task;
  /** Unique active tasks that wait on this one, directly or indirectly. */
  blockedCount: number;
  directCount: number;
}

function isActive(task: Task): boolean {
  return task.status !== 'done' && task.status !== 'cancelled';
}

/** A task locked behind an unfinished blocker cannot be the next best action. */
function hasUnmetDependency(task: Task, byId: Map<string, Task>): boolean {
  return (task.dependsOn ?? []).some((id) => {
    const parent = byId.get(id);
    return !!parent && isActive(parent);
  });
}

/**
 * Reverse dependency graph: who is waiting on each task. Completing a task
 * with a high count unblocks the most downstream work. Missing ids and cycles
 * are ignored safely, so a corrupt backup can never hang the screen.
 */
export function findHighImpactTasks(tasks: Task[], limit = 3): ImpactTask[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const children = new Map<string, string[]>();

  tasks.forEach((task) => {
    (task.dependsOn ?? []).forEach((parentId) => {
      if (parentId === task.id || !byId.has(parentId)) return;
      const list = children.get(parentId) ?? [];
      list.push(task.id);
      children.set(parentId, list);
    });
  });

  const reachable = (startId: string): Set<string> => {
    const seen = new Set<string>();
    const queue = [...(children.get(startId) ?? [])];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const child = byId.get(id);
      if (!child || !isActive(child)) continue;
      (children.get(id) ?? []).forEach((next) => {
        if (!seen.has(next)) queue.push(next);
      });
    }
    return seen;
  };

  return tasks
    .filter(
      (task) =>
        isActive(task) &&
        !hasUnmetDependency(task, byId) &&
        (children.get(task.id)?.length ?? 0) > 0,
    )
    .map((task) => {
      const direct = (children.get(task.id) ?? []).filter((id) => {
        const child = byId.get(id);
        return !!child && isActive(child);
      });
      return { task, blockedCount: reachable(task.id).size, directCount: direct.length };
    })
    .sort(
      (a, b) =>
        b.blockedCount - a.blockedCount ||
        b.directCount - a.directCount ||
        a.task.title.localeCompare(b.task.title),
    )
    .slice(0, limit);
}

export interface QuickWin {
  task: Task;
  minutes: number;
  score: number;
}

/**
 * Small, unblocked tasks that are either overdue/due today or important.
 * Only tasks with a known estimate (<= 25 min) qualify, so the label stays
 * honest. Undefined estimates are never presented as "quick".
 */
export function findQuickWins(tasks: Task[], now: Date = new Date(), limit = 3): QuickWin[] {
  const today = toLocalDateKey(now);
  const byId = new Map(tasks.map((task) => [task.id, task]));

  return tasks
    .filter((task) => {
      if (!isActive(task)) return false;
      const minutes = task.estimatedMinutes ?? 0;
      if (minutes <= 0 || minutes > 25) return false;
      if (hasUnmetDependency(task, byId)) return false;
      return task.date <= today || task.priority === 'high' || task.isMIT === true;
    })
    .map((task) => {
      const minutes = task.estimatedMinutes ?? 0;
      const urgent = task.date <= today ? 4 : 0;
      const important = task.priority === 'high' ? 3 : task.isMIT ? 2 : 0;
      return { task, minutes, score: urgent + important + (25 - minutes) / 25 };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.minutes - b.minutes ||
        a.task.date.localeCompare(b.task.date),
    )
    .slice(0, limit);
}
