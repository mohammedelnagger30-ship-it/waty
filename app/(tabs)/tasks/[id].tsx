import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  Clock,
  Calendar,
  Flag,
  Tag as TagIcon,
  Repeat as RepeatIcon,
  StickyNote,
  Timer,
  Pencil,
  Trash2,
  Plus,
  Circle,
  Copy,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BackArrow } from '@/src/components/BackArrow';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';
import { ProgressBar } from '@/src/components/ProgressBar';
import { PomodoroTimer } from '@/src/components/PomodoroTimer';
import { TaskFormModal } from '@/src/components/TaskFormModal';
import { taskRepository, generateId } from '@/src/storage';
import { Task, TaskStatus, Subtask } from '@/src/storage/entities';
import { cancelTaskReminders, rescheduleTaskReminders, scheduleTaskReminders } from '@/src/notifications';
import {
  priorityColors,
  categoryColors,
  formatDateDisplay,
  getSubtaskProgress,
  allStatuses,
  createSubtask,
  completeRepeatingTask,
} from '@/src/utils/taskUtils';

export default function TaskDetailScreen() {
  const { theme, isDark } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  const loadTask = useCallback(async () => {
    if (!id) return;
    const found = await taskRepository.getById(id);
    setTask(found);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { void loadTask(); }, [loadTask]));

  const notify = async (work: () => Promise<unknown>) => {
    try { await work(); } catch { /* notifications are best-effort */ }
  };

  const confirmAndDelete = (deleteId: string) => {
    Alert.alert(t('tasks.confirmDelete'), t('tasks.confirmDeleteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await taskRepository.delete(deleteId);
          await notify(() => cancelTaskReminders(deleteId));
          if (router.canGoBack()) router.back();
          else router.replace('/tasks');
        },
      },
    ]);
  };

  const handleStatusChange = async (status: TaskStatus) => {
    if (!task) return;
    if (status === 'done' && task.status !== 'done') {
      const { nextOccurrence, completed } = completeRepeatingTask(task);
      if (nextOccurrence) {
        await taskRepository.create(nextOccurrence);
        await notify(() => scheduleTaskReminders(nextOccurrence));
      }
      await taskRepository.update(task.id, completed);
      await notify(() => cancelTaskReminders(task.id));
    } else {
      const updates: Partial<Task> = { status };
      if (status === 'done') updates.completedAt = new Date().toISOString();
      const updated = await taskRepository.update(task.id, updates);
      if (updated) {
        if (status === 'done' || status === 'cancelled') {
          await notify(() => cancelTaskReminders(task.id));
        } else {
          await notify(() => rescheduleTaskReminders(updated));
        }
      }
    }
    await loadTask();
  };

  const handleSave = async (updated: Task) => {
    await taskRepository.update(updated.id, updated);
    await notify(() => rescheduleTaskReminders(updated));
    await loadTask();
  };

  const handleDelete = () => {
    if (task) confirmAndDelete(task.id);
  };

  const handleDuplicate = async () => {
    if (!task) return;
    const now = new Date().toISOString();
    const duplicate: Task = {
      ...task,
      id: generateId(),
      title: `${task.title} (نسخة)`,
      status: 'pending',
      completedAt: undefined,
      subtasks: task.subtasks.map((s) => ({ ...s, id: generateId(), done: false })),
      createdAt: now,
      updatedAt: now,
    };
    const created = await taskRepository.create(duplicate);
    await notify(() => scheduleTaskReminders(created));
    router.replace(`/tasks/${created.id}` as any);
  };

  const handleTimeUpdate = async (addedMinutes: number) => {
    if (!task) return;
    await taskRepository.update(task.id, {
      actualMinutes: task.actualMinutes + addedMinutes,
    });
    await loadTask();
  };

  const handleSessionComplete = async () => {
    if (!task) return;
    await taskRepository.update(task.id, {
      pomodoroSessions: task.pomodoroSessions + 1,
    });
    await loadTask();
  };

  const toggleSubtask = async (subtaskId: string) => {
    if (!task) return;
    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, done: !s.done } : s,
    );
    await taskRepository.update(task.id, { subtasks: updatedSubtasks });
    await loadTask();
  };

  const addSubtask = async () => {
    if (!task || !newSubtask.trim()) return;
    const st = createSubtask(newSubtask.trim());
    await taskRepository.update(task.id, {
      subtasks: [...task.subtasks, st],
    });
    setNewSubtask('');
    setShowSubtaskInput(false);
    await loadTask();
  };

  const removeSubtask = async (subtaskId: string) => {
    if (!task) return;
    await taskRepository.update(task.id, {
      subtasks: task.subtasks.filter((item) => item.id !== subtaskId),
    });
    await loadTask();
  };

  const saveNotes = async () => {
    if (!task) return;
    await taskRepository.update(task.id, { notes: notesDraft.trim() || undefined });
    setEditingNotes(false);
    await loadTask();
  };

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

  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.text.tertiary, fontFamily: typography.fontFamily }}>
            {t('common.error')}
          </Text>
          <Button variant="primary" onPress={() => router.back()} style={{ marginTop: spacing.md }}>
            {t('common.back')}
          </Button>
        </View>
      </View>
    );
  }

  const priorityColor = priorityColors[task.priority];
  const color = isDark ? priorityColor.dark : priorityColor.light;
  const catColor = categoryColors[task.category];
  const subProgress = getSubtaskProgress(task);
  const categoryLabel =
    task.category === 'custom' && task.customCategory
      ? task.customCategory
      : t(`tasks.category.${task.category}` as Parameters<typeof t>[0]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }}>
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <BackArrow size={24} color={theme.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
            {t('tasks.detail')}
          </Text>
          <View style={styles.headerActions}>
            <Pressable onPress={handleDuplicate} hitSlop={12} style={styles.headerAction}>
              <Copy size={20} color={theme.secondary[500]} />
            </Pressable>
            <Pressable onPress={() => setShowEdit(true)} hitSlop={12} style={styles.headerAction}>
              <Pencil size={20} color={theme.text.secondary} />
            </Pressable>
            <Pressable onPress={handleDelete} hitSlop={12} style={styles.headerAction}>
              <Trash2 size={20} color={theme.error} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Priority */}
        <Card style={styles.titleCard}>
          <View style={[styles.priorityBar, { backgroundColor: color }]} />
          <View style={styles.titleContent}>
            <Text
              style={[
                styles.taskTitle,
                {
                  color: theme.text.primary,
                  fontFamily: typography.fontFamilyBold,
                  textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
                },
              ]}
            >
              {task.title}
            </Text>
            {task.description && (
              <Text style={[styles.taskDesc, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                {task.description}
              </Text>
            )}
          </View>
        </Card>

        {/* Status selector */}
        <Text style={[styles.sectionLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
          {t('tasks.sort.status')}
        </Text>
        <View style={styles.statusRow}>
          {allStatuses.map((s) => (
            <Chip
              key={s}
              selected={task.status === s}
              color={
                s === 'done'
                  ? theme.success
                  : s === 'cancelled'
                  ? theme.error
                  : s === 'postponed'
                  ? theme.warning
                  : s === 'in_progress'
                  ? theme.primary[500]
                  : theme.text.tertiary
              }
              onPress={() => handleStatusChange(s)}
            >
              {t(`tasks.status.${s}` as Parameters<typeof t>[0])}
            </Chip>
          ))}
        </View>

        {/* Info grid */}
        <Card style={styles.infoCard}>
          <InfoRow icon={<Calendar size={18} color={theme.text.tertiary} />} label={t('tasks.field.date')} value={formatDateDisplay(task.date, language)} theme={theme} />
          {task.time && (
            <InfoRow icon={<Clock size={18} color={theme.text.tertiary} />} label={t('tasks.field.time')} value={task.time} theme={theme} />
          )}
          {task.estimatedMinutes != null && task.estimatedMinutes > 0 && (
            <InfoRow icon={<Timer size={18} color={theme.text.tertiary} />} label={t('tasks.estimatedTime')} value={`${task.estimatedMinutes} ${t('tasks.minutes')}`} theme={theme} />
          )}
          {task.deadline && (
            <InfoRow icon={<Flag size={18} color={theme.text.tertiary} />} label={t('tasks.field.deadline')} value={formatDateDisplay(task.deadline, language)} theme={theme} />
          )}
          <InfoRow icon={<Flag size={18} color={color} />} label={t('tasks.field.priority')} value={t(`tasks.priority.${task.priority}` as Parameters<typeof t>[0])} theme={theme} />
          <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <View style={[styles.categoryDotLarge, { backgroundColor: catColor }]} />
            <Text style={[styles.infoLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('tasks.field.category')}
            </Text>
            <Text style={[styles.infoValue, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
              {categoryLabel}
            </Text>
          </View>
          {task.repeat !== 'none' && (
            <InfoRow icon={<RepeatIcon size={18} color={theme.text.tertiary} />} label={t('tasks.field.repeat')} value={t(`tasks.repeat.${task.repeat}` as Parameters<typeof t>[0])} theme={theme} />
          )}
          {task.actualMinutes > 0 && (
            <InfoRow icon={<Timer size={18} color={theme.success} />} label={t('tasks.actualTime')} value={`${task.actualMinutes} ${t('tasks.minutes')}`} theme={theme} />
          )}
        </Card>

        {/* Tags */}
        {task.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.field.tags')}
            </Text>
            <View style={styles.tagsRow}>
              {task.tags.map((tag) => (
                <View key={tag} style={[styles.tagPill, { backgroundColor: theme.surfaceSecondary }]}>
                  <TagIcon size={12} color={theme.text.tertiary} />
                  <Text style={[styles.tagText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Subtasks */}
        <View style={styles.section}>
          <View style={styles.subtaskHeader}>
            <Text style={[styles.sectionLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.field.subtasks')}
            </Text>
            {task.subtasks.length > 0 && (
              <Text style={[styles.subtaskProgress, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
              </Text>
            )}
          </View>

          {task.subtasks.length > 0 && (
            <ProgressBar progress={subProgress} color={theme.primary[500]} height={6} />
          )}

          <View style={styles.subtaskList}>
            {task.subtasks.map((st: Subtask) => (
              <View
                key={st.id}
                style={[styles.subtaskItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Pressable onPress={() => toggleSubtask(st.id)} style={styles.subtaskToggle}>
                  {st.done ? (
                    <View style={[styles.subtaskCheck, { backgroundColor: theme.primary[500] }]}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : (
                    <Circle size={20} color={theme.borderStrong} strokeWidth={2} />
                  )}
                  <Text
                    style={[
                      styles.subtaskTitle,
                      {
                        color: st.done ? theme.text.tertiary : theme.text.primary,
                        fontFamily: typography.fontFamily,
                        textDecorationLine: st.done ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {st.title}
                  </Text>
                </Pressable>
                <Pressable onPress={() => removeSubtask(st.id)} hitSlop={8} style={styles.subtaskDelete}>
                  <Trash2 size={16} color={theme.error} />
                </Pressable>
              </View>
            ))}
          </View>

          {showSubtaskInput ? (
            <View style={[styles.subtaskInputRow, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
              <TextInput
                value={newSubtask}
                onChangeText={setNewSubtask}
                placeholder={t('tasks.subtasks.add')}
                placeholderTextColor={theme.text.tertiary}
                autoFocus
                style={[styles.subtaskInput, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
                onSubmitEditing={addSubtask}
              />
              <Pressable onPress={addSubtask} hitSlop={8}>
                <Plus size={20} color={theme.primary[500]} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowSubtaskInput(true)}
              style={[styles.addSubtaskBtn, { borderColor: theme.border }]}
            >
              <Plus size={18} color={theme.text.tertiary} />
              <Text style={[styles.addSubtaskText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('tasks.subtasks.add')}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Notes — editable inline */}
        <View style={styles.section}>
          <View style={styles.subtaskHeader}>
            <Text style={[styles.sectionLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.field.notes')}
            </Text>
            {!editingNotes && (
              <Pressable
                onPress={() => {
                  setNotesDraft(task.notes ?? '');
                  setEditingNotes(true);
                }}
                hitSlop={8}
              >
                <Pencil size={16} color={theme.primary[500]} />
              </Pressable>
            )}
          </View>
          <Card style={styles.notesCard}>
            {editingNotes ? (
              <View style={styles.notesEdit}>
                <TextInput
                  value={notesDraft}
                  onChangeText={setNotesDraft}
                  placeholder={t('tasks.field.notes')}
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  numberOfLines={5}
                  autoFocus
                  style={[styles.notesInput, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
                />
                <View style={styles.notesActions}>
                  <Button size="sm" variant="ghost" onPress={() => setEditingNotes(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button size="sm" onPress={saveNotes}>
                    {t('common.save')}
                  </Button>
                </View>
              </View>
            ) : (
              <View style={styles.notesRow}>
                <StickyNote size={18} color={theme.text.tertiary} />
                <Text style={[styles.notesText, { color: task.notes ? theme.text.primary : theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {task.notes || t('tasks.noNotes')}
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Pomodoro Timer */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('pomodoro.title')}
          </Text>
          <PomodoroTimer
            taskId={task.id}
            taskTitle={task.title}
            estimatedMinutes={task.estimatedMinutes}
            actualMinutes={task.actualMinutes}
            sessionsCompleted={task.pomodoroSessions}
            onTimeUpdate={handleTimeUpdate}
            onSessionComplete={handleSessionComplete}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <TaskFormModal
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={handleSave}
        onDelete={(delId) => confirmAndDelete(delId)}
        editingTask={task}
      />
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <Text style={[styles.infoLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
        {label}
      </Text>
      <Text style={[styles.infoValue, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
        {value}
      </Text>
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
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerAction: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 80,
  },
  titleCard: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    padding: 0,
    overflow: 'hidden',
  },
  priorityBar: {
    width: 5,
  },
  titleContent: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  taskTitle: {
    fontSize: typography.sizes.xl,
    lineHeight: typography.sizes.xl * 1.3,
  },
  taskDesc: {
    fontSize: typography.sizes.md,
    lineHeight: typography.sizes.md * 1.5,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  infoCard: {
    gap: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    marginLeft: 'auto',
  },
  infoDivider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  categoryDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: typography.sizes.sm,
  },
  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  subtaskProgress: {
    fontSize: typography.sizes.sm,
  },
  subtaskList: {
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  subtaskToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtaskDelete: {
    padding: spacing.xs,
  },
  subtaskCheck: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskTitle: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  addSubtaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: spacing.sm,
  },
  addSubtaskText: {
    fontSize: typography.sizes.sm,
  },
  subtaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginTop: spacing.sm,
  },
  subtaskInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    paddingVertical: spacing.xs,
  },
  notesCard: {
    padding: spacing.md,
  },
  notesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  notesText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.5,
  },
  notesEdit: {
    gap: spacing.sm,
  },
  notesInput: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.5,
    textAlignVertical: 'top',
    minHeight: 90,
  },
  notesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
