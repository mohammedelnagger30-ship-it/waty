import type { ReviewMood } from '@/src/storage/entities';

/** Builds a shareable weekly recap from numbers already on the review screen. */

export interface WeeklySummaryInput {
  language: 'ar' | 'en';
  startDate: string;
  endDate: string;
  completed: number;
  due: number;
  completionRate: number;
  goalProgress: number;
  habitRate: number;
  moods: ReviewMood[];
  wentWell?: string;
  improve?: string;
}

const MOOD_LABELS: Record<ReviewMood, { ar: string; en: string }> = {
  great: { ar: 'ممتاز', en: 'great' },
  good: { ar: 'جيد', en: 'good' },
  okay: { ar: 'عادي', en: 'okay' },
  bad: { ar: 'صعب', en: 'rough' },
};

function tidy(value?: string): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 140);
}

function dominantMood(moods: ReviewMood[]): ReviewMood | null {
  if (!moods.length) return null;
  const counts = new Map<ReviewMood, number>();
  moods.forEach((mood) => counts.set(mood, (counts.get(mood) ?? 0) + 1));
  let best: ReviewMood | null = null;
  let bestCount = 0;
  counts.forEach((count, mood) => {
    if (count > bestCount) {
      best = mood;
      bestCount = count;
    }
  });
  return best;
}

export function buildWeeklySummary(input: WeeklySummaryInput): string {
  const mood = dominantMood(input.moods);
  const well = tidy(input.wentWell);
  const improve = tidy(input.improve);

  if (input.language === 'ar') {
    const lines = [
      `ملخص الأسبوع ${input.startDate} — ${input.endDate}`,
      `أنجزت ${input.completed} من ${input.due} مهمة (${input.completionRate}٪).`,
      `تقدّم الأهداف ${input.goalProgress}٪ · انتظام العادات ${input.habitRate}٪.`,
    ];
    if (mood) lines.push(`المزاج الغالب: ${MOOD_LABELS[mood].ar}.`);
    if (well) lines.push(`ما نجح: ${well}`);
    if (improve) lines.push(`التركيز الأسبوع الجاي: ${improve}`);
    return lines.join('\n');
  }

  const lines = [
    `Weekly recap ${input.startDate} — ${input.endDate}`,
    `Completed ${input.completed} of ${input.due} tasks (${input.completionRate}%).`,
    `Goal progress ${input.goalProgress}% · habit consistency ${input.habitRate}%.`,
  ];
  if (mood) lines.push(`Dominant mood: ${MOOD_LABELS[mood].en}.`);
  if (well) lines.push(`What worked: ${well}`);
  if (improve) lines.push(`Next week's focus: ${improve}`);
  return lines.join('\n');
}
