import { TaskTemplate } from '@/src/storage/entities';
import { generateId, nowISO } from '@/src/storage/repository';

/** Built-in morning/evening routine recipes. Stored as normal task templates. */
export type RoutineId = 'morning' | 'evening';

const CONTENT: Record<RoutineId, Record<'ar' | 'en', { title: string; description: string; steps: string[] }>> = {
  morning: {
    ar: {
      title: 'روتين الصباح',
      description: 'ابدأ يومك بخطوات ثابتة وسريعة',
      steps: ['اشرب مية وافتح الشباك', 'راجع مهام اليوم', 'اختر أهم مهمة (MIT)', 'ابدأ جلسة تركيز قصيرة'],
    },
    en: {
      title: 'Morning routine',
      description: 'Start the day with a short, repeatable ritual',
      steps: ['Drink water and open the window', 'Review today’s tasks', 'Pick the Most Important Task', 'Start a short focus session'],
    },
  },
  evening: {
    ar: {
      title: 'روتين المساء',
      description: 'اختم يومك بهدوء وجاهزية ليوم جديد',
      steps: ['راجع اللي اتعمل', 'جهّز مهام الغد', 'رتّب المساحة حواليك', 'اكتب ملاحظة قصيرة للمراجعة الأسبوعية'],
    },
    en: {
      title: 'Evening routine',
      description: 'Close the day calmly and prepare for tomorrow',
      steps: ['Review what you finished', 'Choose tomorrow’s top task', 'Tidy your workspace', 'Write a short weekly-review note'],
    },
  },
};

export const ROUTINE_IDS: RoutineId[] = ['morning', 'evening'];

export function routineTemplateFor(id: RoutineId, language: 'ar' | 'en'): TaskTemplate {
  const content = CONTENT[id][language];
  const now = nowISO();
  return {
    id: generateId(),
    title: content.title,
    description: content.description,
    category: 'personal',
    priority: 'medium',
    estimatedMinutes: 30,
    tags: ['routine', id],
    subtaskTitles: content.steps,
    repeat: 'daily',
    createdAt: now,
    updatedAt: now,
  };
}
