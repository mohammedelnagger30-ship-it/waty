import { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { usePressAnimation } from '@/src/hooks/usePressAnimation';
import Animated from 'react-native-reanimated';
import { ModalSheet } from './ModalSheet';
import { Button } from './Button';
import { Chip } from './Chip';
import { Input } from './Input';
import { TaskTemplate, TaskPriority, TaskCategory, RepeatType } from '@/src/storage/entities';
import { generateId, nowISO } from '@/src/storage/repository';
import { allCategories, allPriorities, allRepeatTypes, categoryColors, priorityColors } from '@/src/utils/taskUtils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TemplateDraft = Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>;

const emptyDraft = (): TemplateDraft => ({
  title: '',
  category: 'personal',
  priority: 'medium',
  tags: [],
  subtaskTitles: [],
  repeat: 'none',
});

interface TemplateFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (template: TaskTemplate) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  editingTemplate?: TaskTemplate | null;
  initialTemplate?: TemplateDraft | null;
}

export function TemplateFormModal({
  visible,
  onClose,
  onSave,
  onDelete,
  editingTemplate,
  initialTemplate,
}: TemplateFormModalProps) {
  const { theme, isDark } = useTheme();
  const { t } = useI18n();
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft);
  const [tagsText, setTagsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const { onPressIn, onPressOut, style: pressStyle } = usePressAnimation({ scaleTo: 0.96, opacityTo: 0.8 });

  useEffect(() => {
    if (!visible) return;
    const source = editingTemplate ?? initialTemplate ?? emptyDraft();
    setDraft({ ...source, tags: [...source.tags], subtaskTitles: [...source.subtaskTitles] });
    setTagsText(source.tags.join(', '));
    setStepsText(source.subtaskTitles.join('\n'));
  }, [visible, editingTemplate, initialTemplate]);

  const update = (patch: Partial<TemplateDraft>) => setDraft((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!draft.title.trim()) return;
    const template: TaskTemplate = {
      ...draft,
      id: editingTemplate?.id ?? generateId(),
      title: draft.title.trim(),
      tags: tagsText.split(',').map((s) => s.trim()).filter(Boolean),
      subtaskTitles: stepsText.split('\n').map((s) => s.trim()).filter(Boolean),
      createdAt: editingTemplate?.createdAt ?? nowISO(),
      updatedAt: nowISO(),
    };
    await onSave(template);
    onClose();
  };

  const handleDelete = async () => {
    if (editingTemplate && onDelete) {
      await onDelete(editingTemplate.id);
      onClose();
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={editingTemplate ? t('templates.edit') : t('templates.new')}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Input
          value={draft.title}
          onChangeText={(v) => update({ title: v })}
          placeholder={t('templates.field.title')}
          label={t('templates.field.title')}
        />

        <View style={styles.gap}>
          <Input
            value={draft.description ?? ''}
            onChangeText={(v) => update({ description: v })}
            placeholder={t('templates.field.description')}
            label={t('templates.field.description')}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.gap}>
          <Text style={[styles.label, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('tasks.field.category')}
          </Text>
          <View style={styles.chipRow}>
            {allCategories.map((c: TaskCategory) => (
              <Chip
                key={c}
                selected={draft.category === c}
                color={categoryColors[c]}
                onPress={() => update({ category: c })}
              >
                {t(`tasks.category.${c}` as Parameters<typeof t>[0])}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.gap}>
          <Text style={[styles.label, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('tasks.field.priority')}
          </Text>
          <View style={styles.chipRow}>
            {allPriorities.map((p: TaskPriority) => {
              const colors = priorityColors[p];
              return (
                <Chip
                  key={p}
                  selected={draft.priority === p}
                  color={isDark ? colors.dark : colors.light}
                  onPress={() => update({ priority: p })}
                >
                  {t(`tasks.priority.${p}` as Parameters<typeof t>[0])}
                </Chip>
              );
            })}
          </View>
        </View>

        <View style={styles.gap}>
          <Input
            value={draft.estimatedMinutes ? String(draft.estimatedMinutes) : ''}
            onChangeText={(v) => update({ estimatedMinutes: v ? parseInt(v, 10) || 0 : undefined })}
            placeholder="0"
            label={t('tasks.field.duration')}
          />
        </View>

        <View style={styles.gap}>
          <Input
            value={tagsText}
            onChangeText={setTagsText}
            placeholder={t('templates.field.tags')}
            label={t('templates.field.tags')}
          />
        </View>

        <View style={styles.gap}>
          <Input
            value={stepsText}
            onChangeText={setStepsText}
            placeholder={t('templates.field.subtasks')}
            label={t('templates.field.subtasks')}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.gap}>
          <Text style={[styles.label, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('tasks.field.repeat')}
          </Text>
          <View style={styles.chipRow}>
            {allRepeatTypes.map((r: RepeatType) => (
              <Chip key={r} selected={draft.repeat === r} onPress={() => update({ repeat: r })}>
                {t(`tasks.repeat.${r}` as Parameters<typeof t>[0])}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.gap}>
          <Chip selected={!!draft.isMIT} onPress={() => update({ isMIT: !draft.isMIT })}>
            {t('tasks.mit')}
          </Chip>
        </View>

        <View style={[styles.actions, { marginTop: spacing.lg }]}>
          {editingTemplate && onDelete ? (
            <AnimatedPressable
              onPress={handleDelete}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={[styles.deleteBtn, { backgroundColor: theme.error + '1A' }, pressStyle]}
            >
              <Trash2 size={18} color={theme.error} />
            </AnimatedPressable>
          ) : null}
          <View style={{ flex: 1 }} />
          <Button variant="ghost" onPress={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            onPress={handleSave}
            disabled={!draft.title.trim()}
            icon={<Check size={18} color="#FFFFFF" />}
          >
            {t('common.save')}
          </Button>
        </View>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: spacing.md },
  label: { fontSize: typography.sizes.sm, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, borderRadius: radius.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deleteBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
