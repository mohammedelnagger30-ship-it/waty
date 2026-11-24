import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  CalendarPlus,
  Clock,
  X,
  Smile,
  Frown,
  Meh,
  Sparkles,
  BookOpen,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { BackArrow } from '@/src/components/BackArrow';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { taskRepository, reviewRepository } from '@/src/storage';
import { Task, TaskStatus, DailyReview, ReviewMood } from '@/src/storage/entities';
import { todayISODate, generateId, nowISO } from '@/src/storage/repository';
import { priorityColors, categoryColors, completeRepeatingTask } from '@/src/utils/taskUtils';
import { moveTaskToTomorrow } from '@/src/utils/rolloverUtils';
import { cancelTaskReminders, rescheduleTaskReminders, scheduleTaskReminders } from '@/src/notifications';
import { Card, Button, EmptyState } from '@/src/components';

const MOODS: { key: ReviewMood; icon: typeof Smile; color: string; arLabel: string; enLabel: string }[] = [
  { key: 'great', icon: Sparkles, color: '#22C55E', arLabel: 'ممتاز', enLabel: 'Great' },
  { key: 'good', icon: Smile, color: '#1A9FE8', arLabel: 'جيد', enLabel: 'Good' },
  { key: 'okay', icon: Meh, color: '#F59E0B', arLabel: 'عادي', enLabel: 'Okay' },
  { key: 'bad', icon: Frown, color: '#EF4444', arLabel: 'سيء', enLabel: 'Bad' },
];

export default function DailyReviewScreen() {
  const { theme, isDark } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState<ReviewMood | null>(null);
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [note, setNote] = useState('');
  const [existingReview, setExistingReview] = useState<DailyReview | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const today = todayISODate();

  const load = useCallback(async () => {
    const all = await taskRepository.getAll();
    setTasks(all.filter((t) => t.date === today));
    const reviews = await reviewRepository.getAll();
    const found = reviews.find((r) => r.date === today);
    if (found) {
      setExistingReview(found);
      setMood(found.mood);
      setWhatWentWell(found.whatWentWell ?? '');
      setWhatToImprove(found.whatToImprove ?? '');
      setNote(found.note ?? '');
    }
    setLoading(false);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const completedTasks = useMemo(() => tasks.filter((t) => t.status === 'done'), [tasks]);
  const notCompletedTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled' && t.status !== 'postponed'),
    [tasks],
  );
  const postponedTasks = useMemo(() => tasks.filter((t) => t.status === 'postponed'), [tasks]);

  const handleMoveTomorrow = async (task: Task) => {
    const updated = await moveTaskToTomorrow(task);
    if (updated) await rescheduleTaskReminders(updated);
    await load();
  };

  const handleMoveToDate = (task: Task) => {
    router.push(`/tasks/${task.id}`);
  };

  const handleMarkDone = async (task: Task) => {
    if (task.status !== 'done') {
      const { nextOccurrence, completed } = completeRepeatingTask(task);
      if (nextOccurrence) {
        await taskRepository.create(nextOccurrence);
        await scheduleTaskReminders(nextOccurrence);
      }
      await taskRepository.update(task.id, completed);
    }
    await cancelTaskReminders(task.id);
    await load();
  };

  const handleCancelTask = async (task: Task) => {
    await taskRepository.update(task.id, { status: 'cancelled' as TaskStatus });
    await cancelTaskReminders(task.id);
    await load();
  };

  const handleMoveAllTomorrow = () => {
    Alert.alert(t('review.moveAllTomorrow'), t('review.moveAllConfirmMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('review.moveAllConfirm'),
        onPress: async () => {
          for (const task of notCompletedTasks) {
            const updated = await moveTaskToTomorrow(task);
            if (updated) await rescheduleTaskReminders(updated);
          }
          await load();
        },
      },
    ]);
  };

  const handleSaveReflection = async () => {
    if (!mood) {
      Alert.alert(t('review.mood'), t('review.mood'));
      return;
    }
    setSaving(true);
    const reviewData = {
      mood,
      whatWentWell: whatWentWell.trim() || undefined,
      whatToImprove: whatToImprove.trim() || undefined,
      note: note.trim() || undefined,
      completedTaskIds: completedTasks.map((t) => t.id),
    };

    if (existingReview) {
      await reviewRepository.update(existingReview.id, {
        ...reviewData,
        updatedAt: nowISO(),
      });
    } else {
      const review: DailyReview = {
        id: generateId(),
        date: today,
        ...reviewData,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      await reviewRepository.create(review);
    }

    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const renderTaskItem = (task: Task, actions?: React.ReactNode) => {
    const pColor = priorityColors[task.priority];
    const color = isDark ? pColor.dark : pColor.light;
    const catColor = categoryColors[task.category];
    const isDone = task.status === 'done';

    return (
      <View
        key={task.id}
        style={[styles.taskItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <View style={[styles.taskPriorityBar, { backgroundColor: color }]} />
        <View style={styles.taskItemContent}>
          <View style={styles.taskItemTop}>
            <Pressable
              hitSlop={8}
              onPress={() => !isDone && handleMarkDone(task)}
              style={[
                styles.checkbox,
                { borderColor: isDone ? theme.success : color, backgroundColor: isDone ? theme.success : 'transparent' },
              ]}
            >
              {isDone ? <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={3} /> : null}
            </Pressable>
            <Pressable onPress={() => router.push(`/tasks/${task.id}`)} style={styles.taskTitleArea}>
              <Text
                numberOfLines={2}
                style={[
                  styles.taskTitle,
                  { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold, textDecorationLine: isDone ? 'line-through' : 'none' },
                ]}
              >
                {task.title}
              </Text>
              <View style={styles.taskItemMeta}>
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
                  <View style={[styles.rolloverBadge, { backgroundColor: theme.warning + '22' }]}>
                    <Text style={[styles.rolloverText, { color: theme.warning, fontFamily: typography.fontFamilySemiBold }]}>
                      {(task.rolloverCount ?? 0)}x
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>
          {actions && <View style={styles.taskActions}>{actions}</View>}
        </View>
      </View>
    );
  };

  const renderActionBtn = (
    icon: React.ReactNode,
    label: string,
    onPress: () => void,
    color: string,
  ) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: color + '15', borderColor: color + '30', opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {icon}
      <Text style={[styles.actionBtnText, { color, fontFamily: typography.fontFamilySemiBold }]}>
        {label}
      </Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.text.tertiary, fontFamily: typography.fontFamily }}>
            {t('common.loading')}
          </Text>
        </View>
      </View>
    );
  }

  const hasTasks = tasks.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <BackArrow size={24} color={theme.text.primary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {t('review.title')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('review.subtitle')}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!hasTasks ? (
            <EmptyState
              icon={<BookOpen size={36} color={theme.text.tertiary} />}
              title={t('review.noTasksToday')}
              description={t('review.noTasksTodayDesc')}
            />
          ) : (
            <>
              {/* Completed */}
              <Text style={[styles.groupLabel, { color: theme.success, fontFamily: typography.fontFamilyBold }]}>
                {t('review.completed')} ({completedTasks.length})
              </Text>
              <View style={styles.groupContainer}>
                {completedTasks.length > 0 ? (
                  completedTasks.map((task) => renderTaskItem(task))
                ) : (
                  <Text style={[styles.emptyGroupText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                    —
                  </Text>
                )}
              </View>

              {/* Not Completed */}
              <Text style={[styles.groupLabel, { color: theme.warning, fontFamily: typography.fontFamilyBold }]}>
                {t('review.notCompleted')} ({notCompletedTasks.length})
              </Text>
              {notCompletedTasks.length > 0 && (
                <Button
                  variant="secondary"
                  fullWidth
                  onPress={handleMoveAllTomorrow}
                  icon={<CalendarPlus size={18} color="#FFFFFF" />}
                  style={{ marginBottom: spacing.sm }}
                >
                  {t('review.moveAllTomorrow')}
                </Button>
              )}
              <View style={styles.groupContainer}>
                {notCompletedTasks.length > 0 ? (
                  notCompletedTasks.map((task) =>
                    renderTaskItem(
                      task,
                      <View style={styles.actionsRow}>
                        {renderActionBtn(
                          <CalendarPlus size={14} color={theme.primary[500]} />,
                          t('review.moveTomorrow'),
                          () => handleMoveTomorrow(task),
                          theme.primary[500],
                        )}
                        {renderActionBtn(
                          <Calendar size={14} color={theme.secondary[500]} />,
                          t('review.moveDate'),
                          () => handleMoveToDate(task),
                          theme.secondary[500],
                        )}
                        {renderActionBtn(
                          <CheckCircle2 size={14} color={theme.success} />,
                          t('review.markDone'),
                          () => handleMarkDone(task),
                          theme.success,
                        )}
                        {renderActionBtn(
                          <X size={14} color={theme.error} />,
                          t('review.cancelTask'),
                          () => handleCancelTask(task),
                          theme.error,
                        )}
                      </View>,
                    ),
                  )
                ) : (
                  <Text style={[styles.emptyGroupText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                    —
                  </Text>
                )}
              </View>

              {/* Postponed */}
              {postponedTasks.length > 0 && (
                <>
                  <Text style={[styles.groupLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamilyBold }]}>
                    {t('review.postponed')} ({postponedTasks.length})
                  </Text>
                  <View style={styles.groupContainer}>
                    {postponedTasks.map((task) => renderTaskItem(task))}
                  </View>
                </>
              )}

              {/* Reflection */}
              <View style={styles.reflectionHeader}>
                <BookOpen size={18} color={theme.accent[500]} />
                <Text style={[styles.reflectionTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                  {t('review.reflection')}
                </Text>
              </View>

              <Card style={styles.reflectionCard}>
                {/* Mood selector */}
                <Text style={[styles.reflectionLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('review.mood')}
                </Text>
                <View style={styles.moodRow}>
                  {MOODS.map((m) => {
                    const Icon = m.icon;
                    const selected = mood === m.key;
                    return (
                      <Pressable
                        key={m.key}
                        onPress={() => setMood(m.key)}
                        style={[
                          styles.moodBtn,
                          {
                            backgroundColor: selected ? m.color + '22' : theme.surfaceSecondary,
                            borderColor: selected ? m.color : 'transparent',
                          },
                        ]}
                      >
                        <Icon size={24} color={m.color} />
                        <Text style={[styles.moodLabel, { color: selected ? m.color : theme.text.tertiary, fontFamily: typography.fontFamilySemiBold }]}>
                          {language === 'ar' ? m.arLabel : m.enLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* What went well */}
                <Text style={[styles.reflectionLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold, marginTop: spacing.md }]}>
                  {t('review.whatWentWell')}
                </Text>
                <TextInput
                  value={whatWentWell}
                  onChangeText={setWhatWentWell}
                  placeholder="..."
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  style={[styles.reflectionInput, { color: theme.text.primary, fontFamily: typography.fontFamily, borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}
                />

                {/* What to improve */}
                <Text style={[styles.reflectionLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold, marginTop: spacing.md }]}>
                  {t('review.whatToImprove')}
                </Text>
                <TextInput
                  value={whatToImprove}
                  onChangeText={setWhatToImprove}
                  placeholder="..."
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  style={[styles.reflectionInput, { color: theme.text.primary, fontFamily: typography.fontFamily, borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}
                />

                {/* Note */}
                <Text style={[styles.reflectionLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold, marginTop: spacing.md }]}>
                  {t('review.note')}
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="..."
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  style={[styles.reflectionInput, { color: theme.text.primary, fontFamily: typography.fontFamily, borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}
                />

                <Button
                  variant="primary"
                  fullWidth
                  loading={saving}
                  onPress={handleSaveReflection}
                  style={{ marginTop: spacing.lg }}
                >
                  {savedFlash ? t('review.reflectionSaved') : t('review.saveReflection')}
                </Button>
              </Card>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  groupLabel: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  groupContainer: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  emptyGroupText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
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
  taskItemContent: {
    flex: 1,
    padding: spacing.sm + 2,
    gap: spacing.xs,
  },
  taskItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  taskTitleArea: {
    flex: 1,
    gap: 3,
  },
  taskTitle: {
    fontSize: typography.sizes.sm,
  },
  taskItemMeta: {
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
    fontSize: 10,
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
  rolloverBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  rolloverText: {
    fontSize: 10,
  },
  taskActions: {
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 10,
  },
  reflectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  reflectionTitle: {
    fontSize: typography.sizes.lg,
  },
  reflectionCard: {
    gap: spacing.xs,
  },
  reflectionLabel: {
    fontSize: typography.sizes.sm,
  },
  moodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  moodLabel: {
    fontSize: 10,
  },
  reflectionInput: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.sm,
    minHeight: 60,
    textAlignVertical: 'top',
    marginTop: spacing.xs,
  },
});
