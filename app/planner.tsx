import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  CalendarDays,
  LayoutGrid,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth, useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius, iconSize, iconStroke, bottomSpace } from '@/src/theme';
import { taskRepository } from '@/src/storage';
import { Task, TaskPriority } from '@/src/storage/entities';
import { todayISODate } from '@/src/storage/repository';
import { priorityColors, categoryColors } from '@/src/utils/taskUtils';
import { ensureRecurringTasks } from '@/src/utils/recurringUtils';
import { scheduleTaskReminders, rescheduleAllNotifications } from '@/src/notifications';
import { Button, Card, EmptyState, LoadingState, PlanBatchModal, ScreenHeader } from '@/src/components';

type CalendarMode = 'week' | 'month';

const WEEK_DAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const WEEK_DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dateToISO(d: Date): string {
  return toLocalISO(d);
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWorkloadLevel(count: number): 'light' | 'balanced' | 'overloaded' {
  if (count === 0) return 'light';
  if (count <= 3) return 'light';
  if (count <= 6) return 'balanced';
  return 'overloaded';
}

export default function PlannerScreen() {
  const { dataVersion } = useAuth();
  const { theme, isDark } = useTheme();
  const { t, language, isRTL } = useI18n();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<CalendarMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayISODate());
  const [showBatchModal, setShowBatchModal] = useState(false);

  const load = useCallback(async () => {
    const created = await ensureRecurringTasks();
    if (created > 0) {
      try {
        await rescheduleAllNotifications();
      } catch {
        // Notifications are optional on web.
      }
    }
    const all = await taskRepository.getAll();
    setTasks(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const start = getMonthStart(currentDate);
    const startDay = start.getDay();
    const startDate = new Date(start);
    startDate.setDate(startDate.getDate() - startDay);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (task.status === 'cancelled') continue;
      if (!map[task.date]) map[task.date] = [];
      map[task.date].push(task);
    }
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(() => {
    return (tasksByDate[selectedDate] ?? [])
      .filter((t) => t.status !== 'cancelled')
      .sort((a, b) => {
        const ta = a.time ?? '99:99';
        const tb = b.time ?? '99:99';
        return ta.localeCompare(tb);
      });
  }, [tasksByDate, selectedDate]);

  const getWorkloadColor = (level: 'light' | 'balanced' | 'overloaded'): string => {
    if (level === 'light') return theme.accent[500];
    if (level === 'balanced') return theme.secondary[500];
    return theme.error;
  };

  const handlePrevPeriod = () => {
    const d = new Date(currentDate);
    if (mode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const handleNextPeriod = () => {
    const d = new Date(currentDate);
    if (mode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(todayISODate());
  };

  const handleAutoSchedule = useCallback(async () => {
    const all = await taskRepository.getAll();
    const rank: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
    const candidates = all
      .filter((task) => task.status === 'pending' && !task.time)
      .sort((a, b) => rank[a.priority] - rank[b.priority] || a.createdAt.localeCompare(b.createdAt));

    if (candidates.length === 0) {
      Alert.alert(t('planning.auto'), t('planning.noCandidates'));
      return;
    }

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return toLocalISO(d);
    });
    const counts: Record<string, number> = {};
    for (const day of days) {
      counts[day] = all.filter((task) => task.date === day && task.time).length;
    }

    let scheduled = 0;
    for (const task of candidates) {
      const target = days.reduce((best, day) => (counts[day] < counts[best] ? day : best), days[0]);
      const duration = Math.max(30, Math.min(120, task.estimatedMinutes || 60));
      const startMinutes = 9 * 60 + counts[target] * duration;
      if (startMinutes >= 19 * 60) continue;
      const time = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`;
      const updated = await taskRepository.update(task.id, { date: target, time });
      if (updated) {
        await scheduleTaskReminders(updated);
        counts[target] += 1;
        scheduled += 1;
      }
    }

    await load();
    Alert.alert(t('planning.auto'), scheduled > 0 ? t('planning.scheduled') : t('planning.noCandidates'));
  }, [load, t]);

  const handleBatchSave = useCallback(
    async (newTasks: Task[]) => {
      let saved = 0;
      for (const task of newTasks) {
        await taskRepository.create(task);
        await scheduleTaskReminders(task);
        saved += 1;
      }
      await load();
      Alert.alert(
        t('planning.batchTitle'),
        t('planning.savedPlan').replace('{count}', String(saved)),
      );
    },
    [load, t],
  );

  const renderDayCell = (date: Date, isCurrentMonth: boolean = true) => {
    const dateStr = dateToISO(date);
    const dayTasks = tasksByDate[dateStr] ?? [];
    const count = dayTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;
    const level = getWorkloadLevel(count);
    const isSelected = dateStr === selectedDate;
    const isToday = dateStr === todayISODate();

    return (
      <Pressable
        key={dateStr}
        onPress={() => setSelectedDate(dateStr)}
        style={[
          styles.dayCell,
          {
            backgroundColor: isSelected ? theme.primary[500] : 'transparent',
            borderColor: isToday ? theme.primary[500] : 'transparent',
            borderWidth: isToday ? 1.5 : 0,
            opacity: isCurrentMonth ? 1 : 0.35,
          },
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            {
              color: isSelected ? '#FFFFFF' : isToday ? theme.primary[500] : theme.text.primary,
              fontFamily: isToday || isSelected ? typography.fontFamilyBold : typography.fontFamily,
            },
          ]}
        >
          {date.getDate()}
        </Text>
        {count > 0 && (
          <View
            style={[
              styles.workloadDot,
              { backgroundColor: isSelected ? '#FFFFFF' : getWorkloadColor(level) },
            ]}
          />
        )}
        {mode === 'week' && count > 0 && (
          <Text
            style={[
              styles.dayCount,
              {
                color: isSelected ? '#FFFFFF' : getWorkloadColor(level),
                fontFamily: typography.fontFamilySemiBold,
              },
            ]}
          >
            {count}
          </Text>
        )}
      </Pressable>
    );
  };

  const renderSelectedTask = (task: Task) => {
    const pColor = priorityColors[task.priority];
    const color = isDark ? pColor.dark : pColor.light;
    const catColor = categoryColors[task.category];
    const isDone = task.status === 'done';

    return (
      <Pressable
        key={task.id}
        onPress={() => router.push(`/tasks/${task.id}`)}
        style={({ pressed }) => [
          styles.taskItem,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={[styles.taskPriorityBar, { backgroundColor: color }]} />
        <View style={styles.taskContent}>
          <View style={styles.taskRow}>
            <Text
              numberOfLines={3}
              style={[
                styles.taskTitle,
                {
                  color: theme.text.primary,
                  fontFamily: typography.fontFamilySemiBold,
                  textDecorationLine: isDone ? 'line-through' : 'none',
                },
              ]}
            >
              {task.title}
            </Text>
            {task.time && (
              <View style={styles.taskTimeChip}>
                <Text style={[styles.taskTimeText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {task.time}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.taskMeta}>
            <View style={[styles.taskCatChip, { backgroundColor: catColor + '22' }]}>
              <View style={[styles.taskCatDot, { backgroundColor: catColor }]} />
              <Text style={[styles.taskCatText, { color: catColor, fontFamily: typography.fontFamilySemiBold }]}>
                {task.category === 'custom' && task.customCategory ? task.customCategory : t(`tasks.category.${task.category}` as Parameters<typeof t>[0])}
              </Text>
            </View>
            {isDone && (
              <View style={[styles.doneBadge, { backgroundColor: theme.success + '22' }]}>
                <Text style={[styles.doneText, { color: theme.success, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('tasks.status.done')}
                </Text>
              </View>
            )}
            {(task.rolloverCount ?? 0) > 0 && (
              <View style={[styles.rolloverBadge, { backgroundColor: theme.warning + '22' }]}>
                <Text style={[styles.rolloverText, { color: theme.warning, fontFamily: typography.fontFamilySemiBold }]}>
                  {(task.rolloverCount ?? 0)}x
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const headerTitle = mode === 'week'
    ? `${language === 'ar' ? WEEK_DAYS_AR[0] : WEEK_DAYS_EN[0]} - ${language === 'ar' ? WEEK_DAYS_AR[6] : WEEK_DAYS_EN[6]}`
    : `${language === 'ar' ? MONTHS_AR[currentDate.getMonth()] : MONTHS_EN[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingState label={t('common.loading')} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('planner.title')} onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Toggle */}
        <View style={styles.modeToggleRow}>
          <Pressable
            onPress={() => setMode('week')}
            style={[
              styles.modeToggleBtn,
              { backgroundColor: mode === 'week' ? theme.primary[500] : 'transparent', borderColor: mode === 'week' ? theme.primary[500] : theme.border },
            ]}
          >
            <CalendarDays size={16} color={mode === 'week' ? '#FFFFFF' : theme.text.secondary} />
            <Text style={[styles.modeToggleText, { color: mode === 'week' ? '#FFFFFF' : theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('planner.week')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('month')}
            style={[
              styles.modeToggleBtn,
              { backgroundColor: mode === 'month' ? theme.primary[500] : 'transparent', borderColor: mode === 'month' ? theme.primary[500] : theme.border },
            ]}
          >
            <LayoutGrid size={16} color={mode === 'month' ? '#FFFFFF' : theme.text.secondary} />
            <Text style={[styles.modeToggleText, { color: mode === 'month' ? '#FFFFFF' : theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('planner.month')}
            </Text>
          </Pressable>
        </View>

        {/* Auto-schedule */}
        <Card style={styles.autoCard}>
          <Text style={[styles.autoTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('planning.auto')}
          </Text>
          <Text style={[styles.autoDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('planning.autoDesc')}
          </Text>
          <Button size="sm" variant="outline" onPress={handleAutoSchedule}>
            {t('planning.auto')}
          </Button>
        </Card>

        {/* One-go day / week planning */}
        <Card style={styles.autoCard}>
          <Text style={[styles.autoTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('planning.batchTitle')}
          </Text>
          <Text style={[styles.autoDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('planning.batchDesc')}
          </Text>
          <Button size="sm" onPress={() => setShowBatchModal(true)}>
            {t('planning.batchAction')}
          </Button>
        </Card>

        {/* Calendar Header */}
        <View style={styles.calHeader}>
          <Pressable onPress={handlePrevPeriod} hitSlop={12} style={styles.navBtn}>
            {isRTL ? (
              <ChevronRight size={iconSize.xl} color={theme.text.secondary} strokeWidth={iconStroke.regular} />
            ) : (
              <ChevronLeft size={iconSize.xl} color={theme.text.secondary} strokeWidth={iconStroke.regular} />
            )}
          </Pressable>
          <Pressable onPress={handleToday}>
            <Text style={[styles.calTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {headerTitle}
            </Text>
          </Pressable>
          <Pressable onPress={handleNextPeriod} hitSlop={12} style={styles.navBtn}>
            {isRTL ? (
              <ChevronLeft size={iconSize.xl} color={theme.text.secondary} strokeWidth={iconStroke.regular} />
            ) : (
              <ChevronRight size={iconSize.xl} color={theme.text.secondary} strokeWidth={iconStroke.regular} />
            )}
          </Pressable>
        </View>

        {/* Week Day Headers */}
        <View style={styles.weekHeaderRow}>
          {(language === 'ar' ? WEEK_DAYS_AR : WEEK_DAYS_EN).map((day, i) => (
            <Text key={i} style={[styles.weekDayHeader, { color: theme.text.tertiary, fontFamily: typography.fontFamilySemiBold }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <Card style={styles.calCard} padded={false}>
          {mode === 'week' ? (
            <View style={styles.weekGrid}>
              {weekDays.map((d) => renderDayCell(d, true))}
            </View>
          ) : (
            <View style={styles.monthGrid}>
              {monthDays.map((d) => renderDayCell(d, d.getMonth() === currentDate.getMonth()))}
            </View>
          )}
        </Card>

        {/* Workload Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.accent[500] }]} />
            <Text style={[styles.legendText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('planner.workload.light')}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.secondary[500] }]} />
            <Text style={[styles.legendText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('planner.workload.balanced')}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.error }]} />
            <Text style={[styles.legendText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('planner.workload.overloaded')}
            </Text>
          </View>
        </View>

        {/* Selected Day Tasks */}
        <View style={styles.selectedDaySection}>
          <View style={styles.selectedDayHeader}>
            <Calendar size={18} color={theme.primary[500]} />
            <Text style={[styles.selectedDayTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {selectedDate === todayISODate() ? t('planner.today') : selectedDate}
            </Text>
            <View style={[styles.taskCountBadge, { backgroundColor: theme.primary[500] + '22' }]}>
              <Text style={[styles.taskCountText, { color: theme.primary[500], fontFamily: typography.fontFamilySemiBold }]}>
                {selectedTasks.length}
              </Text>
            </View>
          </View>

          {selectedTasks.length > 0 ? (
            <View style={styles.taskList}>
              {selectedTasks.map(renderSelectedTask)}
            </View>
          ) : (
            <EmptyState
              icon={<Calendar size={iconSize.hero} color={theme.text.tertiary} />}
              title={t('planner.noTasks')}
            />
          )}
        </View>
      </ScrollView>

      <PlanBatchModal
        visible={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onSave={handleBatchSave}
        initialDate={selectedDate}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    height: 56,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: bottomSpace.sheet,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  modeToggleText: {
    fontSize: typography.sizes.sm,
  },
  autoCard: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  autoTitle: {
    fontSize: typography.sizes.sm,
  },
  autoDesc: {
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    padding: spacing.xs,
  },
  calTitle: {
    fontSize: typography.sizes.md,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.xs,
  },
  calCard: {
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  weekGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: 2,
    minHeight: 56,
  },
  dayNumber: {
    fontSize: typography.sizes.sm,
  },
  workloadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayCount: {
    fontSize: typography.sizes.xs,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.sizes.xs,
  },
  selectedDaySection: {
    marginTop: spacing.sm,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  selectedDayTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
  },
  taskCountBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    minWidth: 24,
    alignItems: 'center',
  },
  taskCountText: {
    fontSize: typography.sizes.xs,
  },
  taskList: {
    gap: spacing.xs,
  },
  taskItem: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskPriorityBar: {
    width: 3,
  },
  taskContent: {
    flex: 1,
    padding: spacing.sm + 2,
    gap: spacing.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskTitle: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.65,
  },
  taskTimeChip: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  taskTimeText: {
    fontSize: typography.sizes.xs,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskCatText: {
    fontSize: typography.sizes.xs,
  },
  doneBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  doneText: {
    fontSize: typography.sizes.xs,
  },
  rolloverBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  rolloverText: {
    fontSize: typography.sizes.xs,
  },
});
