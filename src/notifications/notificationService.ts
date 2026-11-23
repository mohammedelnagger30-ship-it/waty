import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Task, TaskReminder, ReminderOffset, NotificationSettings } from '@/src/storage/entities';
import { taskRepository, reminderRepository, notificationSettingsRepository, habitRepository } from '@/src/storage';
import { generateId } from '@/src/storage/repository';
import { completeRepeatingTask } from '@/src/utils/taskUtils';

// --- Notification channel setup ---

export const NOTIF_CHANNELS = {
  default: 'default',
  reminders: 'reminders',
  summary: 'summary',
  overdue: 'overdue',
  habits: 'habits',
} as const;

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
}

// --- Permission handling ---

export async function requestNotificationPermissions(): Promise<boolean> {
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
  const postponeDayAction: Notifications.NotificationAction = {
    identifier: 'postpone_day',
    buttonTitle: 'رحّلها لبكرة',
    options: { opensAppToForeground: false },
  };

  await Notifications.setNotificationCategoryAsync('task_reminder', [
    completeAction,
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
  const [tH, tM] = timeStr.split(':').map(Number);
  const [sH, sM] = quietStart.split(':').map(Number);
  const [eH, eM] = quietEnd.split(':').map(Number);

  const tMinutes = tH * 60 + tM;
  const sMinutes = sH * 60 + sM;
  const eMinutes = eH * 60 + eM;

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

function getChannelForReminder(offset: ReminderOffset): string {
  return offset === 'at_time' ? NOTIF_CHANNELS.reminders : NOTIF_CHANNELS.reminders;
}

function buildTriggerDate(task: Task, offsetMinutes: number): Date | null {
  if (!task.time) return null;
  const [h, m] = task.time.split(':').map(Number);
  const trigger = new Date(`${task.date}T00:00:00`);
  trigger.setHours(h, m, 0, 0);
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
  body?: string;
}

async function scheduleOneReminder(input: ScheduleInput): Promise<string | null> {
  const offsetMin = reminderOffsetMinutes(input.offset, input.customMinutes);
  const triggerDate = buildTriggerDate(
    { id: input.taskId, title: input.taskTitle, date: input.date, time: input.taskTime } as Task,
    offsetMin,
  );
  if (!triggerDate) return null;

  const notifSettings = await notificationSettingsRepository.getOrCreate();
  if (!notifSettings.enabled) return null;

  const timeStr = `${triggerDate.getHours().toString().padStart(2, '0')}:${triggerDate.getMinutes().toString().padStart(2, '0')}`;
  if (notifSettings.quietHoursEnabled) {
    if (isWithinQuietHours(timeStr, notifSettings.quietHoursStart, notifSettings.quietHoursEnd)) {
      return null;
    }
  }

  const minutesBefore = offsetMin === 0 ? '' : `قبل ${offsetMin} دقيقة - `;
  const bodyText = input.body ?? `${minutesBefore}${input.taskTime ?? ''}`;

  const channelId = getChannelForReminder(input.offset);
  const priority: Notifications.AndroidNotificationPriority =
    offsetMin === 0
      ? Notifications.AndroidNotificationPriority.HIGH
      : Notifications.AndroidNotificationPriority.DEFAULT;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.taskTitle,
      body: bodyText,
      data: { taskId: input.taskId, type: 'reminder' },
      sound: notifSettings.soundEnabled ? 'default' : undefined,
      vibrate: notifSettings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
      categoryIdentifier: 'task_reminder',
      ...(Platform.OS === 'android' ? { channelId, priority } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

// --- Public API: schedule, cancel, reschedule ---

export async function scheduleTaskReminders(task: Task): Promise<void> {
  const notifSettings = await notificationSettingsRepository.getOrCreate();
  if (!notifSettings.enabled) return;
  if (task.status === 'done' || task.status === 'cancelled') return;
  if (!task.time) return;

  // undefined = follow global defaults; an explicit [] means "no reminder".
  const offsets = task.reminderOffsets ?? notifSettings.defaultReminders;

  // Remove existing reminders for this task
  await cancelTaskReminders(task.id);

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
      body: undefined,
    });

    if (scheduledId) {
      reminder.scheduledId = scheduledId;
      await reminderRepository.create(reminder);
    }
  }
}

export async function cancelTaskReminders(taskId: string): Promise<void> {
  const reminders = await reminderRepository.getAll();
  const taskReminders = reminders.filter((r) => r.taskId === taskId);
  for (const r of taskReminders) {
    if (r.scheduledId) {
      await Notifications.cancelScheduledNotificationAsync(r.scheduledId);
    }
    await reminderRepository.delete(r.id);
  }
}

export async function rescheduleTaskReminders(task: Task): Promise<void> {
  await cancelTaskReminders(task.id);
  await scheduleTaskReminders(task);
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const all = await reminderRepository.getAll();
  for (const r of all) {
    await reminderRepository.delete(r.id);
  }
}

// --- Daily summary notification ---

export async function scheduleMorningSummary(): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!settings.enabled || !settings.morningSummaryEnabled) return;

  const [h, m] = settings.morningSummaryTime.split(':').map(Number);

  const now = new Date();
  const trigger = new Date();
  trigger.setHours(h, m, 0, 0);
  if (trigger.getTime() <= now.getTime()) {
    trigger.setDate(trigger.getDate() + 1);
  }

  await Notifications.cancelScheduledNotificationAsync('morning_summary');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'صباح الخير! 🌅',
      body: 'تفقد مهام اليوم من هنا',
      data: { type: 'morning_summary' },
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
  if (!settings.enabled || !settings.eveningReviewEnabled) return;

  const [h, m] = settings.eveningReviewTime.split(':').map(Number);

  await Notifications.cancelScheduledNotificationAsync('evening_review');

  await Notifications.scheduleNotificationAsync({
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
  if (!settings.enabled || !settings.overdueReminderEnabled) return;

  const [h, m] = settings.overdueReminderTime.split(':').map(Number);

  await Notifications.cancelScheduledNotificationAsync('overdue_check');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'لديك مهام متأخرة ⚠️',
      body: 'تفقد المهام المتأخرة وأنجزها',
      data: { type: 'overdue_check' },
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

// --- Habit reminders ---

export async function scheduleHabitReminders(): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!settings.enabled || !settings.dailyHabitReminderEnabled) return;

  await Notifications.cancelScheduledNotificationAsync('habit_reminder');

  const [h, m] = settings.habitReminderTime.split(':').map(Number);

  const habits = await habitRepository.getAll();
  if (habits.length === 0) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'تذكير العادات اليومية 💪',
      body: `لديك ${habits.length} عادة للإنجاز اليوم`,
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

// --- Reschedule everything ---

const UNTIMED_NUDGE_ID = 'untimed_task_nudge';

/**
 * Smart reminder: a single daily nudge listing how many of today's tasks have
 * no fixed time, so they do not silently disappear in a busy schedule.
 */
export async function scheduleUntimedTaskNudge(): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!settings.enabled || !settings.untimedTaskReminderEnabled) {
    await Notifications.cancelScheduledNotificationAsync(UNTIMED_NUDGE_ID);
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
    await Notifications.cancelScheduledNotificationAsync(UNTIMED_NUDGE_ID);
    return;
  }

  const [h, m] = (settings.untimedTaskReminderTime || '16:00').split(':').map(Number);
  await Notifications.cancelScheduledNotificationAsync(UNTIMED_NUDGE_ID);
  await Notifications.scheduleNotificationAsync({
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

  await Notifications.scheduleNotificationAsync({
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

export async function rescheduleAllNotifications(): Promise<void> {
  const settings = await notificationSettingsRepository.getOrCreate();
  if (!settings.enabled) {
    await cancelAllReminders();
    await Notifications.cancelScheduledNotificationAsync('morning_summary');
    await Notifications.cancelScheduledNotificationAsync('evening_review');
    await Notifications.cancelScheduledNotificationAsync('overdue_check');
    await Notifications.cancelScheduledNotificationAsync('habit_reminder');
    await Notifications.cancelScheduledNotificationAsync(UNTIMED_NUDGE_ID);
    return;
  }

  // Re-schedule all task reminders
  const allTasks = await taskRepository.getAll();
  const activeTasks = allTasks.filter(
    (t) => t.status !== 'done' && t.status !== 'cancelled' && t.time,
  );
  for (const task of activeTasks) {
    await scheduleTaskReminders(task);
  }

  await scheduleMorningSummary();
  await scheduleEveningReview();
  await scheduleOverdueCheck();
  await scheduleHabitReminders();
  await scheduleUntimedTaskNudge();
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
      const { nextOccurrence, completed } = completeRepeatingTask(task);
      await taskRepository.update(task.id, completed);
      await cancelTaskReminders(task.id);
      if (nextOccurrence) {
        await taskRepository.create(nextOccurrence);
        await scheduleTaskReminders(nextOccurrence);
      }
      break;
    }
    case 'postpone_hour': {
      let updates: Partial<Task>;
      if (task.time) {
        const [h, m] = task.time.split(':').map(Number);
        const d = new Date(`${task.date}T00:00:00`);
        d.setHours(h + 1, m, 0, 0);
        updates = {
          time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
          date: localDateString(d),
        };
      } else {
        const d = new Date(`${task.date}T00:00:00`);
        d.setHours(d.getHours() + 1);
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

export async function initNotifications(): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await registerNotificationCategories();
  await rescheduleAllNotifications();
}
