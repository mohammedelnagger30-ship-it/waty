import { useState, useCallback, useMemo } from 'react';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Bell,
  BarChart3,
  Plus,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  Star,
  StarOff,
  ChevronRight,
  ChevronLeft,
  Focus,
  ClipboardList,
  CalendarDays,
  Sparkles,
  GripVertical,
  AlertTriangle,
  Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { taskRepository, settingsRepository, habitRepository } from '@/src/storage';
import { Task, TaskStatus, TaskPriority, Settings, Habit } from '@/src/storage/entities';
import { scheduleTaskReminders, rescheduleTaskReminders, cancelTaskReminders } from '@/src/notifications';
import { todayISODate } from '@/src/storage/repository';
import { getHijriDate, getFullDateString, getGreeting } from '@/src/utils/dateUtils';
import { priorityColors, categoryColors, createDefaultTask, completeRepeatingTask, getUnmetDependencies, findScheduleConflicts } from '@/src/utils/taskUtils';
import { runAutoRollover, shouldPromptRollover } from '@/src/utils/rolloverUtils';
import { isHabitCompletedOn, isHabitDueOn, toggleHabitDate } from '@/src/utils/habitUtils';
import { ProgressRing } from '@/src/components/ProgressRing';
import { Card, EmptyState, Button, TaskFormModal } from '@/src/components';
import { QuickAddModal } from '@/src/components/QuickAddModal';
import { FocusTaskPickerModal } from '@/src/components/FocusTaskPickerModal';
import { FAB } from '@/src/components/FAB';

type ViewMode = 'timeline' | 'list';

const ROW_HEIGHT = 112;

/** Vertical drag handle used only in the Today list view. */
function DragHandle({ onMove, color }: { onMove: (delta: number) => void; color: string }) {
  const translateY = useSharedValue(0);
  const gesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-14, 14])
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const delta = Math.round(event.translationY / ROW_HEIGHT);
      translateY.value = withTiming(0, { duration: 160 });
      if (delta !== 0) runOnJS(onMove)(delta);
    })
    .onFinalize(() => {
      translateY.value = withTiming(0, { duration: 160 });
    });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.dragHandle, style]}>
        <GripVertical size={18} color={color} />
      </Animated.View>
    </GestureDetector>
  );
}

export default function TodayScreen() {
  const { theme, isDark } = useTheme();
  const { t, language, isRTL } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formTask, setFormTask] = useState<Task | null>(null);
  const [showFocusPicker, setShowFocusPicker] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  const loadTasks = useCallback(async () => {
    const s = await settingsRepository.getOrCreate();
    setSettings(s);

    await runAutoRollover();

    const [all, storedHabits] = await Promise.all([
      taskRepository.getAll(),
      habitRepository.getAll(),
    ]);
    setTasks(all);
    setHabits(storedHabits);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Tabs stay mounted, so reload whenever this screen becomes visible.
  useFocusEffect(useCallback(() => { void loadTasks(); }, [loadTasks]));

  const handleRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const notify = async (work: () => Promise<unknown>) => {
    try { await work(); } catch { /* notifications are best-effort */ }
  };

  const handleAddTask = async (task: Task) => {
    await taskRepository.create(task);
    await notify(() => scheduleTaskReminders(task));
    await loadTasks();
  };

  const handleMoreDetails = (title: string, date: string, time: string, priority: TaskPriority) => {
    setShowQuickAdd(false);
    setFormTask(createDefaultTask({ title, date, time: time || undefined, priority }));
    setShowForm(true);
  };

  const handleSaveForm = async (task: Task) => {
    const existing = await taskRepository.getById(task.id);
    if (existing) {
      await taskRepository.update(task.id, task);
      await notify(() => rescheduleTaskReminders(task));
    } else {
      await taskRepository.create(task);
      await notify(() => scheduleTaskReminders(task));
    }
    setFormTask(null);
    await loadTasks();
  };

  const handleComplete = async (task: Task) => {
    const blockers = getUnmetDependencies(task, tasks);
    if (blockers.length) {
      Alert.alert(t('tasks.blockedTitle'), `${t('tasks.blockedMsg')} ${blockers.map((item) => item.title).join('، ')}`);
      return;
    }
    if (task.status !== 'done') {
      const { nextOccurrence, completed } = completeRepeatingTask(task);
      if (nextOccurrence) {
        await taskRepository.create(nextOccurrence);
        await notify(() => scheduleTaskReminders(nextOccurrence));
      }
      await taskRepository.update(task.id, completed);
    }
    await notify(() => cancelTaskReminders(task.id));
    await loadTasks();
  };

  const handleToggleMIT = async (task: Task) => {
    const mitTasks = todayTasks.filter((t) => t.isMIT);
    if (!task.isMIT && mitTasks.length >= 3) {
      Alert.alert(t('today.mit'), t('today.mitDesc'));
      return;
    }
    await taskRepository.update(task.id, { isMIT: !task.isMIT });
    await loadTasks();
  };

  const handleToggleHabit = async (habit: Habit) => {
    const day = todayISODate();
    const updated = await habitRepository.update(habit.id, toggleHabitDate(habit, day));
    if (updated) setHabits((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleRolloverPrompt = (task: Task) => {
    if (!shouldPromptRollover(task)) return;
    Alert.alert(t('rollover.tooMany'), t('rollover.tooManyMsg'), [
      { text: t('rollover.split'), onPress: () => router.push(`/tasks/${task.id}`) },
      {
        text: t('rollover.changePriority'),
        onPress: () => router.push(`/tasks/${task.id}`),
      },
      {
        text: t('rollover.delete'),
        style: 'destructive',
        onPress: async () => {
          await taskRepository.delete(task.id);
          await notify(() => cancelTaskReminders(task.id));
          await loadTasks();
        },
      },
      { text: t('rollover.dismiss'), style: 'cancel' },
    ]);
  };

  const today = todayISODate();
  const dueHabits = useMemo(
    () => habits.filter((habit) => isHabitDueOn(habit, today)),
    [habits, today],
  );

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.date === today && t.status !== 'cancelled');
  }, [tasks, today]);

  const completedTasks = useMemo(() => {
    return todayTasks.filter((t) => t.status === 'done');
  }, [todayTasks]);

  const activeTasks = useMemo(() => {
    return todayTasks
      .filter((t) => t.status !== 'done')
      .sort((a, b) => {
        const ao = a.order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
      });
  }, [todayTasks]);

  const mitTasks = useMemo(() => {
    return activeTasks.filter((t) => t.isMIT).slice(0, 3);
  }, [activeTasks]);

  const scheduleConflicts = useMemo(() => findScheduleConflicts(todayTasks), [todayTasks]);

  const progress = todayTasks.length > 0
    ? (completedTasks.length / todayTasks.length) * 100
    : 0;

  const timedTasks = useMemo(() => {
    return activeTasks
      .filter((t) => t.time)
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  }, [activeTasks]);

  const untimedTasks = useMemo(() => {
    return activeTasks.filter((t) => !t.time);
  }, [activeTasks]);

  // Suggest the task that deserves attention right now: MIT first, then
  // priority, then anything due/overdue, then the quickest win.
  const suggestedTask = useMemo(() => {
    if (activeTasks.length === 0) return null;
    const score = (task: Task) => {
      let value = task.isMIT ? 100 : 0;
      value += task.priority === 'high' ? 40 : task.priority === 'medium' ? 20 : 0;
      if (task.time) {
        const [h, m] = task.time.split(':').map(Number);
        const due = h * 60 + (m || 0);
        const now = new Date().getHours() * 60 + new Date().getMinutes();
        if (due <= now) value += 30;
        else if (due - now <= 120) value += 15;
      }
      value += Math.max(0, 20 - (task.estimatedMinutes ?? 20));
      return value;
    };
    return [...activeTasks].sort((a, b) => score(b) - score(a))[0];
  }, [activeTasks]);

  // Date strings are computed once per minute instead of on every render.
  const clock = useMemo(() => {
    const now = new Date();
    return {
      hour: now.getHours(),
      nowStr: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      greeting: getGreeting(now.getHours(), language),
      dateDisplay: getFullDateString(now, language),
      hijriDisplay: settings?.showHijriDate ? getHijriDate(now) : null,
    };
  }, [language, settings?.showHijriDate, Math.floor(Date.now() / 60000)]);
  const { hour: currentHour, nowStr, greeting, dateDisplay, hijriDisplay } = clock;

  // Group once instead of filtering all timed tasks 24 times on every render.
  const tasksByHour = useMemo(() => {
    const groups = new Map<number, Task[]>();
    for (const task of timedTasks) {
      if (!task.time) continue;
      const h = parseInt(task.time.split(':')[0], 10);
      if (Number.isNaN(h)) continue;
      const list = groups.get(h);
      if (list) list.push(task);
      else groups.set(h, [task]);
    }
    return groups;
  }, [timedTasks]);

  const handleReorder = (task: Task, delta: number) => {
    const current = [...activeTasks];
    const from = current.findIndex((item) => item.id === task.id);
    if (from < 0) return;
    const to = Math.max(0, Math.min(current.length - 1, from + delta));
    if (to === from) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setTasks((previous) =>
      previous.map((item) => {
        const index = current.findIndex((reordered) => reordered.id === item.id);
        return index >= 0 ? { ...item, order: index } : item;
      }),
    );
    current.forEach((item, index) => {
      void taskRepository.update(item.id, { order: index }).catch(() => {});
    });
  };

  const renderTaskRow = (task: Task, reorderable = false) => {
    const pColor = priorityColors[task.priority];
    const color = isDark ? pColor.dark : pColor.light;
    const catColor = categoryColors[task.category];
    const isDone = task.status === 'done';

    return (
      <Pressable
        key={task.id}
        onPress={() => router.push(`/tasks/${task.id}`)}
        style={({ pressed }) => [
          styles.taskRow,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        {reorderable && !isDone ? (
          <DragHandle
            color={theme.text.tertiary}
            onMove={(delta) => handleReorder(task, delta)}
          />
        ) : null}

        <Pressable
          hitSlop={8}
          onPress={() => !isDone && handleComplete(task)}
          style={[
            styles.checkbox,
            { borderColor: isDone ? theme.success : color, backgroundColor: isDone ? theme.success : 'transparent' },
          ]}
        >
          {isDone && <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={3} />}
        </Pressable>

        <View style={styles.taskContent}>
          <View style={styles.taskTopRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.taskTitle,
                { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold, textDecorationLine: isDone ? 'line-through' : 'none' },
              ]}
            >
              {task.title}
            </Text>
            {task.isMIT && (
              <Star size={14} color={theme.secondary[500]} fill={theme.secondary[500]} />
            )}
          </View>

          <View style={styles.taskMetaRow}>
            {task.time && (
              <View style={styles.taskTimeChip}>
                <Clock size={11} color={theme.text.tertiary} />
                <Text style={[styles.taskMetaText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {task.time}
                </Text>
              </View>
            )}
            <View style={[styles.taskCatChip, { backgroundColor: catColor + '22' }]}>
              <View style={[styles.taskCatDot, { backgroundColor: catColor }]} />
              <Text style={[styles.taskMetaText, { color: catColor, fontFamily: typography.fontFamilySemiBold }]}>
                {task.category === 'custom' && task.customCategory ? task.customCategory : t(`tasks.category.${task.category}` as Parameters<typeof t>[0])}
              </Text>
            </View>
            {(task.rolloverCount ?? 0) > 0 && (
              <Pressable onPress={() => handleRolloverPrompt(task)} style={[styles.rolloverBadge, { backgroundColor: theme.warning + '22' }]}>
                <Text style={[styles.rolloverText, { color: theme.warning, fontFamily: typography.fontFamilySemiBold }]}>
                  {(task.rolloverCount ?? 0)}x
                </Text>
              </Pressable>
            )}
            {(scheduleConflicts[task.id]?.length ?? 0) > 0 && (
              <View style={[styles.taskConflictBadge, { backgroundColor: theme.warningSoft }]}>
                <AlertTriangle size={11} color={theme.warning} />
                <Text style={[styles.taskMetaText, { color: theme.warning, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('tasks.scheduleConflict')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {!isDone && (
          <Pressable hitSlop={8} onPress={() => handleToggleMIT(task)} style={styles.mitBtn}>
            {task.isMIT ? (
              <Star size={18} color={theme.secondary[500]} fill={theme.secondary[500]} />
            ) : (
              <StarOff size={18} color={theme.text.tertiary} />
            )}
          </Pressable>
        )}
      </Pressable>
    );
  };

  const renderTimelineHour = (hour: number) => {
    const hourStr = `${String(hour).padStart(2, '0')}:00`;
    const hourTasks = tasksByHour.get(hour);

    if (!hourTasks || hourTasks.length === 0) return null;

    const isPast = hour < currentHour;
    const isNow = hour === currentHour;

    return (
      <View key={hour} style={styles.timelineHour}>
        <View style={styles.timelineTimeCol}>
          <View style={[styles.timelineDot, { backgroundColor: isNow ? theme.primary[500] : isPast ? theme.text.tertiary : theme.border }]} />
          <Text style={[styles.timelineHourText, { color: isNow ? theme.primary[500] : theme.text.tertiary, fontFamily: isNow ? typography.fontFamilyBold : typography.fontFamily }]}>
            {hourStr}
          </Text>
        </View>
        <View style={styles.timelineTasks}>
          {hourTasks.map((task) => renderTaskRow(task))}
        </View>
      </View>
    );
  };

  const renderQuickButton = (
    icon: React.ReactNode,
    label: string,
    onPress: () => void,
    color: string,
  ) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickBtn,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.quickBtnIcon, { backgroundColor: color + '1F' }]}>
        {icon}
      </View>
      <Text
        numberOfLines={2}
        style={[styles.quickBtnLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}
      >
        {label}
      </Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.text.tertiary, fontFamily: typography.fontFamily }}>
            {t('common.loading')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary[500]]}
            tintColor={theme.primary[500]}
          />
        }
      >
        {/* Hero: greeting, date and today's progress in one compact card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroGreeting}>
              <Text style={[styles.greeting, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                {greeting}
              </Text>
              <Text style={[styles.dateText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                {dateDisplay}
              </Text>
              {hijriDisplay && (
                <Text style={[styles.hijriText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {hijriDisplay}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => router.push('/notifications')}
              hitSlop={8}
              style={({ pressed }) => [
                styles.bellBtn,
                { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Bell size={20} color={theme.text.secondary} />
            </Pressable>
          </View>

          <View style={styles.heroBottom}>
            <ProgressRing progress={progress} size={76} strokeWidth={7} />
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                  {todayTasks.length}
                </Text>
                <Text style={[styles.heroStatLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t('today.tasksCount')}
                </Text>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: theme.border }]} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: theme.success, fontFamily: typography.fontFamilyBold }]}>
                  {completedTasks.length}
                </Text>
                <Text style={[styles.heroStatLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t('today.completedCount')}
                </Text>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: theme.border }]} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: theme.primary[500], fontFamily: typography.fontFamilyBold }]}>
                  {activeTasks.length}
                </Text>
                <Text style={[styles.heroStatLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t('today.remainingCount')}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Quick actions */}
        <View style={styles.quickBtnRow}>
          {renderQuickButton(
            <Plus size={22} color={theme.primary[500]} />,
            t('today.quickAdd'),
            () => setShowQuickAdd(true),
            theme.primary[500],
          )}
          {renderQuickButton(
            <Focus size={22} color={theme.accent[500]} />,
            t('today.startFocus'),
            () => setShowFocusPicker(true),
            theme.accent[500],
          )}
          {renderQuickButton(
            <ClipboardList size={22} color={theme.secondary[500]} />,
            t('today.dailyReview'),
            () => router.push('/review'),
            theme.secondary[500],
          )}
          {renderQuickButton(
            <Bell size={22} color={theme.text.tertiary} />,
            t('notifications.title'),
            () => router.push('/notifications'),
            theme.text.tertiary,
          )}
        </View>

        {/* Smart suggestion */}
        {suggestedTask && (
          <Pressable
            onPress={() => router.push(`/tasks/${suggestedTask.id}`)}
            style={({ pressed }) => [
              styles.suggestionCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.primary[500] + '44',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.suggestionIcon, { backgroundColor: theme.primary[500] + '1F' }]}>
              <Sparkles size={20} color={theme.primary[500]} />
            </View>
            <View style={styles.suggestionText}>
              <Text style={[styles.suggestionLabel, { color: theme.primary[500], fontFamily: typography.fontFamilySemiBold }]}>
                {t('today.suggestion')}
              </Text>
              <Text style={[styles.suggestionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]} numberOfLines={1}>
                {suggestedTask.title}
              </Text>
              <Text style={[styles.suggestionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('today.suggestionDesc')}
              </Text>
            </View>
            <View style={[styles.suggestionStart, { backgroundColor: theme.primary[500] }]}>
              <Text style={[styles.suggestionStartText, { color: '#FFFFFF', fontFamily: typography.fontFamilySemiBold }]}>
                {t('today.start')}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Most Important 3 */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Target size={18} color={theme.secondary[500]} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('today.mit')}
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('today.mitDesc')}
          </Text>
        </View>

        {mitTasks.length > 0 ? (
          <Card style={styles.mitCard}>
            {mitTasks.map((task, i) => (
              <View key={task.id}>
                {i > 0 && <View style={[styles.taskDivider, { backgroundColor: theme.border }]} />}
                {renderTaskRow(task)}
              </View>
            ))}
          </Card>
        ) : (
          <Card style={styles.mitEmptyCard}>
            <View style={styles.mitEmptyContent}>
              <StarOff size={28} color={theme.text.tertiary} />
              <Text style={[styles.mitEmptyText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('today.noMIT')}
              </Text>
              <Text style={[styles.mitEmptyHint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('today.markMIT')}
              </Text>
            </View>
          </Card>
        )}

        {/* Quick habit check-in */}
        {dueHabits.length > 0 ? (
          <View style={[styles.habitCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.habitHeader}>
              <CheckCircle2 size={18} color={theme.success} />
              <View style={styles.habitHeaderText}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                  {t('today.habits')}
                </Text>
                <Text style={[styles.sectionDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t('today.habitsHint')}
                </Text>
              </View>
              <Text style={[styles.habitCount, { color: theme.success, fontFamily: typography.fontFamilySemiBold }]}>
                {dueHabits.filter((habit) => isHabitCompletedOn(habit, today)).length}/{dueHabits.length}
              </Text>
            </View>
            <View style={styles.habitChips}>
              {dueHabits.map((habit) => {
                const done = isHabitCompletedOn(habit, today);
                const color = habit.color ?? theme.success;
                return (
                  <Pressable
                    key={habit.id}
                    onPress={() => void handleToggleHabit(habit)}
                    style={({ pressed }) => [
                      styles.habitChip,
                      {
                        borderColor: done ? color : theme.border,
                        backgroundColor: done ? color + '1F' : theme.surfaceSecondary,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={habit.title}
                  >
                    <View style={[
                      styles.habitCheck,
                      { borderColor: done ? color : theme.text.tertiary, backgroundColor: done ? color : 'transparent' },
                    ]}>
                      {done ? <Check size={11} color="#FFFFFF" strokeWidth={3} /> : null}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.habitChipText,
                        { color: done ? color : theme.text.secondary, fontFamily: typography.fontFamilySemiBold },
                      ]}
                    >
                      {habit.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* View Toggle */}
        <View style={styles.viewToggleRow}>
          <Pressable
            onPress={() => setViewMode('timeline')}
            style={[
              styles.viewToggleBtn,
              { backgroundColor: viewMode === 'timeline' ? theme.primary[500] : 'transparent', borderColor: viewMode === 'timeline' ? theme.primary[500] : theme.border },
            ]}
          >
            <Clock size={16} color={viewMode === 'timeline' ? '#FFFFFF' : theme.text.secondary} />
            <Text style={[styles.viewToggleText, { color: viewMode === 'timeline' ? '#FFFFFF' : theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('today.timeline')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('list')}
            style={[
              styles.viewToggleBtn,
              { backgroundColor: viewMode === 'list' ? theme.primary[500] : 'transparent', borderColor: viewMode === 'list' ? theme.primary[500] : theme.border },
            ]}
          >
            <Calendar size={16} color={viewMode === 'list' ? '#FFFFFF' : theme.text.secondary} />
            <Text style={[styles.viewToggleText, { color: viewMode === 'list' ? '#FFFFFF' : theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('today.list')}
            </Text>
          </Pressable>
        </View>

        {/* Tasks Display */}
        {activeTasks.length === 0 && completedTasks.length === 0 ? (
          <EmptyState
            icon={<Calendar size={36} color={theme.text.tertiary} />}
            title={t('today.noTasks')}
            description={t('today.noTasksDesc')}
            action={
              <Button variant="primary" icon={<Plus size={18} color="#FFFFFF" />} onPress={() => setShowQuickAdd(true)}>
                {t('today.addTask')}
              </Button>
            }
          />
        ) : viewMode === 'timeline' ? (
          <View style={styles.timelineContainer}>
            {/* Now indicator */}
            <View style={styles.nowIndicator}>
              <View style={[styles.nowLine, { backgroundColor: theme.primary[500] }]} />
              <Text style={[styles.nowText, { color: theme.primary[500], fontFamily: typography.fontFamilyBold }]}>
                {t('today.now')} {nowStr}
              </Text>
            </View>

            {timedTasks.length > 0 ? (
              Array.from({ length: 24 }, (_, h) => renderTimelineHour(h))
            ) : (
              <Text style={[styles.noTimeText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('today.noTimeTasks')}
              </Text>
            )}

            {/* Untimed tasks */}
            {untimedTasks.length > 0 && (
              <View style={styles.untimedSection}>
                <Text style={[styles.untimedLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('today.allDay')}
                </Text>
                {untimedTasks.map((task) => renderTaskRow(task))}
              </View>
            )}

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <View style={styles.untimedSection}>
                <Text style={[styles.untimedLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('review.completed')} ({completedTasks.length})
                </Text>
                {completedTasks.map((task) => renderTaskRow(task))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {activeTasks.length > 1 && (
              <Text style={[styles.reorderHint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('today.reorderHint')}
              </Text>
            )}
            {activeTasks.map((task) => renderTaskRow(task, true))}
            {completedTasks.length > 0 && (
              <View style={styles.untimedSection}>
                <Text style={[styles.untimedLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('review.completed')} ({completedTasks.length})
                </Text>
                {completedTasks.map((task) => renderTaskRow(task))}
              </View>
            )}
          </View>
        )}

        {/* Planner link */}
        <Pressable
          onPress={() => router.push('/planner')}
          style={({ pressed }) => [
            styles.plannerLink,
            { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.plannerLinkLeft}>
            <CalendarDays size={20} color={theme.primary[500]} />
            <Text style={[styles.plannerLinkText, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('planner.title')}
            </Text>
          </View>
          {isRTL
            ? <ChevronLeft size={20} color={theme.text.tertiary} />
            : <ChevronRight size={20} color={theme.text.tertiary} />}
        </Pressable>

        {/* Stats shortcut */}
        <Pressable
          onPress={() => router.push('/stats')}
          style={({ pressed }) => [
            styles.plannerLink,
            { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.plannerLinkLeft}>
            <BarChart3 size={20} color={theme.success} />
            <Text style={[styles.plannerLinkText, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('stats.title')}
            </Text>
          </View>
          {isRTL
            ? <ChevronLeft size={20} color={theme.text.tertiary} />
            : <ChevronRight size={20} color={theme.text.tertiary} />}
        </Pressable>
      </ScrollView>

      <FAB onPress={() => setShowQuickAdd(true)} bottom={28} icon={<Plus size={26} color="#FFFFFF" strokeWidth={2.5} />} />

      <QuickAddModal
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAdd={handleAddTask}
        onMoreDetails={handleMoreDetails}
      />

      <TaskFormModal
        visible={showForm}
        onClose={() => { setShowForm(false); setFormTask(null); }}
        onSave={handleSaveForm}
        initialTask={formTask}
      />

      <FocusTaskPickerModal
        visible={showFocusPicker}
        onClose={() => setShowFocusPicker(false)}
        tasks={tasks.filter((task) => task.status !== 'done' && task.status !== 'cancelled')}
        onSelect={(task) => router.push(`/tasks/${task.id}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.md + 4,
    paddingBottom: 112,
  },
  heroCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroGreeting: {
    flex: 1,
    gap: 1,
  },
  greeting: {
    fontSize: 20,
    lineHeight: 26,
  },
  dateText: {
    fontSize: 14,
  },
  hijriText: {
    fontSize: 12,
    marginTop: 1,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
  },
  heroStatValue: {
    fontSize: 20,
    lineHeight: 24,
  },
  heroStatLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  quickBtnRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  quickBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  suggestionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: { flex: 1, gap: 2 },
  suggestionLabel: { fontSize: typography.sizes.xs },
  suggestionTitle: { fontSize: typography.sizes.md },
  suggestionDesc: { fontSize: typography.sizes.xs },
  suggestionStart: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  suggestionStartText: { fontSize: typography.sizes.sm },
  sectionHeader: {
    gap: 2,
    marginBottom: spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
  },
  sectionDesc: {
    fontSize: 12,
  },
  habitCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  habitHeaderText: { flex: 1, gap: 2 },
  habitCount: { fontSize: typography.sizes.sm },
  habitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    maxWidth: '100%',
  },
  habitCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitChipText: { fontSize: typography.sizes.xs, flexShrink: 1 },
  mitCard: {
    marginBottom: spacing.md,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  mitEmptyCard: {
    marginBottom: spacing.md,
  },
  mitEmptyContent: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  mitEmptyText: {
    fontSize: typography.sizes.sm,
  },
  mitEmptyHint: {
    fontSize: typography.sizes.xs,
  },
  taskDivider: {
    height: 1,
    marginVertical: 2,
  },
  viewToggleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
  },
  viewToggleText: {
    fontSize: typography.sizes.sm,
  },
  timelineContainer: {
    marginBottom: spacing.md,
  },
  nowIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  nowLine: {
    flex: 1,
    height: 1.5,
    borderRadius: 1,
  },
  nowText: {
    fontSize: typography.sizes.xs,
  },
  timelineHour: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  timelineTimeCol: {
    width: 44,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  timelineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginBottom: 3,
  },
  timelineHourText: {
    fontSize: typography.sizes.xs,
  },
  timelineTasks: {
    flex: 1,
    gap: spacing.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
  },
  dragHandle: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  reorderHint: {
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
    gap: 3,
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  taskTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  taskMetaText: {
    fontSize: 11,
  },
  taskCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  taskCatDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  taskConflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  rolloverBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  rolloverText: {
    fontSize: 11,
  },
  mitBtn: {
    padding: 2,
  },
  noTimeText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  untimedSection: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  untimedLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: 2,
  },
  listContainer: {
    gap: spacing.xs,
  },
  plannerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  plannerLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  plannerLinkText: {
    fontSize: typography.sizes.sm,
  },
});
