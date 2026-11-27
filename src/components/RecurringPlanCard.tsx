import { StyleSheet, Text, View } from 'react-native';
import { Clock, Pencil, RefreshCw } from 'lucide-react-native';
import { RecurringPlan } from '@/src/storage/entities';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, iconSize } from '@/src/theme';
import { formatRecurringSchedule } from '@/src/utils/recurringUtils';
import { Button } from './Button';
import { Card } from './Card';

interface RecurringPlanCardProps {
  plan: RecurringPlan;
  onEdit: () => void;
  onCancel: () => void;
}

export function RecurringPlanCard({ plan, onEdit, onCancel }: RecurringPlanCardProps) {
  const { theme } = useTheme();
  const { t, language } = useI18n();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: theme.primary[500] + '1F' }]}>
          <RefreshCw size={iconSize.md} color={theme.primary[500]} />
        </View>
        <View style={styles.copy}>
          <Text
            style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}
            numberOfLines={3}
          >
            {plan.title}
          </Text>
          <Text style={[styles.schedule, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
            {formatRecurringSchedule(plan, language)} · {t('plans.untilCancelled')}
          </Text>
        </View>
      </View>

      {plan.time ? (
        <View style={styles.timeRow}>
          <Clock size={iconSize.xs} color={theme.text.tertiary} />
          <Text style={[styles.time, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {plan.time}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          onPress={onEdit}
          icon={<Pencil size={iconSize.xs} color={theme.primary[600]} />}
          style={styles.actionButton}
        >
          {t('common.edit')}
        </Button>
        <Button variant="outline" size="sm" onPress={onCancel} style={styles.actionButton}>
          {t('plans.cancelRecurring')}
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: typography.sizes.md, lineHeight: typography.sizes.md * 1.65 },
  schedule: { fontSize: typography.sizes.xs, lineHeight: typography.sizes.xs * typography.lineHeights.normal },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  time: { fontSize: typography.sizes.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
});
