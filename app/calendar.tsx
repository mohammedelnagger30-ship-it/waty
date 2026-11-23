import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Card } from '@/src/components/Card';
import { Task } from '@/src/storage/entities';
import { taskRepository } from '@/src/storage';
import { formatDateDisplay } from '@/src/utils/taskUtils';

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const WEEKDAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export default function CalendarScreen() {
  const { theme } = useTheme();
  const { t, language, isRTL } = useI18n();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    taskRepository.getAll().then(setTasks).catch(() => {});
  }, []);

  const cells = useMemo(
    () => getMonthDays(cursor.year, cursor.month),
    [cursor],
  );

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (!map[task.date]) map[task.date] = [];
      map[task.date].push(task);
    });
    return map;
  }, [tasks]);

  const selectedTasks = selected ? tasksByDate[selected] ?? [] : [];

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    language === 'ar' ? 'ar' : 'en',
    { month: 'long', year: 'numeric' },
  );

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
    setSelected(null);
  };

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('calendar.title')} subtitle={t('calendar.subtitle')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.monthCard}>
          <View style={styles.monthHeader}>
            <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn}>
              {isRTL ? <ChevronRight size={22} color={theme.text.primary} /> : <ChevronLeft size={22} color={theme.text.primary} />}
            </Pressable>
            <Text style={[styles.monthTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {monthLabel}
            </Text>
            <Pressable onPress={() => shiftMonth(1)} style={styles.navBtn}>
              {isRTL ? <ChevronLeft size={22} color={theme.text.primary} /> : <ChevronRight size={22} color={theme.text.primary} />}
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={[styles.weekday, { color: theme.text.tertiary, fontFamily: typography.fontFamilySemiBold }]}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((date, index) => {
              if (!date) return <View key={`empty-${index}`} style={styles.cell} />;
              const key = date.toISOString().slice(0, 10);
              const dayTasks = tasksByDate[key] ?? [];
              const isSelected = selected === key;
              const isToday = key === todayKey;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSelected(key)}
                  style={[
                    styles.cell,
                    isToday && { borderColor: theme.primary[500], borderWidth: 1.5 },
                    isSelected && { backgroundColor: theme.primary[500] + '22' },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: isSelected ? theme.primary[theme.isDark ? 300 : 600] : theme.text.primary, fontFamily: typography.fontFamilySemiBold },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {dayTasks.length > 0 && (
                    <View style={styles.dotsRow}>
                      {dayTasks.slice(0, 3).map((task, i) => (
                        <View
                          key={i}
                          style={[styles.dot, { backgroundColor: task.status === 'done' ? theme.success : theme.primary[500] }]}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>

        {selected && (
          <Card style={styles.tasksCard}>
            <Text style={[styles.selectedTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {formatDateDisplay(selected, language)}
            </Text>
            {selectedTasks.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('calendar.noTasks')}
              </Text>
            ) : (
              selectedTasks.map((task) => (
                <Pressable
                  key={task.id}
                  onPress={() => router.push(`/tasks/${task.id}` as any)}
                  style={[styles.taskRow, { backgroundColor: theme.surfaceSecondary }]}
                >
                  <Text
                    style={[styles.taskTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  {task.time ? (
                    <Text style={[styles.taskTime, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                      {task.time}
                    </Text>
                  ) : null}
                </Pressable>
              ))
            )}
          </Card>
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push('/tasks')}
        style={[styles.fab, { backgroundColor: theme.primary[500] }]}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  monthCard: { marginBottom: spacing.md },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: { padding: spacing.xs },
  monthTitle: { fontSize: typography.sizes.lg },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: { flex: 1, textAlign: 'center', fontSize: typography.sizes.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 2,
  },
  dayNumber: { fontSize: typography.sizes.sm },
  dotsRow: { flexDirection: 'row', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  tasksCard: { marginBottom: spacing.md },
  selectedTitle: { fontSize: typography.sizes.md, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.sm },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  taskTitle: { fontSize: typography.sizes.sm, flex: 1 },
  taskTime: { fontSize: typography.sizes.xs, marginStart: spacing.sm },
  fab: {
    position: 'absolute',
    end: spacing.lg,
    bottom: 90,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
