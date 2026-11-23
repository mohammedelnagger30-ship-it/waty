import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Check, Plus, X } from 'lucide-react-native';
import { Goal, GoalStatus, GoalType, Milestone, TaskCategory } from '@/src/storage/entities';
import { generateId, todayISODate } from '@/src/storage/repository';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography } from '@/src/theme';
import { allCategories, addDays } from '@/src/utils/taskUtils';
import { GOAL_TEMPLATES } from '@/src/utils/goalTemplates';
import { localizedTemplate } from '@/src/utils/goalUtils';
import { Button } from './Button';
import { Chip } from './Chip';
import { Input } from './Input';
import { ModalSheet } from './ModalSheet';

const COLORS = ['#1A9FE8', '#8B5CF6', '#22C55E', '#F59E0B', '#EC4899', '#14B8A6', '#6366F1', '#DC2626'];
const TYPES: GoalType[] = ['short', 'mid', 'long'];
const STATUSES: GoalStatus[] = ['active', 'paused', 'completed'];

interface GoalFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (goal: Goal, templateId?: string, createTasks?: boolean) => void;
  onDelete?: () => void;
  editingGoal?: Goal | null;
}

export function GoalFormModal({ visible, onClose, onSave, onDelete, editingGoal }: GoalFormModalProps) {
  const { theme } = useTheme();
  const { t, language } = useI18n();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [motivation, setMotivation] = useState('');
  const [category, setCategory] = useState<TaskCategory>('personal');
  const [type, setType] = useState<GoalType>('mid');
  const [status, setStatus] = useState<GoalStatus>('active');
  const [targetValue, setTargetValue] = useState('100');
  const [targetUnit, setTargetUnit] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [templateId, setTemplateId] = useState('');
  const [createTasks, setCreateTasks] = useState(true);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestone, setNewMilestone] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description ?? '');
      setMotivation(editingGoal.motivation ?? '');
      setCategory(editingGoal.category);
      setType(editingGoal.type);
      setStatus(editingGoal.status);
      setTargetValue(String(editingGoal.targetValue ?? 100));
      setTargetUnit(editingGoal.targetUnit ?? '');
      setTargetDate(editingGoal.targetDate ?? '');
      setColor(editingGoal.color ?? COLORS[0]);
      setTemplateId('');
      setCreateTasks(false);
      setMilestones(editingGoal.milestones);
    } else {
      setTitle('');
      setDescription('');
      setMotivation('');
      setCategory('personal');
      setType('mid');
      setStatus('active');
      setTargetValue('100');
      setTargetUnit('');
      setTargetDate(addDays(todayISODate(), 90));
      setColor(COLORS[0]);
      setTemplateId('');
      setCreateTasks(true);
      setMilestones([]);
    }
    setNewMilestone('');
  }, [visible, editingGoal]);

  useEffect(() => {
    if (editingGoal || !templateId) return;
    const template = GOAL_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    const localized = localizedTemplate(template, language);
    setTitle(localized.title);
    setDescription(localized.description);
    setMotivation(localized.motivation);
    setCategory(template.category);
    setType(template.type);
    setTargetValue(String(template.targetValue));
    setTargetUnit(localized.unit);
    setColor(template.color);
  }, [templateId, editingGoal, language]);

  const addMilestone = () => {
    const value = newMilestone.trim();
    if (!value) return;
    setMilestones((prev) => [
      ...prev,
      {
        id: generateId(),
        title: value,
        done: false,
        date: addDays(todayISODate(), (prev.length + 1) * 14),
      },
    ]);
    setNewMilestone('');
  };

  const save = () => {
    if (!title.trim()) return;
    const goal: Goal = {
      id: editingGoal?.id ?? generateId(),
      title: title.trim(),
      description: description.trim() || undefined,
      motivation: motivation.trim() || undefined,
      category,
      status,
      type,
      targetDate: targetDate || undefined,
      targetValue: Number(targetValue) || 100,
      targetUnit: targetUnit.trim() || undefined,
      currentValue: editingGoal?.currentValue ?? 0,
      progress: editingGoal?.progress ?? 0,
      progressMode: editingGoal?.progressMode ?? 'auto',
      milestones,
      color,
      createdAt: editingGoal?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(goal, editingGoal ? undefined : templateId || undefined, createTasks);
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title={editingGoal ? t('plans.editGoal') : t('plans.newGoal')}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {!editingGoal ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('plans.fromTemplate')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templates}>
              <Chip selected={templateId === ''} onPress={() => setTemplateId('')}>
                {t('plans.blankGoal')}
              </Chip>
              {GOAL_TEMPLATES.map((template) => (
                <Chip key={template.id} selected={templateId === template.id} onPress={() => setTemplateId(template.id)}>
                  {language === 'ar' ? template.titleAr : template.titleEn}
                </Chip>
              ))}
            </ScrollView>
            {templateId ? (
              <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('plans.templatePreview')}
              </Text>
            ) : null}
            {templateId ? (
              <Chip selected={createTasks} onPress={() => setCreateTasks((prev) => !prev)}>
                {t('plans.createTasks')}
              </Chip>
            ) : null}
          </View>
        ) : null}

        <Input label={t('plans.goalTitle')} value={title} onChangeText={setTitle} placeholder={t('plans.goalTitle')} />
        <Input label={t('plans.goalDescription')} value={description} onChangeText={setDescription} multiline numberOfLines={2} />
        <Input label={t('plans.goalMotivation')} value={motivation} onChangeText={setMotivation} multiline numberOfLines={2} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.category')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templates}>
            {allCategories.map((item) => (
              <Chip key={item} selected={category === item} onPress={() => setCategory(item)}>
                {t(`tasks.category.${item}` as Parameters<typeof t>[0])}
              </Chip>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.type')}
          </Text>
          <View style={styles.chipRow}>
            {TYPES.map((item) => (
              <Chip key={item} selected={type === item} onPress={() => setType(item)}>
                {item === 'short' ? t('plans.shortTerm') : item === 'mid' ? t('plans.midTerm') : t('plans.longTerm')}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.status')}
          </Text>
          <View style={styles.chipRow}>
            {STATUSES.map((item) => (
              <Chip key={item} selected={status === item} onPress={() => setStatus(item)}>
                {item === 'active' ? t('plans.active') : item === 'paused' ? t('plans.paused') : t('plans.completed')}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputFlex}>
            <Input label={t('plans.targetValue')} value={targetValue} onChangeText={setTargetValue} />
          </View>
          <View style={styles.inputFlex}>
            <Input label={t('plans.targetUnit')} value={targetUnit} onChangeText={setTargetUnit} />
          </View>
        </View>
        <Input label={t('plans.targetDate')} value={targetDate} onChangeText={setTargetDate} placeholder="YYYY-MM-DD" />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.color')}
          </Text>
          <View style={styles.colors}>
            {COLORS.map((item) => (
              <Pressable
                key={item}
                onPress={() => setColor(item)}
                style={[styles.colorDot, { backgroundColor: item, borderColor: color === item ? theme.text.primary : 'transparent' }]}
              >
                {color === item ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.milestones')}
          </Text>
          {milestones.map((milestone, index) => (
            <View key={milestone.id} style={[styles.milestoneRow, { backgroundColor: theme.surfaceSecondary }]}>
              <Text style={[styles.milestoneText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                {index + 1}. {milestone.title}
              </Text>
              <Pressable onPress={() => setMilestones((prev) => prev.filter((item) => item.id !== milestone.id))}>
                <X size={16} color={theme.error} />
              </Pressable>
            </View>
          ))}
          <View style={styles.addMilestoneRow}>
            <View style={styles.inputFlex}>
              <Input value={newMilestone} onChangeText={setNewMilestone} placeholder={t('plans.milestoneTitle')} />
            </View>
            <Button variant="secondary" size="sm" onPress={addMilestone} icon={<Plus size={16} color="#FFFFFF" />}>
              {t('common.add')}
            </Button>
          </View>
        </View>

        <View style={styles.footer}>
          <Button onPress={save} fullWidth>
            {t('common.save')}
          </Button>
          {editingGoal && onDelete ? (
            <Button variant="danger" onPress={onDelete} fullWidth>
              {t('plans.deleteGoal')}
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    // RN ScrollView defaults to flexGrow: 1, which makes short forms expand
    // to the sheet's max height and leaves a blank white band over the page.
    flexGrow: 0,
    flexShrink: 1,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
  },
  templates: {
    flexDirection: 'row',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  hint: {
    fontSize: typography.sizes.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inputFlex: {
    flex: 1,
  },
  colors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  milestoneText: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  addMilestoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
