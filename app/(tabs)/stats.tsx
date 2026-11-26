import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  History,
} from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography, iconSize, bottomSpace, useResponsive } from '@/src/theme';
import { ScreenHeader, EmptyState, Chip, StatCard, ProgressRing, TrendChart, Card, SectionHeader } from '@/src/components';
import { HeatmapGrid } from '@/src/components/HeatmapGrid';
import {
  goalRepository,
  habitRepository,
  pomodoroRepository,
  reviewRepository,
  taskRepository,
  settingsRepository,
} from '@/src/storage';
import { Goal, Habit, PomodoroSession, DailyReview, Task, Settings } from '@/src/storage/entities';
import { computeDashboardStats, Period } from '@/src/utils/statsUtils';
import { formatDateDisplay } from '@/src/utils/taskUtils';
import { buildHeatmap, computeStreak, dateKey, levelFromXp, suggestEstimate } from '@/src/utils/insights';
import { buildBadges } from '@/src/utils/achievements';

const PERIODS: Period[] = ['7', '30', 'all'];

export default function StatsScreen() {
  const { theme } = useTheme();
  const responsive = useResponsive();
  const { t, language, isRTL } = useI18n();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [reviews, setReviews] = useState<DailyReview[]>([]);
  const [pomodoros, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [period, setPeriod] = useState<Period>('7');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [storedTasks, storedGoals, storedHabits, storedReviews, storedPomodoros, storedSettings] = await Promise.all([
      taskRepository.getAll(),
      goalRepository.getAll(),
      habitRepository.getAll(),
      reviewRepository.getAll(),
      pomodoroRepository.getAll(),
      settingsRepository.getOrCreate(),
    ]);
    setSettings(storedSettings);
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

  const maxDay = stats.daily.reduce(
    (max, day) => Math.max(max, day.completed, day.created),
    1,
  );
  // Phones show the most recent 14 days (~19dp per column). Wide tablets have
  // room for the full 30-day period without squeezing the labels.
  const visibleChartDays = responsive.columns === 2 ? 30 : 14;
  const chartDays =
    stats.daily.length > visibleChartDays ? stats.daily.slice(-visibleChartDays) : stats.daily;
  const trendValues = useMemo(() => stats.daily.map((day) => day.completed), [stats.daily]);
  const bestDay = useMemo(
    () => stats.daily.reduce((best, day) => (day.completed > best.completed ? day : best), stats.daily[0]),
    [stats.daily],
  );
  const hasData = tasks.length > 0 || goals.length > 0 || habits.length > 0 || reviews.length > 0;

  // New insights are derived locally: no extra entity and no extra storage.
  const insightData = useMemo(() => {
    const focusSessions = pomodoros.filter((session) => session.type === 'focus');
    const completed = tasks.filter((task) => task.status === 'done');
    const streak = computeStreak(completed.map((task) => task.completedAt ?? task.date));
    const focusMinutes = focusSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
    const xp = completed.length * 10 + focusMinutes;
    const level = levelFromXp(xp);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekAgoKey = dateKey(weekAgo);
    const weeklyTasks = completed.filter((task) => dateKey(task.completedAt ?? task.date) >= weekAgoKey).length;
    const weeklyFocus = focusSessions
      .filter((session) => dateKey(session.startedAt) >= weekAgoKey)
      .reduce((sum, session) => sum + session.durationMinutes, 0);

    const estimates = tasks.filter((task) => task.estimatedMinutes && task.actualMinutes > 0);
    const averageEstimate = estimates.length
      ? Math.round(estimates.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0) / estimates.length)
      : 0;
    const averageActual = estimates.length
      ? Math.round(estimates.reduce((sum, task) => sum + task.actualMinutes, 0) / estimates.length)
      : 0;
    const betterEstimate = suggestEstimate(averageEstimate, estimates.map((task) => task.actualMinutes));

    const hourBuckets = new Map<number, number>();
    focusSessions.forEach((session) => {
      const hour = new Date(session.startedAt).getHours();
      hourBuckets.set(hour, (hourBuckets.get(hour) || 0) + 1);
    });
    const bestHours = Array.from(hourBuckets.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      heatCells: buildHeatmap(focusSessions.map((session) => session.startedAt), 12),
      habitCells: buildHeatmap(habits.flatMap((habit) => habit.completedDates), 12),
      streak,
      level,
      weeklyTasks,
      weeklyFocus,
      taskGoal: settings?.weeklyTaskGoal ?? 20,
      focusGoal: settings?.weeklyFocusGoal ?? 300,
      averageEstimate,
      averageActual,
      betterEstimate,
      bestHours,
      badges: buildBadges({
        completedTasks: completed.length,
        focusMinutes,
        streak: streak.current,
        habitCompletions: habits.reduce(
          (sum, habit) => sum + habit.completedDates.length,
          0,
        ),
        reviews: reviews.length,
      }),
    };
  }, [tasks, pomodoros, settings, habits, reviews]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const header = (
    <ScreenHeader
      title={t('stats.title')}
      subtitle={t('stats.subtitle')}
      right={(
        <Pressable onPress={() => router.push('/focus-history')} hitSlop={10} style={{ padding: 8 }}>
          <History size={iconSize.xl} color={theme.primary[500]} />
        </Pressable>
      )}
    />
  );

  if (!hasData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {header}
        <View style={styles.empty}>
          <EmptyState
            icon={<BarChart3 size={iconSize.hero} color={theme.text.tertiary} />}
            title={t('stats.noData')}
            description={t('stats.noDataDesc')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {header}

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

        <Card padded={false} style={styles.overviewCard}>
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
        </Card>

        {/* Streak + level */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SectionHeader
            icon={<Flame size={iconSize.md} color={theme.warning} />}
            title={t('stats.momentum')}
            color={theme.warning}
            style={styles.sectionSpacing}
          />
          <View style={styles.momentumRow}>
            <View style={styles.momentumItem}>
              <Text style={[styles.momentumValue, { color: theme.warning, fontFamily: typography.fontFamilyBold }]}>
                {insightData.streak.current}
              </Text>
              <Text style={[styles.momentumLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('stats.currentStreak')}
              </Text>
            </View>
            <View style={[styles.momentumDivider, { backgroundColor: theme.border }]} />
            <View style={styles.momentumItem}>
              <Text style={[styles.momentumValue, { color: theme.accent[500], fontFamily: typography.fontFamilyBold }]}>
                {insightData.level.level}
              </Text>
              <Text style={[styles.momentumLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('stats.level')}
              </Text>
            </View>
            <View style={[styles.momentumDivider, { backgroundColor: theme.border }]} />
            <View style={styles.momentumItem}>
              <Text style={[styles.momentumValue, { color: theme.primary[500], fontFamily: typography.fontFamilyBold }]}>
                {insightData.streak.longest}
              </Text>
              <Text style={[styles.momentumLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('stats.bestStreak')}
              </Text>
            </View>
          </View>
          <View style={[styles.levelTrack, { backgroundColor: theme.surfaceTertiary }]}>
            <View
              style={[
                styles.levelFill,
                {
                  width: `${Math.round(insightData.level.progress * 100)}%`,
                  backgroundColor: theme.accent[500],
                },
              ]}
            />
          </View>
          <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {insightData.level.current}/{insightData.level.needed} XP
          </Text>
        </View>

        {/* Badges */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SectionHeader
            icon={<Award size={iconSize.md} color={theme.warning} />}
            title={t('stats.badges')}
            color={theme.warning}
            style={styles.sectionSpacing}
          />
          <View style={styles.badgeRow}>
            {insightData.badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeItem,
                  responsive.columns === 2 && { width: '30%' },
                  {
                    backgroundColor: badge.earned ? theme.warning + '1A' : theme.surfaceSecondary,
                    opacity: badge.earned ? 1 : 0.58,
                  },
                ]}
              >
                <Award size={16} color={badge.earned ? theme.warning : theme.text.tertiary} />
                <Text style={[styles.badgeTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t(`badge.${badge.id}.title` as Parameters<typeof t>[0])}
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t(`badge.${badge.id}.desc` as Parameters<typeof t>[0])}
                </Text>
                <View style={[styles.badgeTrack, { backgroundColor: theme.surfaceSecondary }]}>
                  <View
                    style={[
                      styles.badgeFill,
                      {
                        width: `${Math.min(100, (badge.value / badge.target) * 100)}%`,
                        backgroundColor: badge.earned ? theme.warning : theme.primary[500],
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {badge.value}/{badge.target}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Weekly goals */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SectionHeader
            icon={<Target size={iconSize.md} color={theme.success} />}
            title={t('stats.weeklyGoals')}
            color={theme.success}
            style={styles.sectionSpacing}
          />
          <View style={styles.goalRings}>
            <View style={styles.goalRingItem}>
              <ProgressRing
                progress={Math.min(100, (insightData.weeklyTasks / insightData.taskGoal) * 100)}
                size={92}
                strokeWidth={8}
                label={t('stats.tasksShort')}
              />
              <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {insightData.weeklyTasks}/{insightData.taskGoal}
              </Text>
            </View>
            <View style={styles.goalRingItem}>
              <ProgressRing
                progress={Math.min(100, (insightData.weeklyFocus / insightData.focusGoal) * 100)}
                size={92}
                strokeWidth={8}
                color={theme.secondary[500]}
                label={t('stats.minutesShort')}
              />
              <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {insightData.weeklyFocus}/{insightData.focusGoal}
              </Text>
            </View>
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
          <SectionHeader
            icon={<TrendingUp size={iconSize.md} color={theme.primary[500]} />}
            title={t('stats.weeklyActivity')}
            style={styles.sectionSpacing}
          />
          <View style={styles.chart}>
            {chartDays.map((day) => (
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
          <SectionHeader
            icon={<TrendingUp size={iconSize.md} color={theme.success} />}
            title={t('stats.completionTrend')}
            color={theme.success}
            style={styles.sectionSpacing}
          />
          <TrendChart values={trendValues} color={theme.success} />
          {bestDay ? (
            <Text style={[styles.trendHint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('stats.bestDay')}: {bestDay.label} — {bestDay.completed} {t('stats.done')}
            </Text>
          ) : null}
        </View>

        {stats.categories.length > 0 ? (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SectionHeader
              icon={<CheckSquare size={iconSize.md} color={theme.secondary[500]} />}
              title={t('stats.categoryBreakdown')}
              color={theme.secondary[500]}
              style={styles.sectionSpacing}
            />
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
                <Text style={[styles.categoryPercent, { color: theme.text.tertiary, fontFamily: typography.fontFamily, textAlign: isRTL ? 'left' : 'right' }]}>
                  {category.percent}%
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Focus consistency map */}
        <Card style={styles.section}>
          <SectionHeader
            icon={<Flame size={iconSize.md} color={theme.primary[500]} />}
            title={t('stats.focusMap')}
            style={styles.sectionSpacing}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HeatmapGrid cells={insightData.heatCells} baseColor={theme.primary[500]} />
          </ScrollView>
          <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('stats.focusMapHint')}
          </Text>
        </Card>

        {/* Habit consistency map */}
        {habits.length > 0 ? (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SectionHeader
              icon={<CheckSquare size={iconSize.md} color={theme.success} />}
              title={t('stats.habitMap')}
              color={theme.success}
              style={styles.sectionSpacing}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HeatmapGrid cells={insightData.habitCells} baseColor={theme.success} />
            </ScrollView>
            <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('stats.habitMapHint')}
            </Text>
          </View>
        ) : null}

        {/* Estimate accuracy */}
        {insightData.averageEstimate > 0 ? (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SectionHeader
              icon={<Clock size={iconSize.md} color={theme.secondary[500]} />}
              title={t('stats.estimateAccuracy')}
              color={theme.secondary[500]}
              style={styles.sectionSpacing}
            />
            <Text style={[styles.overviewText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
              {t('stats.avgEstimate')}: {insightData.averageEstimate} · {t('stats.avgActual')}: {insightData.averageActual}
            </Text>
            {insightData.betterEstimate ? (
              <Text style={[styles.trendHint, { color: theme.primary[500], fontFamily: typography.fontFamilySemiBold }]}>
                {t('stats.suggestEstimate')}: {insightData.betterEstimate} {t('common.min')}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Best focus hours */}
        {insightData.bestHours.length > 0 ? (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SectionHeader
              icon={<Timer size={iconSize.md} color={theme.accent[500]} />}
              title={t('stats.bestFocusTime')}
              color={theme.accent[500]}
              style={styles.sectionSpacing}
            />
            <View style={styles.hourRow}>
              {insightData.bestHours.map(([hour, count]) => (
                <View key={hour} style={[styles.hourChip, { backgroundColor: theme.primary[500] + '18' }]}>
                  <Text style={[styles.hourText, { color: theme.primary[500], fontFamily: typography.fontFamilyBold }]}>
                    {String(hour).padStart(2, '0')}:00
                  </Text>
                  <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                    {count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {stats.moods.length > 0 ? (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SectionHeader
              icon={<Smile size={iconSize.md} color={theme.accent[500]} />}
              title={t('stats.moodTrend')}
              color={theme.accent[500]}
              style={styles.sectionSpacing}
            />
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
          <Card style={styles.section}>
            <EmptyState compact title={t('stats.noReviews')} />
          </Card>
        )}

        {stats.recent.length > 0 ? (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SectionHeader
              icon={<Award size={iconSize.md} color={theme.warning} />}
              title={t('stats.recentActivity')}
              color={theme.warning}
              style={styles.sectionSpacing}
            />
            {stats.recent.map((task) => (
              <View key={task.id} style={styles.recentRow}>
                <View style={[styles.recentDot, { backgroundColor: theme.success }]}>
                  <CheckSquare size={14} color="#FFFFFF" />
                </View>
                <View style={styles.recentInfo}>
                  <Text numberOfLines={2} style={[styles.recentTitle, { color: theme.text.primary, fontFamily: typography.fontFamily }]}>
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
          <Card style={styles.section}>
            <EmptyState compact title={t('stats.noActivity')} />
          </Card>
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
    paddingBottom: bottomSpace.tab,
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
  sectionSpacing: {
    marginBottom: spacing.sm,
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
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 74,
  },
  bar: {
    flex: 1,
    maxWidth: 8,
    minWidth: 2,
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: typography.sizes.xs,
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
    fontSize: typography.sizes.md,
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
    lineHeight: typography.sizes.sm * 1.65,
  },
  recentDate: {
    fontSize: typography.sizes.xs,
  },
  momentumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  momentumItem: {
    alignItems: 'center',
    gap: 2,
  },
  momentumValue: {
    fontSize: typography.sizes.xl,
  },
  momentumLabel: {
    fontSize: typography.sizes.xs,
  },
  momentumDivider: {
    width: 1,
    height: 32,
  },
  levelTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    borderRadius: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeItem: {
    width: '47%',
    minHeight: 112,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: 3,
  },
  badgeTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  badgeFill: {
    height: '100%',
    borderRadius: 3,
  },
  badgeTitle: {
    fontSize: typography.sizes.sm,
  },
  goalRings: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  goalRingItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  hourRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hourChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  hourText: {
    fontSize: typography.sizes.sm,
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
