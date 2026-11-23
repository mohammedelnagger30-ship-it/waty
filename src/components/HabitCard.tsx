import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Check, Flame, Pencil, Trash2 } from 'lucide-react-native';
import { Habit } from '@/src/storage/entities';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography } from '@/src/theme';
import { Card } from './Card';
import { getHabitWeek, isHabitDueOn } from '@/src/utils/habitUtils';
import { todayISODate } from '@/src/storage/repository';
import { settingsRepository } from '@/src/storage';
import { useEffect, useState } from 'react';

interface HabitCardProps {
  habit: Habit;
  onToggleToday: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function HabitCard({ habit, onToggleToday, onEdit, onDelete }: HabitCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [weekStartsOn, setWeekStartsOn] = useState(0);
  const today = todayISODate();
  const week = getHabitWeek(habit, today, weekStartsOn);
  const doneToday = habit.completedDates.includes(today);
  const dueToday = isHabitDueOn(habit, today);
  const color = habit.color ?? theme.primary[500];

  useEffect(() => {
    settingsRepository.getOrCreate().then((settings) => setWeekStartsOn(settings.weekStartsOn)).catch(() => {});
  }, []);

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
          <Flame size={20} color={color} />
        </View>
        <View style={styles.info}>
          <Text numberOfLines={2} style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
            {habit.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('plans.streak')}: {habit.streak} · {t('plans.bestStreak')}: {habit.bestStreak}
            </Text>
            <Text style={[styles.frequency, { color, fontFamily: typography.fontFamilySemiBold }]}>
              {habit.frequency === 'daily' ? t('plans.daily') : habit.frequency === 'weekly' ? t('plans.weekly') : t('plans.custom')}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onToggleToday}
          disabled={!dueToday}
          style={({ pressed }) => [
            styles.check,
            {
              borderColor: doneToday ? theme.success : theme.borderStrong,
              backgroundColor: doneToday ? theme.success : 'transparent',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          {doneToday ? <Check size={18} color="#FFFFFF" strokeWidth={3} /> : null}
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {week.map((day) => {
          const isDone = day.done;
          const isDue = day.due;
          return (
            <View key={day.date} style={styles.dayColumn}>
              <View
                style={[
                  styles.dayDot,
                  {
                    backgroundColor: isDone ? theme.success : isDue ? theme.surfaceTertiary : 'transparent',
                    borderColor: isDone ? theme.success : theme.border,
                    borderWidth: isDone ? 0 : 1,
                  },
                ]}
              >
                {day.isToday ? <View style={[styles.todayDot, { backgroundColor: theme.primary[500] }]} /> : null}
              </View>
            </View>
          );
        })}
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: typography.sizes.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  meta: {
    fontSize: typography.sizes.xs,
  },
  frequency: {
    fontSize: typography.sizes.xs,
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
