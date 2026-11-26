import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Check, Pause, Pencil, Play, Trash2 } from 'lucide-react-native';
import { Goal } from '@/src/storage/entities';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography } from '@/src/theme';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { categoryColors } from '@/src/utils/taskUtils';
import { getGoalProgress } from '@/src/utils/goalUtils';
import { Task } from '@/src/storage/entities';

interface GoalCardProps {
  goal: Goal;
  tasks: Task[];
  onPress: () => void;
  onToggleStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function GoalCard({ goal, tasks, onPress, onToggleStatus, onEdit, onDelete }: GoalCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const progress = getGoalProgress(goal, tasks);
  const color = goal.color ?? categoryColors[goal.category];
  const doneMilestones = goal.milestones.filter((item) => item.done).length;
  const linked = tasks.filter((task) => task.goalId === goal.id);

  const statusLabel =
    goal.status === 'completed'
      ? t('plans.completed')
      : goal.status === 'paused'
        ? t('plans.paused')
        : t('plans.active');

  return (
    <Card style={styles.card}>
      <Pressable onPress={onPress} style={styles.main}>
        <View style={styles.headerRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <View style={styles.titleArea}>
            <Text
              numberOfLines={3}
              style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}
            >
              {goal.title}
            </Text>
            <Text style={[styles.meta, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {statusLabel} · {goal.type === 'short' ? t('plans.shortTerm') : goal.type === 'mid' ? t('plans.midTerm') : t('plans.longTerm')}
            </Text>
          </View>
          <Text style={[styles.percent, { color, fontFamily: typography.fontFamilyBold }]}>{progress}%</Text>
        </View>

        {goal.description ? (
          <Text
            numberOfLines={2}
            style={[styles.description, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}
          >
            {goal.description}
          </Text>
        ) : null}

        <ProgressBar progress={progress} color={color} height={8} />

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('plans.milestones')}: {doneMilestones}/{goal.milestones.length} · {t('plans.tasks')}: {linked.length}
          </Text>
          {goal.targetDate ? (
            <Text style={[styles.footerText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {goal.targetDate}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <Pressable onPress={onToggleStatus} style={styles.actionButton}>
          {goal.status === 'paused' ? (
            <Play size={16} color={theme.primary[500]} />
          ) : goal.status === 'completed' ? (
            <Check size={16} color={theme.success} />
          ) : (
            <Pause size={16} color={theme.warning} />
          )}
          <Text style={[styles.actionText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
            {goal.status === 'paused' ? t('plans.active') : goal.status === 'completed' ? t('plans.completed') : t('plans.paused')}
          </Text>
        </Pressable>
        <Pressable onPress={onEdit} style={styles.actionButton}>
          <Pencil size={16} color={theme.text.secondary} />
          <Text style={[styles.actionText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
            {t('common.edit')}
          </Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.actionButton}>
          <Trash2 size={16} color={theme.error} />
          <Text style={[styles.actionText, { color: theme.error, fontFamily: typography.fontFamily }]}>
            {t('common.delete')}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  main: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  titleArea: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.sizes.lg,
    lineHeight: typography.sizes.lg * 1.7,
  },
  meta: {
    fontSize: typography.sizes.xs,
  },
  percent: {
    fontSize: typography.sizes.lg,
  },
  description: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.65,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  footerText: {
    fontSize: typography.sizes.xs,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: typography.sizes.xs,
  },
});
