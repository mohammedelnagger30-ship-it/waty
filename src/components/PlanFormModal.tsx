import { useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { Goal, Plan } from '@/src/storage/entities';
import { generateId, todayISODate } from '@/src/storage/repository';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography } from '@/src/theme';
import { addDays } from '@/src/utils/taskUtils';
import { Button } from './Button';
import { Chip } from './Chip';
import { Input } from './Input';
import { ModalSheet } from './ModalSheet';

const TYPES: Plan['type'][] = ['weekly', 'monthly', 'custom'];

interface PlanFormModalProps {
  visible: boolean;
  goals: Goal[];
  onClose: () => void;
  onSave: (plan: Plan) => void;
  onDelete?: () => void;
  editingPlan?: Plan | null;
}

export function PlanFormModal({ visible, goals, onClose, onSave, onDelete, editingPlan }: PlanFormModalProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState<string | undefined>();
  const [type, setType] = useState<Plan['type']>('weekly');
  const [startDate, setStartDate] = useState(todayISODate());
  const [endDate, setEndDate] = useState(addDays(todayISODate(), 30));

  useEffect(() => {
    if (!visible) return;
    if (editingPlan) {
      setTitle(editingPlan.title);
      setGoalId(editingPlan.goalId);
      setType(editingPlan.type);
      setStartDate(editingPlan.startDate);
      setEndDate(editingPlan.endDate ?? '');
    } else {
      setTitle('');
      setGoalId(goals[0]?.id);
      setType('weekly');
      setStartDate(todayISODate());
      setEndDate(addDays(todayISODate(), 30));
    }
  }, [visible, editingPlan, goals]);

  const save = () => {
    if (!title.trim()) return;
    const plan: Plan = {
      id: editingPlan?.id ?? generateId(),
      title: title.trim(),
      goalId,
      startDate,
      endDate: endDate || undefined,
      type,
      phases: editingPlan?.phases ?? [
        {
          id: generateId(),
          title: title.trim(),
          startDate,
          endDate: endDate || undefined,
          taskIds: [],
        },
      ],
      taskIds: editingPlan?.taskIds ?? [],
      createdAt: editingPlan?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(plan);
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title={editingPlan ? t('plans.editPlan') : t('plans.newPlan')}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Input label={t('plans.planTitle')} value={title} onChangeText={setTitle} placeholder={t('plans.planTitle')} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.goal')}
          </Text>
          <View style={styles.chipRow}>
            <Chip selected={!goalId} onPress={() => setGoalId(undefined)}>
              {t('plans.noGoal')}
            </Chip>
            {goals.map((goal) => (
              <Chip key={goal.id} selected={goalId === goal.id} onPress={() => setGoalId(goal.id)}>
                {goal.title}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.type')}
          </Text>
          <View style={styles.chipRow}>
            {TYPES.map((item) => (
              <Chip key={item} selected={type === item} onPress={() => setType(item)}>
                {item === 'weekly' ? t('plans.weeklyPlan') : item === 'monthly' ? t('plans.monthlyPlan') : t('plans.customPlan')}
              </Chip>
            ))}
          </View>
        </View>

        <Input label={t('plans.startDate')} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        <Input label={t('plans.endDate')} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />

        <View style={styles.footer}>
          <Button onPress={save} fullWidth>
            {t('common.save')}
          </Button>
          {editingPlan && onDelete ? (
            <Button variant="danger" onPress={onDelete} fullWidth>
              {t('plans.deletePlan')}
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
