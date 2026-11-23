import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  RefreshControl,
} from 'react-native';
import {
  BarChart3,
  CheckSquare,
  Target,
  Flame,
  Clock,
  Timer,
  TrendingUp,
  Smile,
  Award,
} from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography } from '@/src/theme';
import { ScreenHeader, EmptyState, Chip, StatCard, ProgressRing, TrendChart } from '@/src/components';
import {
  goalRepository,
  habitRepository,
  pomodoroRepository,
  reviewRepository,
  taskRepository,
} from '@/src/storage';
import { Goal, Habit, PomodoroSession, DailyReview, Task } from '@/src/storage/entities';
import { computeDashboardStats, Period } from '@/src/utils/statsUtils';
import { formatDateDisplay } from '@/src/utils/taskUtils';

const PERIODS: Period[] = ['7', '30', 'all'];

export default function StatsScreen() {
  const { theme } = useTheme();
  const { t, language } = useI18n();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [reviews, setReviews] = useState<DailyReview[]>([]);
  const [pomodoros, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [period, setPeriod] = useState<Period>('7');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [storedTasks, storedGoals, storedHabits, storedReviews, storedPomodoros] = await Promise.all([
      taskRepository.getAll(),
      goalRepository.getAll(),
      habitRepository.getAll(),
      reviewRepository.getAll(),
      pomodoroRepository.getAll(),
    ]);
    setTasks(storedTasks);
    setGoals(storedGoals);
    setHabits(storedHabits);
    setReviews(storedReviews);
    setPomodoroSessions(storedPomodoros);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const stats = useMemo(
    () =>
      computeDashboardStats(
        { tasks, goals, habits, reviews, pomodoros: pomodoros },
        language,
        period,
      ),
    [tasks, goals, habits, reviews, pomodoros, language, period],
  );

  const maxDay = Math.max(1, ...stats.daily.map((day) => Math.max(day.completed, day.created)));
  const trendValues = useMemo(() => stats.daily.map((day) => day.completed), [stats.daily]);
  const bestDay = useMemo(
    () => stats.daily.reduce((best, day) => (day.completed > best.completed ? day : best), stats.daily[0]),
    [stats.daily],
  );
  const hasData = tasks.length > 0 || goals.length > 0 || habits.length > 0 || reviews.length > 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!hasData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title={t('stats.title')} subtitle={t('stats.subtitle')} />
        <View style={styles.empty}>
          <EmptyState
            icon={<BarChart3 size={36} color={theme.text.tertiary} />}
            title={t('stats.noData')}
            description={t('stats.noDataDesc')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('stats.title')} subtitle={t('stats.subtitle')} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.filters}>
          {PERIODS.map((item) => (
            <Chip key={item} selected={period === item} onPress={() => setPeriod(item)}>
              {item === '7' ? t('stats.last7') : item === '30' ? t('stats.last30') : t('stats.allTime')}
            </Chip>
          ))}
        </View>

        <View style={[styles.overviewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ProgressRing progress={stats.completionRate} size={112} label={t('stats.completionRate')} />
          <View style={styles.overviewInfo}>
            <Text style={[styles.overviewTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('stats.overview')}
            </Text>
            <Text style={[styles.overviewText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
              {t('stats.completed')}: {stats.completedTasks} / {stats.totalTasks}
            </Text>
            <Text style={[styles.overviewText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
              {t('stats.pending')}: {stats.activeTasks} · {t('stats.inProgress')}: {stats.inProgressTasks}
            </Text>
            <Text style={[styles.overviewText, { color: theme.primary[500], fontFamily: typography.fontFamilySemiBold }]}>
              {t('stats.streak')}: {stats.streak}
            </Text>
          </View>
        </View>

        <View style={styles.statGrid}>
          <StatCard
            icon={<Clock size={18} color={theme.primary[500]} />}
            label={t('stats.focusTime')}
            value={`${stats.focusMinutes}`}
            sublabel={t('pomodoro.focusMinutes')}
            color={theme.primary[500]}
          />
          <StatCard
            icon={<Timer size={18} color={theme.secondary[500]} />}
            label={t('stats.sessions')}
            value={stats.sessions}
            sublabel={t('stats.done')}
            color={theme.secondary[500]}
          />
          <StatCard
            icon={<Target size={18} color={theme.accent[500]} />}
            label={t('stats.avgGoalProgress')}
            value={`${stats.avgGoalProgress}%`}
            sublabel={`${t('stats.goalsCompleted')}: ${stats.completedGoals}`}
            color={theme.accent[500]}
          />
          <StatCard
            icon={<Flame size={18} color={theme.warning} />}
            label={t('stats.habitConsistency')}
            value={`${stats.habitConsistency}%`}
            sublabel={`${t('plans.habitsTab')}: ${habits.length}`}
            color={theme.warning}
          />
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={theme.primary[500]} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('stats.weeklyActivity')}
            </Text>
          </View>
          <View style={styles.chart}>
            {stats.daily.map((day) => (
              <View key={day.date} style={styles.chartColumn}>
                <View style={styles.bars}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, (day.completed / maxDay) * 70),
                        backgroundColor: theme.success,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, (day.created / maxDay) * 70),
                        backgroundColor: theme.primary[500],
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.chartLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {day.label}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.legendText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('stats.done')}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.primary[500] }]} />
              <Text style={[styles.legendText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('stats.created')}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={theme.success} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('stats.completionTrend')}
            </Text>
          </View>
          <TrendChart values={trendValues} color={theme.success} />
          {bestDay ? (
            <Text style={[styles.trendHint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('stats.bestDay')}: {bestDay.label} — {bestDay.completed} {t('stats.done')}
            </Text>
          ) : null}
        </View>

        {stats.categories.length > 0 ? (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <CheckSquare size={18} color={theme.secondary[500]} />
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                {t('stats.categoryBreakdown')}
              </Text>
            </View>
            {stats.categories.map((category) => (
              <View key={category.key} style={styles.categoryRow}>
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <Text style={[styles.categoryName, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                  {category.label}
                </Text>
                <View style={[styles.categoryTrack, { backgroundColor: theme.surfaceTertiary }]}>
                  <View
                    style={[
                      styles.categoryFill,
                      { width: `${category.percent}%`, backgroundColor: category.color },
                    ]}
                  />
                </View>
                <Text style={[styles.categoryPercent, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {category.percent}%
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {stats.moods.length > 0 ? (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <Smile size={18} color={theme.accent[500]} />
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                {t('stats.moodTrend')}
              </Text>
            </View>
            <View style={styles.moodRow}>
              {stats.moods.map((mood) => (
                <View key={mood.key} style={[styles.moodChip, { backgroundColor: `${mood.color}22` }]}>
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={[styles.moodLabel, { color: mood.color, fontFamily: typography.fontFamilySemiBold }]}>
                    {mood.label}
                  </Text>
                  <Text style={[styles.moodCount, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                    {mood.count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('stats.noReviews')}
            </Text>
          </View>
        )}

        {stats.recent.length > 0 ? (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <Award size={18} color={theme.warning} />
              <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                {t('stats.recentActivity')}
              </Text>
            </View>
            {stats.recent.map((task) => (
              <View key={task.id} style={styles.recentRow}>
                <View style={[styles.recentDot, { backgroundColor: theme.success }]}>
                  <CheckSquare size={14} color="#FFFFFF" />
                </View>
                <View style={styles.recentInfo}>
                  <Text numberOfLines={1} style={[styles.recentTitle, { color: theme.text.primary, fontFamily: typography.fontFamily }]}>
                    {task.title}
                  </Text>
                  <Text style={[styles.recentDate, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                    {formatDateDisplay(task.date, language)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('stats.noActivity')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    padding: spacing.lg,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 40,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowColor: '#00000010',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  overviewInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  overviewTitle: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.xs,
  },
  overviewText: {
    fontSize: typography.sizes.sm,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 74,
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 10,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.sizes.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    width: 70,
    fontSize: typography.sizes.sm,
  },
  categoryTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryPercent: {
    width: 34,
    textAlign: 'right',
    fontSize: typography.sizes.xs,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodLabel: {
    fontSize: typography.sizes.xs,
  },
  moodCount: {
    fontSize: typography.sizes.xs,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recentDot: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: typography.sizes.sm,
  },
  recentDate: {
    fontSize: 10,
  },
  hint: {
    fontSize: typography.sizes.sm,
  },
  trendHint: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
