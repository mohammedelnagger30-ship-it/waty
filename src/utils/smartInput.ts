/**
 * Small, dependency-free parser for natural Arabic date/time phrases.
 * It is intentionally conservative: only phrases it recognises are removed
 * from the task title, so the rest of the user's text is always preserved.
 */

export type SmartInputResult = {
  title: string;
  date?: string; // YYYY-MM-DD in local time
  time?: string; // HH:mm in 24-hour format
  detected: string[];
};

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

const WEEKDAYS: Record<string, number> = {
  الأحد: 0,
  الاحد: 0,
  الإثنين: 1,
  الاثنين: 1,
  اثنين: 1,
  الثلاثاء: 2,
  ثلاثاء: 2,
  الأربعاء: 3,
  الاربعاء: 3,
  أربعاء: 3,
  الخميس: 4,
  خميس: 4,
  الجمعة: 5,
  الجمعه: 5,
  جمعة: 5,
  السبت: 6,
  سبت: 6,
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function nextWeekday(date: Date, target: number): Date {
  const current = date.getDay();
  const delta = (target - current + 7) % 7;
  return addDays(date, delta);
}

/**
 * Parse a free-text task title. Call with `now` injected when you need
 * deterministic results (tests, scheduled routines).
 */
export function parseSmartInput(raw: string, now: Date = new Date()): SmartInputResult {
  const normalized = normalizeDigits(raw || '');
  const detected: string[] = [];
  let date: string | undefined;
  let time: string | undefined;
  let working = normalized;

  const consume = (regex: RegExp, handler: (match: RegExpMatchArray) => void) => {
    const match = working.match(regex);
    if (!match) return;
    handler(match);
    detected.push(match[0].trim());
    working = working.replace(match[0], ' ');
  };

  // Time: 9:30 / 09:30 / 21:45, optionally followed by صباحاً/مساءً.
  // Avoid lookbehind: Hermes on older Android devices does not support it.
  consume(/(^|[^\d])(\d{1,2}):(\d{2})(?:\s*(صباحاً|صباحا|ص|مساءً|مساء|م))?/u, (m) => {
    let hour = Number(m[2]);
    const minute = Math.min(59, Number(m[3]));
    const suffix = m[4];
    if (suffix && /^(ص|صباح)/u.test(suffix)) {
      if (hour === 12) hour = 0;
    } else if (suffix && /^(م|مساء)/u.test(suffix)) {
      if (hour < 12) hour += 12;
    } else if (hour > 23) {
      return;
    }
    time = `${pad(hour)}:${pad(minute)}`;
  });

  if (!time) {
    consume(/(^|[^\d])(\d{1,2})\s*(صباحاً|صباحا|ص|مساءً|مساء|م)\b/u, (m) => {
      let hour = Number(m[2]);
      if (/^(ص|صباح)/u.test(m[3])) {
        if (hour === 12) hour = 0;
      } else if (hour < 12) {
        hour += 12;
      }
      time = `${pad(hour)}:00`;
    });
  }

  // Relative dates first (they are more specific than bare weekdays).
  consume(/بعد\s+بكره|بعد\s+غدا(?:\s+صباحاً)?|بعد\s+غداً/u, () => {
    date = toISODate(addDays(now, 2));
  });

  if (!date) {
    consume(/\bبكره\b|\bغدا\b|\bغداً\b/u, () => {
      date = toISODate(addDays(now, 1));
    });
  }

  if (!date) {
    consume(/\bاليوم\b|\bالیوم\b/u, () => {
      date = toISODate(now);
    });
  }

  if (!date) {
    const weekdayPattern = new RegExp(`\\b(${Object.keys(WEEKDAYS).join('|')})\\b`, 'u');
    consume(weekdayPattern, (m) => {
      const target = WEEKDAYS[m[1]];
      if (target !== undefined) date = toISODate(nextWeekday(now, target));
    });
  }

  // Relative time offsets only when no explicit clock time was given.
  if (!time) {
    consume(/الآن|الان/u, () => {
      time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    });
  }

  if (!time) {
    consume(/بعد\s+(\d+)\s*(ساعات?|ساعه|دقائق?|دقيقه)/u, (m) => {
      const amount = Number(m[1]);
      const isHours = /ساع/u.test(m[2]);
      const minutes = isHours ? amount * 60 : amount;
      const target = new Date(now.getTime() + minutes * 60_000);
      time = `${pad(target.getHours())}:${pad(target.getMinutes())}`;
      if (!date) date = toISODate(target);
    });
  }

  const title = working
    .replace(/[ \t]+/gu, ' ')
    .replace(/\s+([.,،؟?])/gu, '$1')
    .trim();

  return { title: title || normalized.trim(), date, time, detected };
}

export default parseSmartInput;
