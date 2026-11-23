import { useState, useCallback, useMemo } from 'react';
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
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { taskRepository, settingsRepository } from '@/src/storage';
import { Task, TaskStatus, Settings } from '@/src/storage/entities';
import { scheduleTaskReminders, cancelTaskReminders } from '@/src/notifications';
import { todayISODate } from '@/src/storage/repository';
import { getHijriDate, getFullDateString, getGreeting } from '@/src/utils/dateUtils';
import { priorityColors, categoryColors } from '@/src/utils/taskUtils';
import { runAutoRollover, shouldPromptRollover } from '@/src/utils/rolloverUtils';
import { ProgressRing } from '@/src/components/ProgressRing';
import { Card, EmptyState, Button } from '@/src/components';
import { QuickAddModal } from '@/src/components/QuickAddModal';
import { FAB } from '@/src/components/FAB';

type ViewMode = 'timeline' | 'list';

export default function TodayScreen() {
  const { theme, isDark } = useTheme();
  const { t, language, isRTL } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  const loadTasks = useCallback(async () => {
    const s = await settingsRepository.getOrCreate();
    setSettings(s);

    await runAutoRollover();

    const all = await taskRepository.getAll();
    setTasks(all);
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

  const handleComplete = async (task: Task) => {
    const next: Partial<Task> = {
      status: 'done' as TaskStatus,
      completedAt: new Date().toISOString(),
    };
    await taskRepository.update(task.id, next);
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

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.date === today && t.status !== 'cancelled');
  }, [tasks, today]);

  const completedTasks = useMemo(() => {
    return todayTasks.filter((t) => t.status === 'done');
  }, [todayTasks]);

  const activeTasks = useMemo(() => {
    return todayTasks.filter((t) => t.status !== 'done');
  }, [todayTasks]);

  const mitTasks = useMemo(() => {
    return activeTasks.filter((t) => t.isMIT).slice(0, 3);
  }, [activeTasks]);

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

  const renderTaskRow = (task: Task) => {
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
          {hourTasks.map(renderTaskRow)}
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
            () => router.push('/tasks'),
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
                {untimedTasks.map(renderTaskRow)}
              </View>
            )}

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <View style={styles.untimedSection}>
                <Text style={[styles.untimedLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('review.completed')} ({completedTasks.length})
                </Text>
                {completedTasks.map(renderTaskRow)}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {activeTasks.map(renderTaskRow)}
            {completedTasks.length > 0 && (
              <View style={styles.untimedSection}>
                <Text style={[styles.untimedLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('review.completed')} ({completedTasks.length})
                </Text>
                {completedTasks.map(renderTaskRow)}
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
