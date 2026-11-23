import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Plus, X, Check, Trash2, Clock, Calendar, Tag as TagIcon, Repeat, StickyNote, ListChecks } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { ModalSheet } from './ModalSheet';
import { Button } from './Button';
import { Chip } from './Chip';
import { Input } from './Input';
import { Task, TaskPriority, TaskCategory, RepeatType, Subtask } from '@/src/storage/entities';
import {
  createDefaultTask,
  createSubtask,
  allCategories,
  allPriorities,
  allRepeatTypes,
  weekDays,
  priorityColors,
  categoryColors,
} from '@/src/utils/taskUtils';

interface TaskFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (id: string) => void;
  editingTask?: Task | null;
  initialTask?: Task | null;
}

const weekDayLabelsAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const weekDayLabelsEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TaskFormModal({ visible, onClose, onSave, onDelete, editingTask, initialTask }: TaskFormModalProps) {
  const { theme, isDark } = useTheme();
  const { t, language } = useI18n();
  const scrollRef = useRef<ScrollView>(null);

  const [task, setTask] = useState<Task>(createDefaultTask());
  const [tagInput, setTagInput] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [showCustomCat, setShowCustomCat] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingTask) {
        setTask({ ...editingTask });
        setShowCustomCat(editingTask.category === 'custom');
      } else {
        setTask(initialTask ? { ...initialTask } : createDefaultTask());
        setShowCustomCat(initialTask?.category === 'custom');
      }
      setTagInput('');
      setSubtaskInput('');
    }
  }, [visible, editingTask, initialTask]);

  const update = (updates: Partial<Task>) => setTask((prev) => ({ ...prev, ...updates }));

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !task.tags.includes(trimmed)) {
      update({ tags: [...task.tags, trimmed] });
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    update({ tags: task.tags.filter((t) => t !== tag) });
  };

  const addSubtask = () => {
    const trimmed = subtaskInput.trim();
    if (trimmed) {
      update({ subtasks: [...task.subtasks, createSubtask(trimmed)] });
    }
    setSubtaskInput('');
  };

  const toggleSubtask = (id: string) => {
    update({
      subtasks: task.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    });
  };

  const removeSubtask = (id: string) => {
    update({ subtasks: task.subtasks.filter((s) => s.id !== id) });
  };

  const toggleRepeatDay = (day: number) => {
    const days = task.repeatDays ?? [];
    update({
      repeatDays: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort(),
    });
  };

  const handleSave = () => {
    if (!task.title.trim()) return;
    onSave({ ...task, title: task.title.trim(), updatedAt: new Date().toISOString() });
    onClose();
  };

  const handleDelete = () => {
    if (editingTask && onDelete) {
      onDelete(editingTask.id);
      onClose();
    }
  };

  const weekLabels = language === 'ar' ? weekDayLabelsAr : weekDayLabelsEn;
  const isEditing = !!editingTask;

  return (
    <ModalSheet visible={visible} onClose={onClose} title={isEditing ? t('tasks.edit') : t('tasks.new')}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Input
            value={task.title}
            onChangeText={(v) => update({ title: v })}
            placeholder={t('tasks.field.title')}
            label={t('tasks.field.title')}
          />

          {/* Description */}
          <View style={styles.fieldGap}>
            <Input
              value={task.description ?? ''}
              onChangeText={(v) => update({ description: v })}
              placeholder={t('tasks.field.description')}
              label={t('tasks.field.description')}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Most Important Task */}
          <View style={styles.fieldGap}>
            <Text style={[styles.fieldLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.mitLabel')}
            </Text>
            <Chip selected={!!task.isMIT} onPress={() => update({ isMIT: !task.isMIT })}>
              {t('tasks.mit')}
            </Chip>
          </View>

          {/* Date & Time row */}
          <View style={[styles.row, styles.fieldGap]}>
            <View style={styles.flex1}>
              <Text style={[styles.fieldLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('tasks.field.date')}
              </Text>
              <View style={[styles.dateInput, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radius.md }]}>
                <Calendar size={18} color={theme.text.tertiary} style={{ marginEnd: spacing.sm }} />
                <TextInput
                  value={task.date}
                  onChangeText={(v) => update({ date: v })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.text.tertiary}
                  style={[styles.textInput, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
                />
              </View>
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.fieldLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('tasks.field.time')}
              </Text>
              <View style={[styles.dateInput, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radius.md }]}>
                <Clock size={18} color={theme.text.tertiary} style={{ marginEnd: spacing.sm }} />
                <TextInput
                  value={task.time ?? ''}
                  onChangeText={(v) => update({ time: v })}
                  placeholder="HH:mm"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.textInput, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
                />
              </View>
            </View>
          </View>

          {/* Estimated duration & Deadline row */}
          <View style={[styles.row, styles.fieldGap]}>
            <View style={styles.flex1}>
              <Text style={[styles.fieldLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('tasks.field.duration')}
              </Text>
              <View style={[styles.dateInput, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radius.md }]}>
                <TextInput
                  value={task.estimatedMinutes ? String(task.estimatedMinutes) : ''}
                  onChangeText={(v) => update({ estimatedMinutes: v ? parseInt(v, 10) || 0 : undefined })}
                  placeholder="0"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="numeric"
                  style={[styles.textInput, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
                />
              </View>
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.fieldLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('tasks.field.deadline')}
              </Text>
              <View style={[styles.dateInput, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radius.md }]}>
                <Calendar size={18} color={theme.text.tertiary} style={{ marginEnd: spacing.sm }} />
                <TextInput
                  value={task.deadline ?? ''}
                  onChangeText={(v) => update({ deadline: v || undefined })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.text.tertiary}
                  style={[styles.textInput, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
                />
              </View>
            </View>
          </View>

          {/* Priority */}
          <View style={styles.fieldGap}>
            <Text style={[styles.fieldLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.field.priority')}
            </Text>
            <View style={styles.chipRow}>
              {allPriorities.map((p) => {
                const pc = priorityColors[p];
                const color = isDark ? pc.dark : pc.light;
                return (
                  <Chip
                    key={p}
                    selected={task.priority === p}
                    color={color}
                    onPress={() => update({ priority: p })}
                  >
                    {t(`tasks.priority.${p}` as Parameters<typeof t>[0])}
                  </Chip>
                );
              })}
            </View>
          </View>

          {/* Category */}
          <View style={styles.fieldGap}>
            <Text style={[styles.fieldLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.field.category')}
            </Text>
            <View style={styles.chipRow}>
              {allCategories.map((c) => (
                <Chip
                  key={c}
                  selected={task.category === c}
                  color={categoryColors[c]}
                  onPress={() => {
                    update({ category: c });
                    setShowCustomCat(c === 'custom');
                  }}
                >
                  {t(`tasks.category.${c}` as Parameters<typeof t>[0])}
                </Chip>
              ))}
            </View>
            {showCustomCat && (
              <View style={{ marginTop: spacing.sm }}>
                <Input
                  value={task.customCategory ?? ''}
                  onChangeText={(v) => update({ customCategory: v })}
                  placeholder={t('tasks.field.customCategory')}
                />
              </View>
            )}
          </View>

          {/* Tags */}
          <View style={styles.fieldGap}>
            <Text style={[styles.fieldLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.field.tags')}
            </Text>
            <View style={[styles.tagInputRow, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radius.md }]}>
              <TagIcon size={18} color={theme.text.tertiary} style={{ marginEnd: spacing.sm }} />
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder={t('tasks.tags.placeholder')}
                placeholderTextColor={theme.text.tertiary}
                style={[styles.textInput, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
            </View>
            {task.tags.length > 0 && (
              <View style={[styles.chipRow, { marginTop: spacing.sm }]}>
                {task.tags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => removeTag(tag)}
                    style={[styles.tagPill, { backgroundColor: theme.surfaceTertiary }]}
                  >
                    <Text style={[styles.tagPillText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                      #{tag}
                    </Text>
                    <X size={12} color={theme.text.tertiary} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Subtasks */}
          <View style={styles.fieldGap}>
            <Text style={[styles.fieldLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.field.subtasks')}
            </Text>
            <View style={[styles.tagInputRow, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderRadius: radius.md }]}>
              <ListChecks size={18} color={theme.text.tertiary} style={{ marginEnd: spacing.sm }} />
              <TextInput
                value={subtaskInput}
                onChangeText={setSubtaskInput}
                placeholder={t('tasks.subtasks.add')}
                placeholderTextColor={theme.text.tertiary}
                style={[styles.textInput, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
                onSubmitEditing={addSubtask}
                returnKeyType="done"
              />
              {subtaskInput.trim() ? (
                <Pressable onPress={addSubtask} hitSlop={8}>
                  <Plus size={20} color={theme.primary[500]} />
                </Pressable>
              ) : null}
            </View>
            {task.subtasks.length > 0 && (
              <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                {task.subtasks.map((st: Subtask) => (
                  <View key={st.id} style={[styles.subtaskItem, { backgroundColor: theme.surfaceSecondary, borderRadius: radius.md }]}>
                    <Pressable
                      hitSlop={8}
                      onPress={() => toggleSubtask(st.id)}
                      style={[
                        styles.subtaskCheckbox,
                        {
                          borderColor: st.done ? theme.primary[500] : theme.borderStrong,
                          backgroundColor: st.done ? theme.primary[500] : 'transparent',
                        },
                      ]}
                    >
                      {st.done && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </Pressable>
                    <Text
                      style={[
                        styles.subtaskText,
                        {
                          color: st.done ? theme.text.tertiary : theme.text.primary,
                          fontFamily: typography.fontFamily,
                          textDecorationLine: st.done ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {st.title}
                    </Text>
                    <Pressable onPress={() => removeSubtask(st.id)} hitSlop={8}>
                      <Trash2 size={16} color={theme.text.tertiary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Repeat */}
          <View style={styles.fieldGap}>
            <Text style={[styles.fieldLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.field.repeat')}
            </Text>
            <View style={styles.chipRow}>
              {allRepeatTypes.map((r: RepeatType) => (
                <Chip
                  key={r}
                  selected={task.repeat === r}
                  onPress={() => update({ repeat: r })}
                >
                  {t(`tasks.repeat.${r}` as Parameters<typeof t>[0])}
                </Chip>
              ))}
            </View>
            {task.repeat === 'custom' && (
              <View style={[styles.chipRow, { marginTop: spacing.sm }]}>
                {weekDays.map((day) => (
                  <Pressable
                    key={day}
                    onPress={() => toggleRepeatDay(day)}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: (task.repeatDays ?? []).includes(day) ? theme.primary[500] : theme.surfaceSecondary,
                        borderColor: (task.repeatDays ?? []).includes(day) ? theme.primary[500] : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: (task.repeatDays ?? []).includes(day) ? '#FFFFFF' : theme.text.secondary,
                          fontFamily: typography.fontFamilySemiBold,
                        },
                      ]}
                    >
                      {weekLabels[day]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.fieldGap}>
            <Input
              value={task.notes ?? ''}
              onChangeText={(v) => update({ notes: v })}
              placeholder={t('tasks.field.notes')}
              label={t('tasks.field.notes')}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Actions */}
          <View style={[styles.actions, { marginTop: spacing.lg }]}>
            {isEditing && onDelete && (
              <Button variant="danger" onPress={handleDelete} icon={<Trash2 size={18} color="#FFFFFF" />}>
                {t('common.delete')}
              </Button>
            )}
            <View style={{ flex: 1 }} />
            <Button variant="ghost" onPress={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onPress={handleSave}
              disabled={!task.title.trim()}
              icon={<Check size={18} color="#FFFFFF" />}
            >
              {t('common.save')}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  fieldGap: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    paddingVertical: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  tagPillText: {
    fontSize: typography.sizes.sm,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  subtaskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskText: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: typography.sizes.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
