import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Task, TaskReminder, ReminderOffset, NotificationSettings, AlarmSoundId } from '@/src/storage/entities';
import { taskRepository, reminderRepository, notificationSettingsRepository, habitRepository, subscribeToSettings } from '@/src/storage';
import { generateId } from '@/src/storage/repository';
import { completeRepeatingTask, getUnmetDependencies } from '@/src/utils/taskUtils';
import { isHabitCompletedOn, isHabitDueOn } from '@/src/utils/habitUtils';
import { ALARM_PRESETS, getAlarmPreset } from './alarmOptions';

// --- Notification channel setup ---

export const NOTIF_CHANNELS = {
  default: 'default',
  reminders: 'reminders',
  summary: 'summary',
  overdue: 'overdue',
  habits: 'habits',
  silentVibrate: 'silent_vibrate',
  silent: 'silent',
} as const;

/** Parses HH:mm defensively so a corrupted value can never schedule NaN. */
function parseClock(value: string | undefined): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// expo-notifications native APIs are unavailable on web. The browser build is
// used for QA, so keep scheduling best-effort there instead of throwing.
const NOTIFICATIONS_AVAILABLE = Platform.OS !== 'web';

// Rapid task edits used to reschedule three derived notifications each time.
// Coalesce them into one native pass per short window.
const DERIVED_DEBOUNCE_MS = 120;
let derivedTimer: ReturnType<typeof setTimeout> | null = null;
let derivedRunning = false;
let derivedQueued = false;
let derivedResolvers: Array<() => void> = [];

function scheduleDerivedTimer(): void {
  if (derivedTimer) return;
  derivedTimer = setTimeout(() => {
    derivedTimer = null;
    if (derivedRunning) {
      derivedQueued = true;
      return;
    }
    void (async () => {
      derivedRunning = true;
      try {
        await refreshTaskDerivedNotifications();
      } catch {
        // Best effort; a later edit will try again.
      } finally {
        derivedRunning = false;
        if (derivedQueued) {
          derivedQueued = false;
          scheduleDerivedTimer();
        } else {
          const resolvers = derivedResolvers;
          derivedResolvers = [];
          resolvers.forEach((resolve) => resolve());
        }
      }
    })();
  }, DERIVED_DEBOUNCE_MS);
}

/** Runs the derived summary/overdue/nudge refresh at most once per window. */
function requestDerivedRefresh(): Promise<void> {
  return new Promise<void>((resolve) => {
    derivedResolvers.push(resolve);
    scheduleDerivedTimer();
  });
}

// A full reschedule is only needed when task/settings data actually changes or
// the local day rolls over. Otherwise returning to the foreground can skip the
// expensive native cancel/recreate cycle.
let notificationStateVersion = 0;
let lastRescheduledVersion = -1;
let lastRescheduledDate = '';

// A settings/task edit marks notifications dirty. Coalesce the resulting full
// rebuild so a burst of toggles cannot trigger a native cancel/schedule storm.
const FULL_RESCHEDULE_DEBOUNCE_MS = 240;
let fullRescheduleTimer: ReturnType<typeof setTimeout> | null = null;

// An account switch invalidates any in-flight native scheduling. Without a
// generation check, a reschedule started for the previous account could finish
// after the switch and mark the new account as already scheduled.
let notificationGeneration = 0;
let activeReschedule: Promise<void> | null = null;
let activeDerived: Promise<void> | null = null;

function isCurrentNotificationGeneration(generation: number): boolean {
  return generation === notificationGeneration;
}

function scheduleFullReschedule(): void {
  if (!NOTIFICATIONS_AVAILABLE || fullRescheduleTimer) return;
  fullRescheduleTimer = setTimeout(() => {
    fullRescheduleTimer = null;
    if (!needsFullNotificationReschedule()) return;
    void rescheduleAllNotifications().catch(() => {
      // A later foreground/edit pass will retry.
    });
  }, FULL_RESCHEDULE_DEBOUNCE_MS);
}

export function markNotificationsDirty(): void {
  notificationStateVersion += 1;
  scheduleFullReschedule();
}

export function needsFullNotificationReschedule(): boolean {
  return (
    notificationStateVersion !== lastRescheduledVersion ||
    localDateString(new Date()) !== lastRescheduledDate
  );
}

function markRescheduled(): void {
  lastRescheduledVersion = notificationStateVersion;
  lastRescheduledDate = localDateString(new Date());
}

/** Clears every scheduled alert before switching to a different account. */
export async function clearAllNotifications(): Promise<void> {
  notificationGeneration += 1;
  if (fullRescheduleTimer) {
    clearTimeout(fullRescheduleTimer);
    fullRescheduleTimer = null;
  }
  if (derivedTimer) {
    clearTimeout(derivedTimer);
    derivedTimer = null;
  }
  derivedQueued = false;
  derivedResolvers.splice(0).forEach((resolve) => resolve());
  // Let work already talking to the native scheduler finish before clearing,
  // so it cannot recreate alerts for the previous user afterwards.
  await activeReschedule?.catch(() => {});
  await activeDerived?.catch(() => {});
  await cancelAllScheduled();
  if (NOTIFICATIONS_AVAILABLE) {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch {
      // No delivered notifications to remove.
    }
  }
  notificationStateVersion += 1;
  lastRescheduledVersion = -1;
  lastRescheduledDate = '';
}

async function cancelNotification(id: string): Promise<void> {
  if (!NOTIFICATIONS_AVAILABLE) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or removed by the OS.
  }
}

async function cancelAllScheduled(): Promise<void> {
  if (!NOTIFICATIONS_AVAILABLE) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // No scheduled notifications to clear.
  }
}

type ScheduleRequest = Parameters<typeof Notifications.scheduleNotificationAsync>[0];

async function scheduleNotification(request: ScheduleRequest): Promise<string | null> {
  const generation = notificationGeneration;
  if (!NOTIFICATIONS_AVAILABLE || !isCurrentNotificationGeneration(generation)) return null;
  try {
    return await Notifications.scheduleNotificationAsync(request);
  } catch {
    return null;
  }
}

async function getAllScheduled(): Promise<Notifications.NotificationRequest[]> {
  if (!NOTIFICATIONS_AVAILABLE) return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }
}

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(NOTIF_CHANNELS.default, {
    name: 'الإشعارات',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1A9FE8',
  });

  await Notifications.setNotificationChannelAsync(NOTIF_CHANNELS.reminders, {
    name: 'تذكيرات المهام',
    description: 'تذكيرات بالمهام المجدولة',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1A9FE8',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(NOTIF_CHANNELS.summary, {
    name: 'ملخص اليوم',
    description: 'ملخص صباحي ومسائي',
    importance: Notifications.AndroidImportance.LOW,
    lightColor: '#1ACB61',
  });

  await Notifications.setNotificationChannelAsync(NOTIF_CHANNELS.overdue, {
    name: 'المهام المتأخرة',
    description: 'تذكير بالمهام المتأخرة',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#DC2626',
  });

  await Notifications.setNotificationChannelAsync(NOTIF_CHANNELS.habits, {
    name: 'تذكيرات العادات',
    description: 'تذكيرات يومية للعادات',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#F59E0B',
  });

  // One loud alarm channel per tone. Android 8+ takes sound and vibration from
  // the channel, so separate channels are required for genuinely different alarms.
  for (const preset of ALARM_PRESETS) {
    await Notifications.setNotificationChannelAsync(preset.channelId, {
      name: `منبه: ${preset.nameAr}`,
      description: 'منبه صوتي وقوي مع اهتزاز عند موعد المهمة',
      importance: Notifications.AndroidImportance.MAX,
      sound: preset.sound,
      vibrationPattern: preset.vibrationPattern,
      lightColor: preset.lightColor,
      bypassDnd: true,
      audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM },
    });
  }

  await Notifications.setNotificationChannelAsync(NOTIF_CHANNELS.silentVibrate, {
    name: 'تذكير باهتزاز فقط',
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    vibrationPattern: [0, 500, 200, 500, 200, 1200],
  });

  await Notifications.setNotificationChannelAsync(NOTIF_CHANNELS.silent, {
    name: 'تذكير صامت',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    vibrationPattern: [0],
  });
}

/** Fire an immediate alarm notification so users can compare tones in-app. */
export async function previewAlarm(soundId?: AlarmSoundId): Promise<void> {
  if (Platform.OS !== 'android') return;
  await setupNotificationChannels();
  const preset = getAlarmPreset(soundId);
  const routing = getChannelForReminder('at_time', preset.id, true, true);
  await scheduleNotification({
    content: {
      title: `تجربة المنبه: ${preset.nameAr}`,
      body: 'كدة هيطلع المنبه عند موعد المهمة 🔔',
      data: { type: 'alarm_preview' },
      sound: routing.sound,
      vibrate: routing.vibrate,
      ...(Platform.OS === 'android'
        ? { channelId: routing.channelId, priority: Notifications.AndroidNotificationPriority.MAX }
        : {}),
    },
    trigger: null,
  });
}

// --- Permission handling ---

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!NOTIFICATIONS_AVAILABLE) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    await setupNotificationChannels();
  }
  return true;
}

// --- Notification action categories ---

export async function registerNotificationCategories(): Promise<void> {
  if (!NOTIFICATIONS_AVAILABLE) return;
  const completeAction: Notifications.NotificationAction = {
    identifier: 'complete',
    buttonTitle: 'تم',
    options: { opensAppToForeground: false },
  };
  const postponeHourAction: Notifications.NotificationAction = {
    identifier: 'postpone_hour',
    buttonTitle: 'أجّل ساعة',
    options: { opensAppToForeground: false },
  };
  const postponeTenAction: Notifications.NotificationAction = {
    identifier: 'postpone_ten',
    buttonTitle: 'بعد ١٠ دقائق',
    options: { opensAppToForeground: false },
  };
  const postponeDayAction: Notifications.NotificationAction = {
    identifier: 'postpone_day',
    buttonTitle: 'رحّلها لبكرة',
    options: { opensAppToForeground: false },
  };

  await Notifications.setNotificationCategoryAsync('task_reminder', [
    completeAction,
    postponeTenAction,
    postponeHourAction,
    postponeDayAction,
  ]);
}

// --- Quiet hours check ---

export function isWithinQuietHours(
  timeStr: string,
  quietStart: string,
  quietEnd: string,
): boolean {
  const time = parseClock(timeStr);
  const start = parseClock(quietStart);
  const end = parseClock(quietEnd);
  if (!time || !start || !end) return false;

  const tMinutes = time.hour * 60 + time.minute;
  const sMinutes = start.hour * 60 + start.minute;
  const eMinutes = end.hour * 60 + end.minute;

  if (sMinutes < eMinutes) {
    return tMinutes >= sMinutes && tMinutes < eMinutes;
  } else {
    // Overnight quiet hours (e.g. 22:00 -> 07:00)
    return tMinutes >= sMinutes || tMinutes < eMinutes;
  }
}

// --- Scheduling helpers ---

function reminderOffsetMinutes(offset: ReminderOffset, customMinutes?: number): number {
  switch (offset) {
    case 'at_time': return 0;
    case '5': return 5;
    case '10': return 10;
    case '15': return 15;
    case '30': return 30;
    case '60': return 60;
    case 'custom': return customMinutes ?? 0;
    default: return 0;
  }
}

interface AlarmRouting {
  channelId: string;
  sound?: string;
  vibrate?: number[];
}

function getChannelForReminder(
  offset: ReminderOffset,
  alarmSound: string | undefined,
  soundEnabled: boolean,
  vibrationEnabled: boolean,
): AlarmRouting {
  if (offset !== 'at_time') {
    return {
      channelId: NOTIF_CHANNELS.reminders,
      sound: soundEnabled ? 'default' : undefined,
      vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
    };
  }

  const preset = getAlarmPreset(alarmSound as AlarmSoundId | undefined);
  if (!soundEnabled) {
    return {
      channelId: vibrationEnabled ? NOTIF_CHANNELS.silentVibrate : NOTIF_CHANNELS.silent,
      vibrate: vibrationEnabled ? preset.vibrationPattern : undefined,
    };
  }
  return {
    channelId: preset.channelId,
    sound: Platform.OS === 'android' ? preset.sound : 'default',
    vibrate: vibrationEnabled ? preset.vibrationPattern : undefined,
  };
}

function buildTriggerDate(task: Task, offsetMinutes: number): Date | null {
  const clock = parseClock(task.time);
  if (!clock) return null;
  const trigger = new Date(`${task.date}T00:00:00`);
  if (Number.isNaN(trigger.getTime())) return null;
  trigger.setHours(clock.hour, clock.minute, 0, 0);
  trigger.setMinutes(trigger.getMinutes() - offsetMinutes);
  const now = new Date();
  if (trigger.getTime() <= now.getTime()) return null;
  return trigger;
}

interface ScheduleInput {
  taskId: string;
  taskTitle: string;
  taskTime?: string;
  date: string;
  offset: ReminderOffset;
  customMinutes?: number;
  alarmSound?: AlarmSoundId;
  body?: string;
}

async function scheduleOneReminder(
  input: ScheduleInput,
  settingsOverride?: NotificationSettings,
): Promise<string | null> {
  const offsetMin = reminderOffsetMinutes(input.offset, input.customMinutes);
  const triggerDate = buildTriggerDate(
    { id: input.taskId, title: input.taskTitle, date: input.date, time: input.taskTime } as Task,
    offsetMin,
  );
  if (!triggerDate) return null;

  const notifSettings = settingsOverride ?? (await notificationSettingsRepository.getOrCreate());
  if (!notifSettings.enabled) return null;

  const timeStr = formatClock(triggerDate.getHours(), triggerDate.getMinutes());
  if (notifSettings.quietHoursEnabled) {
    if (isWithinQuietHours(timeStr, notifSettings.quietHoursStart, notifSettings.quietHoursEnd)) {
      return null;
    }
  }

  const minutesBefore = offsetMin === 0 ? '' : `قبل ${offsetMin} دقيقة - `;
  const bodyText = input.body ?? `${minutesBefore}${input.taskTime ?? ''}`;

  const routing = getChannelForReminder(
    input.offset,
    input.alarmSound,
    notifSettings.soundEnabled,
    notifSettings.vibrationEnabled,
  );
  const priority: Notifications.AndroidNotificationPriority =
    input.offset === 'at_time'
      ? Notifications.AndroidNotificationPriority.MAX
      : Notifications.AndroidNotificationPriority.DEFAULT;

  const id = await scheduleNotification({
    content: {
      title: input.taskTitle,
      body: bodyText,
      data: { taskId: input.taskId, type: 'reminder', alarm: input.offset === 'at_time' },
      sound: routing.sound,
      vibrate: routing.vibrate,
      categoryIdentifier: 'task_reminder',
      ...(Platform.OS === 'android' ? { channelId: routing.channelId, priority } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

// --- Public API: schedule, cancel, reschedule ---

async function cancelTaskRemindersInternal(taskId: string): Promise<void> {
  const reminders = await reminderRepository.getAll();
  const taskReminders = reminders.filter((r) => r.taskId === taskId);
  await Promise.all(
    taskReminders.map((r) =>
      r.scheduledId ? cancelNotification(r.scheduledId) : Promise.resolve(),
    ),
  );
  await reminderRepository.deleteMany(taskReminders.map((r) => r.id));
}

export async function cancelTaskReminders(taskId: string): Promise<void> {
  await cancelTaskRemindersInternal(taskId);
  markNotificationsDirty();
  await requestDerivedRefresh();
}

export async function scheduleTaskReminders(task: Task): Promise<void> {
  // Always clear old reminders first, even when the task is now done,
  // untimed or notifications were switched off. This prevents phantom alarms.
  await cancelTaskRemindersInternal(task.id);
  markNotificationsDirty();

  const notifSettings = await notificationSettingsRepository.getOrCreate();
  const inactive = task.status === 'done' || task.status === 'cancelled';
  if (!notifSettings.enabled || inactive || !parseClock(task.time)) {
    await requestDerivedRefresh();
    return;
  }

  // undefined = follow global defaults; an explicit [] means "no reminder".
  const offsets = task.reminderOffsets ?? notifSettings.defaultReminders;

  const reminders: TaskReminder[] = [];
  for (const offset of offsets) {
    const reminder: TaskReminder = {
      id: generateId(),
      taskId: task.id,
      offset,
      customMinutes: offset === 'custom' ? task.reminderCustomMinutes : undefined,
      scheduledId: undefined,
    };

    const scheduledId = await scheduleOneReminder({
      taskId: task.id,
      taskTitle: task.title,
      taskTime: task.time,
      date: task.date,
      offset,
      customMinutes: reminder.customMinutes,
      alarmSound: task.alarmSound ?? notifSettings.alarmSound,
      body: undefined,
    }, notifSettings);

    if (scheduledId) {
      reminder.scheduledId = scheduledId;
      reminders.push(reminder);
    }
  }
  if (reminders.length > 0) await reminderRepository.createMany(reminders);

  await requestDerivedRefresh();
}

export async function rescheduleTaskReminders(task: Task): Promise<void> {
  await scheduleTaskReminders(task);
}

export async function cancelAllReminders(): Promise<void> {
  await cancelAllScheduled();
  // One write instead of a full read-modify-write cycle per reminder.
  await reminderRepository.replaceAll([]);
}

// --- Daily summary notification ---

export async function scheduleMorningSummary(): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!settings.enabled || !settings.morningSummaryEnabled) {
    await cancelNotification('morning_summary');
    return;
  }

  const clock = parseClock(settings.morningSummaryTime);
  if (!clock) {
    await cancelNotification('morning_summary');
    return;
  }
  const { hour: h, minute: m } = clock;

  // The daily briefing should contain the user's actual plan, not a generic
  // nudge — and it must disappear when the plan is empty.
  const tasks = await taskRepository.getAll();
  const today = localDateString(new Date());
  const todaysTasks = tasks
    .filter(
      (task) =>
        task.status !== 'done' &&
        task.status !== 'cancelled' &&
        task.date === today,
    )
    .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));

  await cancelNotification('morning_summary');
  if (todaysTasks.length === 0) return;

  const preview = todaysTasks
    .slice(0, 3)
    .map((task) => `• ${task.time ?? '--:--'} ${task.title}`)
    .join('\n');
  const extra = todaysTasks.length > 3 ? `\nو${todaysTasks.length - 3} مهام أخرى` : '';

  await scheduleNotification({
    content: {
      title: 'صباح الخير! 🌅',
      body: `مهام اليوم (${todaysTasks.length}):\n${preview}${extra}`,
      data: {
        type: 'morning_summary',
        count: todaysTasks.length,
        taskIds: todaysTasks.map((task) => task.id),
      },
      sound: settings.soundEnabled ? 'default' : undefined,
      ...(Platform.OS === 'android' ? { channelId: NOTIF_CHANNELS.summary } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: h,
      minute: m,
    },
    identifier: 'morning_summary',
  });
}

export async function scheduleEveningReview(): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!settings.enabled || !settings.eveningReviewEnabled) {
    await cancelNotification('evening_review');
    return;
  }

  const clock = parseClock(settings.eveningReviewTime);
  if (!clock) {
    await cancelNotification('evening_review');
    return;
  }
  const { hour: h, minute: m } = clock;

  await cancelNotification('evening_review');

  await scheduleNotification({
    content: {
      title: 'خلصت إيه النهارده؟ 🌙',
      body: 'لقّي يومك ومراجعة إنجازاتك',
      data: { type: 'evening_review' },
      sound: settings.soundEnabled ? 'default' : undefined,
      ...(Platform.OS === 'android' ? { channelId: NOTIF_CHANNELS.summary } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: h,
      minute: m,
    },
    identifier: 'evening_review',
  });
}

// --- Overdue reminder ---

export async function scheduleOverdueCheck(): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!settings.enabled || !settings.overdueReminderEnabled) {
    await cancelNotification('overdue_check');
    return;
  }

  const clock = parseClock(settings.overdueReminderTime);
  if (!clock) {
    await cancelNotification('overdue_check');
    return;
  }
  const { hour: h, minute: m } = clock;

  // Never schedule a generic "you have overdue tasks" alert when there are
  // none: that is the phantom notification users complained about.
  const tasks = await taskRepository.getAll();
  const today = localDateString(new Date());
  const overdue = tasks.filter(
    (task) => task.status !== 'done' && task.status !== 'cancelled' && task.date < today,
  );

  await cancelNotification('overdue_check');
  if (overdue.length === 0) return;

  const preview = overdue.slice(0, 3).map((task) => task.title).join('، ');
  const body = overdue.length === 1
    ? `مهمة واحدة متأخرة: ${preview}`
    : `${overdue.length} مهام متأخرة: ${preview}${overdue.length > 3 ? '...' : ''}`;

  await scheduleNotification({
    content: {
      title: 'لديك مهام متأخرة ⚠️',
      body,
      data: {
        type: 'overdue_check',
        count: overdue.length,
        taskIds: overdue.map((task) => task.id),
      },
      sound: settings.soundEnabled ? 'default' : undefined,
      ...(Platform.OS === 'android' ? { channelId: NOTIF_CHANNELS.overdue } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: h,
      minute: m,
    },
    identifier: 'overdue_check',
  });
}

/** Refreshes notifications whose content depends on the current task list. */
async function refreshDerivedFor(generation: number): Promise<void> {
  await Promise.all([
    scheduleMorningSummary(),
    scheduleOverdueCheck(),
    scheduleUntimedTaskNudge(),
  ]);
  if (!isCurrentNotificationGeneration(generation)) return;
}

export async function refreshTaskDerivedNotifications(): Promise<void> {
  const generation = notificationGeneration;
  const work = refreshDerivedFor(generation);
  activeDerived = work;
  try {
    await work;
  } finally {
    if (activeDerived === work) activeDerived = null;
  }
}

// --- Habit reminders ---

export async function scheduleHabitReminders(): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!settings.enabled || !settings.dailyHabitReminderEnabled) {
    await cancelNotification('habit_reminder');
    return;
  }

  await cancelNotification('habit_reminder');

  const clock = parseClock(settings.habitReminderTime);
  if (!clock) return;
  const { hour: h, minute: m } = clock;

  const habits = await habitRepository.getAll();
  const today = localDateString(new Date());
  const pending = habits.filter(
    (habit) => isHabitDueOn(habit, today) && !isHabitCompletedOn(habit, today),
  );
  if (pending.length === 0) return;

  await scheduleNotification({
    content: {
      title: 'تذكير العادات اليومية 💪',
      body: `لديك ${pending.length} عادة للإنجاز اليوم`,
      data: { type: 'habit_reminder' },
      sound: settings.soundEnabled ? 'default' : undefined,
      ...(Platform.OS === 'android' ? { channelId: NOTIF_CHANNELS.habits } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: h,
      minute: m,
    },
    identifier: 'habit_reminder',
  });
}

// --- Weekly backup reminder ---

const WEEKLY_BACKUP_ID = 'weekly_backup_reminder';

/** Nudges once a week to export a backup before data is lost. */
export async function scheduleWeeklyBackupReminder(): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!settings.enabled || !settings.weeklyBackupReminderEnabled) {
    await cancelNotification(WEEKLY_BACKUP_ID);
    return;
  }

  const parsed = parseClock(settings.weeklyBackupTime) ?? { hour: 20, minute: 0 };
  const { hour: h, minute: m } = parsed;
  await cancelNotification(WEEKLY_BACKUP_ID);
  await scheduleNotification({
    content: {
      title: 'وقت النسخة الاحتياطية 💾',
      body: 'صدّر نسخة من بياناتك عشان لا تضيع',
      data: { type: 'weekly_backup' },
      sound: settings.soundEnabled ? 'default' : undefined,
      ...(Platform.OS === 'android' ? { channelId: NOTIF_CHANNELS.summary } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.WEEKLY,
      weekday: Math.min(7, Math.max(1, settings.weeklyBackupDay ?? 1)),
      hour: Number.isFinite(h) ? Math.min(Math.max(h, 0), 23) : 20,
      minute: Number.isFinite(m) ? Math.min(Math.max(m, 0), 59) : 0,
    },
    identifier: WEEKLY_BACKUP_ID,
  });
}

// --- Reschedule everything ---

const UNTIMED_NUDGE_ID = 'untimed_task_nudge';

/**
 * Smart reminder: a single daily nudge listing how many of today's tasks have
 * no fixed time, so they do not silently disappear in a busy schedule.
 */
export async function scheduleUntimedTaskNudge(): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!settings.enabled || !settings.untimedTaskReminderEnabled) {
    await cancelNotification(UNTIMED_NUDGE_ID);
    return;
  }

  const today = localDateString(new Date());
  const tasks = await taskRepository.getAll();
  const count = tasks.filter(
    (task) =>
      task.status !== 'done' &&
      task.status !== 'cancelled' &&
      !task.time &&
      task.date <= today,
  ).length;

  if (count === 0) {
    await cancelNotification(UNTIMED_NUDGE_ID);
    return;
  }

  const parsed = parseClock(settings.untimedTaskReminderTime) ?? { hour: 16, minute: 0 };
  const { hour: h, minute: m } = parsed;
  await cancelNotification(UNTIMED_NUDGE_ID);
  await scheduleNotification({
    content: {
      title: 'تذكير ذكي ⏰',
      body: `لديك ${count} مهمة مستحقة اليوم دون وقت محدد — رتّب يومك الآن`,
      data: { type: 'untimed_nudge' },
      sound: settings.soundEnabled ? 'default' : undefined,
      ...(Platform.OS === 'android' ? { channelId: NOTIF_CHANNELS.reminders } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      // 00:xx is a valid setting — `h || 16` wrongly turned midnight into 4pm.
      hour: Number.isFinite(h) ? Math.min(Math.max(h, 0), 23) : 16,
      minute: Number.isFinite(m) ? Math.min(Math.max(m, 0), 59) : 0,
    },
    identifier: UNTIMED_NUDGE_ID,
  });
}

/** Fired when a focus block finishes so the user can step away from the phone. */
export async function notifyFocusSessionComplete(taskTitle?: string): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!settings.enabled) return;

  await scheduleNotification({
    content: {
      title: 'اكتملت جلسة التركيز 🔥',
      body: taskTitle
        ? `أحسنت! انتهت جلسة «${taskTitle}» — خد استراحة قصيرة`
        : 'أحسنت! خد استراحة قصيرة قبل الجلسة الجاية',
      data: { type: 'pomodoro_complete' },
      sound: settings.soundEnabled ? 'default' : undefined,
      ...(Platform.OS === 'android' ? { channelId: NOTIF_CHANNELS.summary } : {}),
    },
    trigger: null,
  });
}

async function rescheduleFor(generation: number): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!isCurrentNotificationGeneration(generation)) return;
  if (!settings.enabled) {
    await cancelAllReminders();
    await cancelNotification('morning_summary');
    await cancelNotification('evening_review');
    await cancelNotification('overdue_check');
    await cancelNotification('habit_reminder');
    await cancelNotification(UNTIMED_NUDGE_ID);
    await cancelNotification(WEEKLY_BACKUP_ID);
    if (isCurrentNotificationGeneration(generation)) markRescheduled();
    return;
  }

  // Re-schedule all task reminders. Build the new rows in memory and persist
  // them once instead of doing a storage read/write per reminder on startup.
  const existing = await reminderRepository.getAll();
  await Promise.all(
    existing.map((reminder) =>
      reminder.scheduledId ? cancelNotification(reminder.scheduledId) : Promise.resolve(),
    ),
  );
  if (existing.length > 0) await reminderRepository.replaceAll([]);

  const allTasks = await taskRepository.getAll();
  if (!isCurrentNotificationGeneration(generation)) return;
  const activeTasks = allTasks.filter(
    (t) => t.status !== 'done' && t.status !== 'cancelled' && parseClock(t.time),
  );
  const activeIds = new Set(activeTasks.map((task) => task.id));

  // Remove native reminders whose task disappeared or was completed while the
  // app was closed. Without this pass they keep firing as phantom alarms.
  const scheduled = await getAllScheduled();
  for (const request of scheduled) {
    const data = request.content.data as { type?: string; taskId?: string } | undefined;
    if (data?.type === 'reminder' && (!data.taskId || !activeIds.has(data.taskId))) {
      await cancelNotification(request.identifier);
    }
  }

  const freshReminders: TaskReminder[] = [];

  for (const task of activeTasks) {
    if (!isCurrentNotificationGeneration(generation)) return;
    // undefined = follow global defaults; an explicit [] means "no reminder".
    const offsets = task.reminderOffsets ?? settings.defaultReminders;
    for (const offset of offsets) {
      const reminder: TaskReminder = {
        id: generateId(),
        taskId: task.id,
        offset,
        customMinutes: offset === 'custom' ? task.reminderCustomMinutes : undefined,
        scheduledId: undefined,
      };
      const scheduledId = await scheduleOneReminder(
        {
          taskId: task.id,
          taskTitle: task.title,
          taskTime: task.time,
          date: task.date,
          offset,
          customMinutes: reminder.customMinutes,
          alarmSound: task.alarmSound ?? settings.alarmSound,
          body: undefined,
        },
        settings,
      );
      if (scheduledId) {
        reminder.scheduledId = scheduledId;
        freshReminders.push(reminder);
      }
    }
  }

  if (freshReminders.length > 0) await reminderRepository.replaceAll(freshReminders);

  await scheduleMorningSummary();
  await scheduleEveningReview();
  await scheduleOverdueCheck();
  await scheduleHabitReminders();
  await scheduleUntimedTaskNudge();
  await scheduleWeeklyBackupReminder();
  if (isCurrentNotificationGeneration(generation)) markRescheduled();
}

/** Tracks full reschedules so an account switch can wait for them to finish. */
export async function rescheduleAllNotifications(): Promise<void> {
  const generation = notificationGeneration;
  const work = rescheduleFor(generation);
  activeReschedule = work;
  try {
    await work;
  } finally {
    if (activeReschedule === work) activeReschedule = null;
  }
}

// --- Action handler ---

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function handleNotificationAction(
  actionId: string,
  taskId: string,
): Promise<void> {
  const task = await taskRepository.getById(taskId);
  if (!task || task.status === 'done' || task.status === 'cancelled') return;

  switch (actionId) {
    case 'complete': {
      const allTasks = await taskRepository.getAll();
      if (getUnmetDependencies(task, allTasks).length) return;
      const { nextOccurrence, completed } = completeRepeatingTask(task);
      await taskRepository.update(task.id, completed);
      await cancelTaskReminders(task.id);
      if (nextOccurrence) {
        await taskRepository.create(nextOccurrence);
        await scheduleTaskReminders(nextOccurrence);
      }
      break;
    }
    case 'postpone_ten':
    case 'postpone_hour': {
      const minutes = actionId === 'postpone_ten' ? 10 : 60;
      let updates: Partial<Task>;
      const clock = parseClock(task.time);
      if (clock) {
        const d = new Date(`${task.date}T00:00:00`);
        d.setHours(clock.hour, clock.minute + minutes, 0, 0);
        updates = {
          time: formatClock(d.getHours(), d.getMinutes()),
          date: localDateString(d),
        };
      } else {
        const d = new Date(`${task.date}T00:00:00`);
        d.setMinutes(d.getMinutes() + minutes);
        updates = { date: localDateString(d) };
      }
      const updated = await taskRepository.update(task.id, updates);
      if (updated) await rescheduleTaskReminders(updated);
      break;
    }
    case 'postpone_day': {
      const d = new Date(`${task.date}T00:00:00`);
      d.setDate(d.getDate() + 1);
      const updated = await taskRepository.update(task.id, {
        status: 'postponed',
        date: localDateString(d),
        originalDate: task.date,
      });
      if (updated) await rescheduleTaskReminders(updated);
      break;
    }
  }
}

// --- Init ---

let settingsSubscription: (() => void) | null = null;

export async function initNotifications(): Promise<void> {
  // Settings changes (quiet hours, alarm sound, summary times, ...) alter
  // scheduled notifications. Mark them dirty so the next foreground pass
  // rebuilds only when needed instead of on every app open.
  if (!settingsSubscription) {
    settingsSubscription = subscribeToSettings(() => markNotificationsDirty());
  }
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await registerNotificationCategories();
  await rescheduleAllNotifications();
}
