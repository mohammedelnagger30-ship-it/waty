import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Calendar, Layers, Pencil, Trash2 } from 'lucide-react-native';
import { Plan } from '@/src/storage/entities';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography } from '@/src/theme';
import { Card } from './Card';

interface PlanCardProps {
  plan: Plan;
  goalTitle?: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function PlanCard({ plan, goalTitle, onEdit, onDelete }: PlanCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const typeLabel =
    plan.type === 'weekly' ? t('plans.weeklyPlan') : plan.type === 'monthly' ? t('plans.monthlyPlan') : t('plans.customPlan');

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: theme.primary[500] + '22' }]}>
          <Layers size={18} color={theme.primary[500]} />
        </View>
        <View style={styles.titleArea}>
          <Text numberOfLines={3} style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
            {plan.title}
          </Text>
          <Text style={[styles.meta, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>{typeLabel}</Text>
        </View>
      </View>

      {goalTitle ? (
        <View style={[styles.goalChip, { backgroundColor: theme.surfaceSecondary }]}>
          <Text style={[styles.goalText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
            {t('plans.goal')}: {goalTitle}
          </Text>
        </View>
      ) : null}

      <View style={styles.infoRow}>
        <Calendar size={14} color={theme.text.tertiary} />
        <Text style={[styles.infoText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
          {plan.startDate}
          {plan.endDate ? ` — ${plan.endDate}` : ''}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={[styles.infoText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
          {t('plans.phases')}: {plan.phases.length} · {t('plans.tasks')}: {plan.taskIds.length}
        </Text>
      </View>

      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <Pressable onPress={onEdit} style={styles.actionButton}>
          <Pencil size={15} color={theme.text.secondary} />
          <Text style={[styles.actionText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
            {t('common.edit')}
          </Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.actionButton}>
          <Trash2 size={15} color={theme.error} />
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.sizes.md,
    lineHeight: typography.sizes.md * 1.65,
  },
  meta: {
    fontSize: typography.sizes.xs,
  },
  goalChip: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  goalText: {
    fontSize: typography.sizes.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.xs,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: typography.sizes.xs,
  },
});
