import {
  Goal,
  GoalStatus,
  GoalType,
  Milestone,
  Plan,
  PlanPhase,
  Task,
  TaskCategory,
  TaskPriority,
} from '@/src/storage/entities';
import { generateId, nowISO, todayISODate } from '@/src/storage/repository';
import { Language } from '@/src/i18n/translations';
import { GOAL_TEMPLATES, GoalTemplate, generateTemplateData } from './goalTemplates';
import { addDays, createDefaultTask } from './taskUtils';

export interface GoalInput {
  title: string;
  description?: string;
  motivation?: string;
  category: TaskCategory;
  type: GoalType;
  status: GoalStatus;
  targetValue?: number;
  targetUnit?: string;
  targetDate?: string;
  color?: string;
  progressMode?: Goal['progressMode'];
  currentValue?: number;
  milestones?: Milestone[];
}

export interface TemplateBundle {
  goal: Goal;
  plan: Plan;
  tasks: Task[];
}

export function localizedTemplate(template: GoalTemplate, language: Language) {
  return {
    title: language === 'ar' ? template.titleAr : template.titleEn,
    description: language === 'ar' ? template.descriptionAr : template.descriptionEn,
    motivation: language === 'ar' ? template.motivationAr : template.motivationEn,
    unit: language === 'ar' ? template.targetUnit : template.targetUnit,
  };
}

export function createGoal(input: GoalInput): Goal {
  const now = nowISO();
  return {
    id: generateId(),
    title: input.title,
    description: input.description,
    motivation: input.motivation,
    category: input.category,
    status: input.status,
    type: input.type,
    targetDate: input.targetDate,
    targetValue: input.targetValue,
    targetUnit: input.targetUnit,
    currentValue: input.currentValue ?? 0,
    progress: 0,
    progressMode: input.progressMode ?? 'auto',
    milestones: input.milestones ?? [],
    color: input.color,
    createdAt: now,
    updatedAt: now,
  };
}

export function getGoalProgress(goal: Goal, tasks: Task[]): number {
  if (goal.progressMode === 'manual') {
    const target = goal.targetValue ?? 100;
    if (target <= 0) return goal.progress;
    return Math.min(100, Math.round(((goal.currentValue ?? 0) / target) * 100));
  }

  const linked = tasks.filter((task) => task.goalId === goal.id && task.status !== 'cancelled');
  const done = linked.filter((task) => task.status === 'done').length;
  if (linked.length > 0) {
    return Math.min(100, Math.round((done / linked.length) * 100));
  }

  const milestones = goal.milestones;
  if (milestones.length > 0) {
    const doneMilestones = milestones.filter((m) => m.done).length;
    return Math.min(100, Math.round((doneMilestones / milestones.length) * 100));
  }

  return goal.progress;
}

export function syncGoalProgress(goal: Goal, tasks: Task[]): Goal {
  const progress = getGoalProgress(goal, tasks);
  const status: GoalStatus =
    progress >= 100 ? 'completed' : goal.status === 'completed' ? 'active' : goal.status;
  if (progress === goal.progress && status === goal.status) return goal;
  return { ...goal, progress, status, updatedAt: nowISO() };
}

export function milestoneProgress(milestone: Milestone): number {
  if (milestone.done) return 100;
  if (!milestone.targetValue || milestone.targetValue <= 0) return 0;
  return Math.min(100, Math.round(((milestone.currentValue ?? 0) / milestone.targetValue) * 100));
}

function nextMilestoneEnd(milestones: Milestone[], index: number, fallback: string): string | undefined {
  const next = milestones[index + 1];
  if (next?.date) {
    const d = new Date(next.date + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
  return fallback || undefined;
}

export function createPlanForGoal(
  title: string,
  goalId: string | undefined,
  type: Plan['type'],
  startDate: string,
  endDate: string | undefined,
  milestones: Milestone[],
  taskIds: string[],
): Plan {
  const now = nowISO();
  const phases: PlanPhase[] = milestones.map((milestone, index) => {
    const assigned = taskIds.slice(
      Math.floor((index * taskIds.length) / Math.max(milestones.length, 1)),
      Math.floor(((index + 1) * taskIds.length) / Math.max(milestones.length, 1)),
    );
    return {
      id: generateId(),
      title: milestone.title,
      startDate: milestone.date ?? startDate,
      endDate: nextMilestoneEnd(milestones, index, endDate ?? ''),
      taskIds: assigned,
    };
  });

  return {
    id: generateId(),
    title,
    goalId,
    startDate,
    endDate,
    type,
    phases,
    taskIds,
    createdAt: now,
    updatedAt: now,
  };
}

export function createBundleFromTemplate(templateId: string, language: Language): TemplateBundle | null {
  const template = GOAL_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return null;

  const localized = localizedTemplate(template, language);
  const generated = generateTemplateData(templateId);
  const goal = createGoal({
    title: localized.title,
    description: localized.description,
    motivation: localized.motivation,
    category: template.category,
    type: template.type,
    status: 'active',
    targetValue: template.targetValue,
    targetUnit: localized.unit,
    color: template.color,
    progressMode: 'auto',
    milestones: generated.milestones,
  });

  const planId = generateId();
  const today = todayISODate();
  const tasks: Task[] = generated.tasks.map((partial, index) => {
    const category = partial.category ?? template.category;
    return createDefaultTask({
      title: partial.title ?? localized.title,
      category,
      priority: (partial.priority ?? 'medium') as TaskPriority,
      estimatedMinutes: partial.estimatedMinutes,
      date: addDays(today, Math.floor(index / 2) * 7),
      goalId: goal.id,
      planId,
      tags: [localized.title],
      notes: language === 'ar' ? 'مهمة مقترحة من قالب الهدف' : 'Suggested by goal template',
    });
  });

  const plan = createPlanForGoal(
    localized.title,
    goal.id,
    'monthly',
    today,
    generated.milestones[generated.milestones.length - 1]?.date,
    generated.milestones,
    tasks.map((task) => task.id),
  );
  plan.id = planId;

  return { goal, plan, tasks };
}

export function getTemplateById(id: string): GoalTemplate | undefined {
  return GOAL_TEMPLATES.find((item) => item.id === id);
}
