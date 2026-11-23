const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

const HIJRI_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function toHijri(date: Date): { year: number; month: number; day: number } {
  const jd = gregorianToJD(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const hijri = jdToHijri(jd);
  return hijri;
}

function gregorianToJD(year: number, month: number, day: number): number {
  if (month < 3) {
    year--;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524;
}

function jdToHijri(jd: number): { year: number; month: number; day: number } {
  jd = Math.floor(jd) + 0.5;
  const year = Math.floor((30 * (jd - 1948439.5) + 10646) / 10631);
  let month = Math.ceil((jd - (29 + hijriToJD(year, 1, 1))) / 29.5) + 1;
  if (month < 1) month = 1;
  if (month > 12) month = 12;
  const day = jd - hijriToJD(year, month, 1) + 1;
  return { year, month: month - 1, day: Math.floor(day) };
}

function hijriToJD(year: number, month: number, day: number): number {
  return (
    day +
    Math.ceil(29.5 * (month - 1)) +
    (year - 1) * 354 +
    Math.floor((3 + 11 * year) / 30) +
    1948439.5 -
    1
  );
}

export function getHijriDate(date: Date = new Date()): string {
  const hijri = toHijri(date);
  return `${hijri.day} ${HIJRI_MONTHS[hijri.month]} ${hijri.year}هـ`;
}

export function getHijriDateShort(date: Date = new Date()): string {
  const hijri = toHijri(date);
  return `${hijri.day} ${HIJRI_MONTHS[hijri.month]}`;
}

export function getFullDateString(date: Date = new Date(), lang: 'ar' | 'en' = 'ar'): string {
  const days = lang === 'ar'
    ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = lang === 'ar'
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

export function getGreeting(hour: number = new Date().getHours(), lang: 'ar' | 'en' = 'ar'): string {
  if (hour >= 5 && hour < 12) return lang === 'ar' ? 'صباح الخير' : 'Good morning';
  if (hour >= 12 && hour < 17) return lang === 'ar' ? 'مساء الخير' : 'Good afternoon';
  if (hour >= 17 && hour < 21) return lang === 'ar' ? 'مساء الخير' : 'Good evening';
  return lang === 'ar' ? 'ليلة سعيدة' : 'Good night';
}
