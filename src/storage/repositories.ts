import { Task, Goal, Plan, Habit, DailyReview, Settings, PomodoroSession, TaskReminder, NotificationSettings, WeeklyReview } from './entities';
import { createRepository, Repository } from './repository';

export const taskRepository: Repository<Task> = createRepository<Task>('tasks');
export const goalRepository: Repository<Goal> = createRepository<Goal>('goals');
export const planRepository: Repository<Plan> = createRepository<Plan>('plans');
export const habitRepository: Repository<Habit> = createRepository<Habit>('habits');
export const reviewRepository: Repository<DailyReview> = createRepository<DailyReview>('reviews');
export const pomodoroRepository: Repository<PomodoroSession> = createRepository<PomodoroSession>('pomodoros');
export const reminderRepository: Repository<TaskReminder> = createRepository<TaskReminder>('reminders');
export const weeklyReviewRepository: Repository<WeeklyReview> = createRepository<WeeklyReview>('weekly_reviews');

const SETTINGS_ID = 'app-settings';
const NOTIF_SETTINGS_ID = 'notif-settings';

export const notificationSettingsRepository = {
  ...createRepository<NotificationSettings>('notif_settings'),

  async getCurrent(): Promise<NotificationSettings | null> {
    return this.getById(NOTIF_SETTINGS_ID);
  },

  async save(settings: Omit<NotificationSettings, 'id'>): Promise<NotificationSettings> {
    const existing = await this.getById(NOTIF_SETTINGS_ID);
    if (existing) {
      return (await this.update(NOTIF_SETTINGS_ID, settings))!;
    }
    return this.create({ ...settings, id: NOTIF_SETTINGS_ID });
  },

  async getOrCreate(): Promise<NotificationSettings> {
    const existing = await this.getById(NOTIF_SETTINGS_ID);
    if (existing) {
      // Fill in flags added in later versions so older installs keep working.
      const defaults = defaultNotificationSettings();
      const merged = { ...defaults, ...existing };
      const needsMigration = (Object.keys(defaults) as Array<keyof NotificationSettings>).some(
        (key) => (existing as unknown as Record<string, unknown>)[key] === undefined,
      );
      if (needsMigration) void this.update(NOTIF_SETTINGS_ID, merged).catch(() => {});
      return merged;
    }
    return this.create({ ...defaultNotificationSettings(), id: NOTIF_SETTINGS_ID });
  },
};

export function defaultNotificationSettings(): Omit<NotificationSettings, 'id'> {
  return {
    enabled: true,
    defaultReminders: ['at_time', '15'],
    morningSummaryEnabled: true,
    morningSummaryTime: '08:00',
    eveningReviewEnabled: true,
    eveningReviewTime: '21:00',
    overdueReminderEnabled: true,
    overdueReminderTime: '10:00',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    soundEnabled: true,
    vibrationEnabled: true,
    dailyHabitReminderEnabled: false,
    habitReminderTime: '09:00',
    untimedTaskReminderEnabled: true,
    untimedTaskReminderTime: '16:00',
  };
}

export function defaultSettings(): Omit<Settings, 'id'> {
  return {
    language: 'ar',
    theme: 'light',
    colorPalette: 'indigo',
    notificationsEnabled: true,
    weekStartsOn: 0,
    autoRolloverEnabled: false,
    showHijriDate: false,
    simpleModeEnabled: false,
  };
}

// Settings are read-modify-written from several providers on mount. Serialize
// writes and share the initial creation so concurrent loads cannot clobber
// each other (e.g. theme saving over language or vice versa).
let settingsInit: Promise<Settings> | null = null;
let settingsWriteQueue: Promise<unknown> = Promise.resolve();

function queueSettingsWrite<T>(work: () => Promise<T>): Promise<T> {
  const result = settingsWriteQueue.then(work, work);
  settingsWriteQueue = result.catch(() => undefined);
  return result;
}

export const settingsRepository = {
  ...createRepository<Settings>('settings'),

  async getCurrent(): Promise<Settings | null> {
    return this.getById(SETTINGS_ID);
  },

  getOrCreate(): Promise<Settings> {
    if (!settingsInit) {
      settingsInit = queueSettingsWrite(async () => {
        const existing = await this.getById(SETTINGS_ID);
        if (existing) return existing;
        return this.create({ ...defaultSettings(), id: SETTINGS_ID });
      }).catch((error) => {
        settingsInit = null;
        throw error;
      });
    }
    return settingsInit;
  },

  async save(settings: Omit<Settings, 'id'>): Promise<Settings> {
    return queueSettingsWrite(async () => {
      const existing = await this.getById(SETTINGS_ID);
      if (existing) {
        return (await this.update(SETTINGS_ID, settings))!;
      }
      const newSettings: Settings = {
        ...settings,
        id: SETTINGS_ID,
      };
      return this.create(newSettings);
    });
  },

  /** Updates only the given fields against the latest stored settings. */
  async patch(updates: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
    return queueSettingsWrite(async () => {
      const existing = await this.getById(SETTINGS_ID);
      if (existing) {
        return (await this.update(SETTINGS_ID, updates))!;
      }
      return this.create({ ...defaultSettings(), ...updates, id: SETTINGS_ID });
    });
  },
};
