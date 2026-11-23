export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'postponed' | 'cancelled';
export type TaskCategory = 'work' | 'study' | 'health' | 'personal' | 'family' | 'finance' | 'custom';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'paused';
export type GoalType = 'short' | 'mid' | 'long';
export type GoalProgressMode = 'auto' | 'manual';
export type HabitFrequency = 'daily' | 'weekly' | 'custom';
export type ReviewMood = 'great' | 'good' | 'okay' | 'bad';
export type PaletteId = 'indigo' | 'ocean' | 'emerald' | 'amber' | 'rose' | 'slate';

export interface Milestone {
  id: string;
  title: string;
  targetValue?: number;
  currentValue?: number;
  done: boolean;
  date?: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  estimatedMinutes?: number;
  deadline?: string; // YYYY-MM-DD
  category: TaskCategory;
  customCategory?: string;
  tags: string[];
  subtasks: Subtask[];
  repeat: RepeatType;
  repeatDays?: number[]; // 0-6 for custom weekly
  notes?: string;
  goalId?: string;
  planId?: string;
  actualMinutes: number; // tracked focus time
  pomodoroSessions: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  originalDate?: string; // for postponed tasks
  rolloverCount?: number; // how many times auto-rolled over
  isMIT?: boolean; // Most Important Task flag
  reminderOffsets?: ReminderOffset[]; // per-task overrides; undefined = use global defaults, [] = none
  reminderCustomMinutes?: number; // used when 'custom' is selected
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  motivation?: string;
  category: TaskCategory;
  status: GoalStatus;
  type: GoalType;
  targetDate?: string;
  targetValue?: number;
  targetUnit?: string;
  currentValue?: number;
  progress: number;
  progressMode: GoalProgressMode;
  milestones: Milestone[];
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanPhase {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  taskIds: string[];
}

export interface Plan {
  id: string;
  title: string;
  description?: string;
  goalId?: string;
  startDate: string;
  endDate?: string;
  type: 'weekly' | 'monthly' | 'custom';
  phases: PlanPhase[];
  taskIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: HabitFrequency;
  customDays?: number[];
  streak: number;
  bestStreak: number;
  lastCompletedDate?: string;
  completedDates: string[];
  color?: string;
  reminderTime?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReview {
  id: string;
  date: string; // YYYY-MM-DD
  mood: ReviewMood;
  whatWentWell?: string;
  whatToImprove?: string;
  note?: string;
  completedTaskIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: string;
  language: 'ar' | 'en';
  theme: 'light' | 'dark' | 'system';
  colorPalette: PaletteId;
  notificationsEnabled: boolean;
  reminderTime?: string; // HH:mm
  weekStartsOn: 0 | 1; // 0=Sunday, 1=Monday
  autoRolloverEnabled: boolean;
  showHijriDate: boolean;
  simpleModeEnabled: boolean;
  focusMinutes?: number;
  breakMinutes?: number;
  longBreakMinutes?: number;
  autoStartNextPhase?: boolean;
}

export type ReminderOffset = 'at_time' | '5' | '10' | '15' | '30' | '60' | 'custom';

export interface TaskReminder {
  id: string;
  taskId: string;
  offset: ReminderOffset; // 'at_time' or minutes before as string
  customMinutes?: number; // when offset is 'custom'
  scheduledId?: string; // expo-notifications identifier
}

export interface NotificationSettings {
  id: string;
  enabled: boolean;
  defaultReminders: ReminderOffset[];
  morningSummaryEnabled: boolean;
  morningSummaryTime: string; // HH:mm
  eveningReviewEnabled: boolean;
  eveningReviewTime: string; // HH:mm
  overdueReminderEnabled: boolean;
  overdueReminderTime: string; // HH:mm for daily overdue check
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string; // HH:mm
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  dailyHabitReminderEnabled: boolean;
  habitReminderTime: string; // HH:mm
  // Smart nudge: reminds about tasks due today that have no fixed time.
  untimedTaskReminderEnabled: boolean;
  untimedTaskReminderTime: string; // HH:mm
}

export interface PomodoroSession {
  id: string;
  taskId: string;
  durationMinutes: number;
  type: 'focus' | 'break';
  startedAt: string;
  endedAt: string;
}

export interface WeeklyReview {
  id: string;
  weekStart: string; // YYYY-MM-DD (Sunday)
  tasksCompleted: number;
  completionRate: number; // 0-100
  goalProgress: number; // average 0-100
  habitRate: number; // 0-100
  moods: ReviewMood[];
  whatWentWell?: string;
  whatToImprove?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type EntityType = 'tasks' | 'goals' | 'plans' | 'habits' | 'reviews' | 'settings' | 'pomodoros' | 'reminders' | 'notif_settings' | 'weekly_reviews';
