import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Check, Circle, Clock, Trash2 } from 'lucide-react-native';
import { Goal, GoalStatus, Task } from '@/src/storage/entities';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography } from '@/src/theme';
import { getGoalProgress, milestoneProgress } from '@/src/utils/goalUtils';
import { Button } from './Button';
import { Chip } from './Chip';
import { Input } from './Input';
import { ModalSheet } from './ModalSheet';
import { ProgressBar } from './ProgressBar';

interface GoalDetailModalProps {
  visible: boolean;
  goal: Goal | null;
  tasks: Task[];
  onClose: () => void;
  onToggleMilestone: (milestoneId: string) => void;
  onUpdateProgress: (value: number) => void;
  onSetStatus: (status: GoalStatus) => void;
  onDelete: () => void;
  onOpenTask: (task: Task) => void;
}

export function GoalDetailModal({
  visible,
  goal,
  tasks,
  onClose,
  onToggleMilestone,
  onUpdateProgress,
  onSetStatus,
  onDelete,
  onOpenTask,
}: GoalDetailModalProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [value, setValue] = useState('');

  if (!goal) return null;

  const progress = getGoalProgress(goal, tasks);
  const linked = tasks.filter((task) => task.goalId === goal.id);
  const color = goal.color ?? theme.primary[500];
  const statuses: GoalStatus[] = ['active', 'paused', 'completed'];

  return (
    <ModalSheet visible={visible} onClose={onClose} title={goal.title}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {goal.description ? (
          <Text style={[styles.body, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
            {goal.description}
          </Text>
        ) : null}
        {goal.motivation ? (
          <Text style={[styles.motivation, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {goal.motivation}
          </Text>
        ) : null}

        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.updateProgress')}
          </Text>
          <Text style={[styles.progressValue, { color, fontFamily: typography.fontFamilyBold }]}>{progress}%</Text>
        </View>
        <ProgressBar progress={progress} color={color} height={10} />

        {goal.progressMode === 'manual' ? (
          <View style={styles.manualRow}>
            <View style={styles.inputFlex}>
              <Input
                label={t('plans.currentValue')}
                value={value !== '' ? value : String(goal.currentValue ?? 0)}
                onChangeText={setValue}
              />
            </View>
            <Button
              size="sm"
              onPress={() => {
                const parsed = Number(value !== '' ? value : String(goal.currentValue ?? 0));
                if (Number.isFinite(parsed)) {
                  onUpdateProgress(parsed);
                  setValue('');
                }
              }}
            >
              {t('common.save')}
            </Button>
          </View>
        ) : (
          <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('plans.autoProgress')}
          </Text>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.status')}
          </Text>
          <View style={styles.chipRow}>
            {statuses.map((status) => (
              <Chip key={status} selected={goal.status === status} onPress={() => onSetStatus(status)}>
                {status === 'active' ? t('plans.active') : status === 'paused' ? t('plans.paused') : t('plans.completed')}
              </Chip>
            ))}
          </View>
        </View>

        {goal.milestones.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('plans.milestones')}
            </Text>
            {goal.milestones.map((milestone) => {
              const milestoneValue = milestoneProgress(milestone);
              return (
                <Pressable
                  key={milestone.id}
                  onPress={() => onToggleMilestone(milestone.id)}
                  style={[styles.milestone, { backgroundColor: theme.surfaceSecondary }]}
                >
                  {milestone.done ? (
                    <Check size={18} color={theme.success} />
                  ) : (
                    <Circle size={18} color={theme.text.tertiary} />
                  )}
                  <View style={styles.milestoneInfo}>
                    <Text
                      style={[
                        styles.milestoneTitle,
                        {
                          color: milestone.done ? theme.text.tertiary : theme.text.primary,
                          fontFamily: typography.fontFamily,
                          textDecorationLine: milestone.done ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {milestone.title}
                    </Text>
                    {milestone.date ? (
                      <Text style={[styles.milestoneDate, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                        {milestone.date}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.milestonePercent, { color, fontFamily: typography.fontFamilySemiBold }]}>
                    {milestoneValue}%
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.linkedTasks')} ({linked.length})
          </Text>
          {linked.length === 0 ? (
            <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('plans.noPlansListDesc')}
            </Text>
          ) : (
            linked.map((task) => (
              <Pressable
                key={task.id}
                onPress={() => onOpenTask(task)}
                style={[styles.taskRow, { backgroundColor: theme.surfaceSecondary }]}
              >
                <Clock size={15} color={theme.text.tertiary} />
                <Text numberOfLines={2} style={[styles.taskTitle, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                  {task.title}
                </Text>
                <Text style={[styles.taskStatus, { color: task.status === 'done' ? theme.success : theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {task.status === 'done' ? t('stats.done') : t('stats.pending')}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        <Button variant="danger" onPress={onDelete} fullWidth icon={<Trash2 size={16} color="#FFFFFF" />}>
          {t('plans.deleteGoal')}
        </Button>
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
  body: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.65,
    marginBottom: spacing.xs,
  },
  motivation: {
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.xs * 1.6,
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.sizes.sm,
  },
  progressValue: {
    fontSize: typography.sizes.lg,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  inputFlex: {
    flex: 1,
  },
  hint: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: typography.sizes.sm,
  },
  milestoneDate: {
    fontSize: 10,
    marginTop: 2,
  },
  milestonePercent: {
    fontSize: typography.sizes.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  taskTitle: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.65,
  },
  taskStatus: {
    fontSize: 10,
  },
});
