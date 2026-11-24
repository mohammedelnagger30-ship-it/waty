import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Alert, Share, Platform } from 'react-native';
import { ArrowLeft, CheckCircle2, Target, Flame, Save, CalendarRange, Sparkles, Copy } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { BackArrow } from '@/src/components/BackArrow';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context';
import { useI18n, type TranslationKey } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { Button, Card, Chip, Input, StatCard } from '@/src/components';
import {
  taskRepository,
  goalRepository,
  habitRepository,
  reviewRepository,
  weeklyReviewRepository,
  generateId,
  nowISO,
} from '@/src/storage';
import type { Task, Goal, Habit, DailyReview, WeeklyReview, ReviewMood } from '@/src/storage/entities';
import { buildWeeklySummary } from '@/src/utils/weeklySummary';

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export default function WeeklyReviewScreen() {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [reviews, setReviews] = useState<DailyReview[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([]);
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState('');

  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const startStr = useMemo(() => toISODate(weekStart), [weekStart]);
  const endStr = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return toISODate(d);
  }, [weekStart]);

  const load = useCallback(async () => {
    const [tks, gls, hbs, rvs, wrvs] = await Promise.all([
      taskRepository.getAll(),
      goalRepository.getAll(),
      habitRepository.getAll(),
      reviewRepository.getAll(),
      weeklyReviewRepository.getAll(),
    ]);
    setTasks(tks);
    setGoals(gls);
    setHabits(hbs);
    setReviews(rvs);
    setWeeklyReviews(wrvs);

    const current = wrvs.find((r) => r.weekStart === startStr);
    setWhatWentWell(current?.whatWentWell ?? '');
    setWhatToImprove(current?.whatToImprove ?? '');
    setNote(current?.note ?? '');
    setSummary('');
  }, [startStr]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const dueTasks = tasks.filter((task) => task.date >= startStr && task.date <= endStr);
    const completed = dueTasks.filter((task) => task.status === 'done').length;
    const completionRate = dueTasks.length ? Math.round((completed / dueTasks.length) * 100) : 0;
    const activeGoals = goals.filter((goal) => goal.status !== 'paused');
    const goalProgress = activeGoals.length
      ? Math.round(activeGoals.reduce((sum, goal) => sum + (goal.progress || 0), 0) / activeGoals.length)
      : 0;
    const habitRate = habits.length
      ? Math.round(
          (habits.reduce(
            (sum, habit) => sum + habit.completedDates.filter((d) => d >= startStr && d <= endStr).length,
            0,
          ) /
            (habits.length * 7)) *
            100,
        )
      : 0;
    const moods: ReviewMood[] = reviews
      .filter((review) => review.date >= startStr && review.date <= endStr)
      .map((review) => review.mood);
    return { due: dueTasks.length, completed, completionRate, goalProgress, habitRate, moods };
  }, [tasks, goals, habits, reviews, startStr, endStr]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const existing = weeklyReviews.find((r) => r.weekStart === startStr);
      const now = nowISO();
      const payload: WeeklyReview = {
        id: existing?.id ?? generateId(),
        weekStart: startStr,
        tasksCompleted: stats.completed,
        completionRate: stats.completionRate,
        goalProgress: stats.goalProgress,
        habitRate: stats.habitRate,
        moods: stats.moods,
        whatWentWell: whatWentWell.trim() || undefined,
        whatToImprove: whatToImprove.trim() || undefined,
        note: note.trim() || undefined,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      if (existing) {
        await weeklyReviewRepository.update(existing.id, payload);
      } else {
        await weeklyReviewRepository.create(payload);
      }
      await load();
      Alert.alert(t('weekly.title'), t('weekly.saved'));
    } catch {
      Alert.alert(t('weekly.title'), t('data.error'));
    } finally {
      setSaving(false);
    }
  }, [weeklyReviews, startStr, stats, whatWentWell, whatToImprove, note, load, t]);

  const previous = useMemo(
    () => weeklyReviews.filter((r) => r.weekStart !== startStr).sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, 6),
    [weeklyReviews, startStr],
  );

  const appendPrompt = (
    setter: (value: string | ((previous: string) => string)) => void,
    key: TranslationKey,
  ) => {
    setter((current) => (current.trim() ? `${current}\n${t(key)}` : t(key)));
  };

  const handleGenerateSummary = useCallback(() => {
    const text = buildWeeklySummary({
      language,
      startDate: startStr,
      endDate: endStr,
      completed: stats.completed,
      due: stats.due,
      completionRate: stats.completionRate,
      goalProgress: stats.goalProgress,
      habitRate: stats.habitRate,
      moods: stats.moods,
      wentWell: whatWentWell,
      improve: whatToImprove,
    });
    setSummary(text);
    setNote((current) => (current.trim() ? `${current.trim()}\n\n${text}` : text));
    Alert.alert(t('weekly.title'), t('weekly.summaryInNote'));
  }, [language, startStr, endStr, stats, whatWentWell, whatToImprove, t]);

  const handleShareSummary = useCallback(async () => {
    if (!summary) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        await Share.share({ message: summary });
      }
      Alert.alert(t('weekly.title'), t('weekly.summaryCopied'));
    } catch {
      // The user cancelled the share sheet — nothing to report.
    }
  }, [summary, t]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <BackArrow size={24} color={theme.text.primary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('weekly.title')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('weekly.subtitle')}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.weekBadge, { backgroundColor: theme.primary[500] + '18' }]}>
          <CalendarRange size={18} color={theme.primary[500]} />
          <Text style={[styles.weekBadgeText, { color: theme.primary[500], fontFamily: typography.fontFamilySemiBold }]}>
            {t('weekly.weekOf')} {startStr}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={<CheckCircle2 size={18} color={theme.primary[500]} />}
            label={t('weekly.completed')}
            value={stats.completed}
            color={theme.primary[500]}
          />
          <StatCard
            icon={<Target size={18} color={theme.accent[500]} />}
            label={t('weekly.rate')}
            value={`${stats.completionRate}%`}
            color={theme.accent[500]}
          />
          <StatCard
            icon={<Target size={18} color={theme.secondary[500]} />}
            label={t('weekly.goals')}
            value={`${stats.goalProgress}%`}
            color={theme.secondary[500]}
          />
          <StatCard
            icon={<Flame size={18} color={theme.warning} />}
            label={t('weekly.habits')}
            value={`${stats.habitRate}%`}
            color={theme.warning}
          />
        </View>

        <Card style={styles.section}>
          <View style={styles.summaryHeader}>
            <Sparkles size={18} color={theme.accent[500]} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('weekly.summary')}
            </Text>
          </View>
          <Text style={[styles.cardDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('weekly.summaryHint')}
          </Text>
          <Button
            variant="outline"
            onPress={handleGenerateSummary}
            icon={<Sparkles size={16} color={theme.primary[600]} />}
          >
            {t('weekly.generate')}
          </Button>
          {summary ? (
            <View style={[styles.summaryBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
              <Text style={[styles.summaryText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                {summary}
              </Text>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => void handleShareSummary()}
                icon={<Copy size={16} color={theme.primary[600]} />}
              >
                {t('weekly.copySummary')}
              </Button>
            </View>
          ) : null}
        </Card>

        {stats.moods.length > 0 ? (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('weekly.moods')}
            </Text>
            <View style={styles.moodRow}>
              {stats.moods.map((mood, index) => (
                <View key={index} style={[styles.moodChip, { backgroundColor: theme.surfaceSecondary }]}>
                  <Text style={[styles.moodText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                    {t(`review.mood.${mood}` as TranslationKey)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
            {t('weekly.reflection')}
          </Text>
          <Input
            label={t('weekly.well')}
            value={whatWentWell}
            onChangeText={setWhatWentWell}
            placeholder={t('weekly.well')}
            multiline
            numberOfLines={4}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptRow}>
            {(['weekly.prompt.well1', 'weekly.prompt.well2'] as TranslationKey[]).map((key) => (
              <Chip key={key} onPress={() => appendPrompt(setWhatWentWell, key)}>{t(key)}</Chip>
            ))}
          </ScrollView>
          <Input
            label={t('weekly.improve')}
            value={whatToImprove}
            onChangeText={setWhatToImprove}
            placeholder={t('weekly.improve')}
            multiline
            numberOfLines={4}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptRow}>
            {(['weekly.prompt.improve1', 'weekly.prompt.improve2'] as TranslationKey[]).map((key) => (
              <Chip key={key} onPress={() => appendPrompt(setWhatToImprove, key)}>{t(key)}</Chip>
            ))}
          </ScrollView>
          <Input
            label={t('weekly.note')}
            value={note}
            onChangeText={setNote}
            placeholder={t('weekly.note')}
            multiline
            numberOfLines={3}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptRow}>
            {(['weekly.prompt.note1'] as TranslationKey[]).map((key) => (
              <Chip key={key} onPress={() => appendPrompt(setNote, key)}>{t(key)}</Chip>
            ))}
          </ScrollView>
          <Button onPress={handleSave} loading={saving} icon={<Save size={18} color="#FFFFFF" />}>
            {t('weekly.save')}
          </Button>
        </Card>

        {previous.length > 0 ? (
          <View style={styles.previousSection}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('weekly.previous')}
            </Text>
            <Card style={styles.section} padded={false}>
              {previous.map((review, index) => (
                <View
                  key={review.id}
                  style={[
                    styles.previousRow,
                    { borderTopWidth: index === 0 ? 0 : 1, borderTopColor: theme.border },
                  ]}
                >
                  <Text style={[styles.previousDate, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                    {review.weekStart}
                  </Text>
                  <Text style={[styles.previousMeta, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                    {`${review.tasksCompleted} · ${review.completionRate}%`}
                  </Text>
                  {review.whatWentWell ? (
                    <Text numberOfLines={2} style={[styles.previousNote, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                      {review.whatWentWell}
                    </Text>
                  ) : null}
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  headerText: { flex: 1 },
  headerTitle: { fontSize: typography.sizes.lg },
  headerSubtitle: { fontSize: typography.sizes.xs },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  weekBadgeText: { fontSize: typography.sizes.sm },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  section: { marginBottom: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardDesc: { fontSize: typography.sizes.xs },
  summaryBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryText: { fontSize: typography.sizes.sm, lineHeight: 21 },
  promptRow: { flexDirection: 'row', marginTop: -spacing.xs },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  moodChip: { paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: 20 },
  moodText: { fontSize: typography.sizes.xs },
  previousSection: { marginTop: spacing.sm, gap: spacing.sm },
  previousRow: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: 2 },
  previousDate: { fontSize: typography.sizes.sm },
  previousMeta: { fontSize: typography.sizes.xs },
  previousNote: { fontSize: typography.sizes.xs },
});
