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
  Plus,
  CheckCircle2,
  Clock,
  Star,
  StarOff,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Focus,
  ClipboardList,
  CalendarDays,
  GripVertical,
  AlertTriangle,
  Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius, iconSize, bottomSpace } from '@/src/theme';
import { taskRepository, settingsRepository, habitRepository } from '@/src/storage';
import { Task, TaskStatus, TaskPriority, Settings, Habit } from '@/src/storage/entities';
import { scheduleTaskReminders, rescheduleTaskReminders, cancelTaskReminders, scheduleHabitReminders, rescheduleAllNotifications } from '@/src/notifications';
import { todayISODate } from '@/src/storage/repository';
import { getHijriDate, getFullDateString, getGreeting } from '@/src/utils/dateUtils';
import { priorityColors, categoryColors, createDefaultTask, completeRepeatingTask, getUnmetDependencies, findScheduleConflicts } from '@/src/utils/taskUtils';
import { runAutoRollover, shouldPromptRollover } from '@/src/utils/rolloverUtils';
import { isHabitCompletedOn, isHabitDueOn, toggleHabitDate } from '@/src/utils/habitUtils';
import { ensureRecurringTasks } from '@/src/utils/recurringUtils';
import { ProgressRing } from '@/src/components/ProgressRing';
import { Card, EmptyState, LoadingState, SectionHeader, Button, TaskFormModal } from '@/src/components';
import { QuickAddModal } from '@/src/components/QuickAddModal';
import { FocusTaskPickerModal } from '@/src/components/FocusTaskPickerModal';
import { FAB } from '@/src/components/FAB';

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
        <GripVertical size={iconSize.md} color={color} />
      </Animated.View>
    </GestureDetector>
  );
}

export default function TodayScreen() {
  const { dataVersion } = useAuth();
  const { theme, isDark } = useTheme();
  const { t, language, isRTL } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formTask, setFormTask] = useState<Task | null>(null);
  const [showFocusPicker, setShowFocusPicker] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  const loadTasks = useCallback(async () => {
    const s = await settingsRepository.getOrCreate();
    setSettings(s);

    await runAutoRollover();
    const created = await ensureRecurringTasks();
    if (created > 0) {
      try {
        await rescheduleAllNotifications();
      } catch {
        // Notifications are optional on web.
      }
    }

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
  useFocusEffect(useCallback(() => { void loadTasks(); }, [loadTasks, dataVersion]));

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
      const saved = await taskRepository.update(task.id, task);
      if (!saved) return false;
      await notify(() => rescheduleTaskReminders(task));
    } else {
      const saved = await taskRepository.create(task);
      if (!saved) return false;
      await notify(() => scheduleTaskReminders(task));
    }
    setFormTask(null);
    await loadTasks();
    return true;
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
    await notify(() => scheduleHabitReminders());
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

  const scheduleConflicts = useMemo(() => findScheduleConflicts(todayTasks), [todayTasks]);
  const focusableTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'done' && task.status !== 'cancelled'),
    [tasks],
  );

  const progress = todayTasks.length > 0
    ? (completedTasks.length / todayTasks.length) * 100
    : 0;

  // Date strings are computed once per minute instead of on every render.
  const clock = useMemo(() => {
    const now = new Date();
    return {
      greeting: getGreeting(now.getHours(), language),
      dateDisplay: getFullDateString(now, language),
      hijriDisplay: settings?.showHijriDate ? getHijriDate(now) : null,
    };
  }, [language, settings?.showHijriDate, Math.floor(Date.now() / 60000)]);
  const { greeting, dateDisplay, hijriDisplay } = clock;

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
          { backgroundColor: theme.surfaceSecondary, opacity: pressed ? 0.85 : 1 },
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
          {isDone && <CheckCircle2 size={iconSize.sm} color={theme.text.inverse} strokeWidth={3} />}
        </Pressable>

        <View style={styles.taskContent}>
          <View style={styles.taskTopRow}>
            <Text
              numberOfLines={3}
              style={[
                styles.taskTitle,
                { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold, textDecorationLine: isDone ? 'line-through' : 'none' },
              ]}
            >
              {task.title}
            </Text>
            {task.isMIT && (
              <Star size={iconSize.sm} color={theme.secondary[500]} fill={theme.secondary[500]} />
            )}
          </View>

          <View style={styles.taskMetaRow}>
            {task.time && (
              <View style={styles.taskTimeChip}>
                <Clock size={iconSize.xs} color={theme.text.tertiary} />
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
                <AlertTriangle size={iconSize.xs} color={theme.warning} />
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
              <Star size={iconSize.md} color={theme.secondary[500]} fill={theme.secondary[500]} />
            ) : (
              <StarOff size={iconSize.md} color={theme.text.tertiary} />
            )}
          </Pressable>
        )}
      </Pressable>
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
      accessibilityRole="button"
      accessibilityLabel={label}
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
        <LoadingState label={t('common.loading')} />
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
              accessibilityRole="button"
              accessibilityLabel={t('notifications.title')}
              style={({ pressed }) => [
                styles.bellBtn,
                { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Bell size={iconSize.lg} color={theme.text.secondary} />
            </Pressable>
          </View>

          <View style={styles.heroBottom}>
            <ProgressRing progress={progress} size={64} strokeWidth={6} />
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
            <Plus size={iconSize.xl} color={theme.primary[500]} />,
            t('today.quickAdd'),
            () => setShowQuickAdd(true),
            theme.primary[500],
          )}
          {renderQuickButton(
            <Focus size={iconSize.xl} color={theme.accent[500]} />,
            t('today.startFocus'),
            () => setShowFocusPicker(true),
            theme.accent[500],
          )}
          {renderQuickButton(
            <ClipboardList size={iconSize.xl} color={theme.secondary[500]} />,
            t('today.dailyReview'),
            () => router.push('/review'),
            theme.secondary[500],
          )}
        </View>

        {/* Quick habit check-in */}
        {dueHabits.length > 0 ? (
          <Card style={styles.habitCard}>
            <SectionHeader
              icon={<CheckCircle2 size={iconSize.md} color={theme.success} />}
              title={t('today.habits')}
              description={t('today.habitsHint')}
              count={`${dueHabits.filter((habit) => isHabitCompletedOn(habit, today)).length}/${dueHabits.length}`}
              color={theme.success}
              style={styles.sectionSpacing}
            />
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
                      {done ? <Check size={iconSize.xs} color={theme.text.inverse} strokeWidth={3} /> : null}
                    </View>
                    <Text
                      numberOfLines={2}
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
          </Card>
        ) : null}

        {/* Today's plan */}
        <Card style={styles.planCard}>
          <SectionHeader
            icon={<ClipboardList size={iconSize.md} color={theme.primary[500]} />}
            title={t('today.tasksCount')}
            description={activeTasks.length > 1 ? t('today.reorderHint') : undefined}
            count={activeTasks.length}
            color={theme.primary[500]}
            style={styles.sectionSpacing}
          />

          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <EmptyState
              compact
              icon={<CheckCircle2 size={iconSize.hero} color={theme.text.tertiary} />}
              title={t('today.noTasks')}
              description={t('today.noTasksDesc')}
              action={
                <Button
                  variant="primary"
                  icon={<Plus size={iconSize.md} color={theme.text.inverse} />}
                  onPress={() => setShowQuickAdd(true)}
                >
                  {t('today.addTask')}
                </Button>
              }
            />
          ) : (
            <View style={styles.planList}>
              {activeTasks.map((task) => renderTaskRow(task, true))}

              {completedTasks.length > 0 ? (
                <>
                  <Pressable
                    onPress={() => setShowCompleted((value) => !value)}
                    accessibilityRole="button"
                    accessibilityLabel={t('review.completed')}
                    accessibilityState={{ expanded: showCompleted }}
                    style={styles.completedToggle}
                  >
                    <CheckCircle2 size={iconSize.md} color={theme.success} />
                    <Text
                      style={[
                        styles.completedToggleText,
                        { color: theme.success, fontFamily: typography.fontFamilySemiBold },
                      ]}
                    >
                      {t('review.completed')} ({completedTasks.length})
                    </Text>
                    <ChevronDown
                      size={iconSize.md}
                      color={theme.success}
                      style={{ transform: [{ rotate: showCompleted ? '180deg' : '0deg' }] }}
                    />
                  </Pressable>
                  {showCompleted ? completedTasks.map((task) => renderTaskRow(task)) : null}
                </>
              ) : null}
            </View>
          )}
        </Card>

        {/* Planner link */}
        <Pressable
          onPress={() => router.push('/planner')}
          style={({ pressed }) => [
            styles.plannerLink,
            { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.plannerLinkLeft}>
            <CalendarDays size={iconSize.lg} color={theme.primary[500]} />
            <Text style={[styles.plannerLinkText, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('planner.title')}
            </Text>
          </View>
          {isRTL
            ? <ChevronLeft size={iconSize.lg} color={theme.text.tertiary} />
            : <ChevronRight size={iconSize.lg} color={theme.text.tertiary} />}
        </Pressable>
      </ScrollView>

      <FAB onPress={() => setShowQuickAdd(true)} />

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
        tasks={focusableTasks}
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
    paddingBottom: bottomSpace.fab,
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
    marginBottom: spacing.sm,
  },
  heroGreeting: {
    flex: 1,
    gap: 1,
  },
  greeting: {
    fontSize: typography.sizes.xl,
    lineHeight: typography.sizes.xl * typography.lineHeights.normal,
  },
  dateText: {
    fontSize: typography.sizes.md,
  },
  hijriText: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs * 0.25,
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
    fontSize: typography.sizes.lg,
    lineHeight: typography.sizes.lg * typography.lineHeights.normal,
  },
  heroStatLabel: {
    fontSize: typography.sizes.xs,
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
    gap: spacing.xs,
    paddingVertical: spacing.sm,
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
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
    textAlign: 'center',
  },
  sectionSpacing: {
    marginBottom: spacing.sm,
  },
  habitCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
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
  habitChipText: { fontSize: typography.sizes.xs, flexShrink: 1, lineHeight: typography.sizes.xs * 1.65 },
  planCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  planList: {
    gap: spacing.xs,
  },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  completedToggleText: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  dragHandle: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    justifyContent: 'center',
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
    fontSize: typography.sizes.sm,
    // Arabic Cairo glyphs need extra vertical room; without this, the second
    // allowed line is visually clipped on dense 393dp screens.
    lineHeight: typography.sizes.sm * 1.65,
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
    fontSize: typography.sizes.xs,
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
    fontSize: typography.sizes.xs,
  },
  mitBtn: {
    padding: 2,
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
