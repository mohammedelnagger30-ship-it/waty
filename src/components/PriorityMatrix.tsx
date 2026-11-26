import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Clock } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n, type TranslationKey } from '@/src/i18n';
import { spacing, radius, typography } from '@/src/theme';
import { Task } from '@/src/storage/entities';
import type { MatrixGroup, MatrixKey } from '@/src/utils/taskUtils';
import { priorityColors } from '@/src/utils/taskUtils';
import { EmptyState } from './EmptyState';

interface Props {
  groups: MatrixGroup[];
  onOpenTask: (task: Task) => void;
  onComplete: (task: Task) => void | Promise<void>;
}

const META: Record<MatrixKey, { title: TranslationKey; hint: TranslationKey }> = {
  do: { title: 'matrix.do', hint: 'matrix.doHint' },
  schedule: { title: 'matrix.schedule', hint: 'matrix.scheduleHint' },
  delegate: { title: 'matrix.delegate', hint: 'matrix.delegateHint' },
  eliminate: { title: 'matrix.eliminate', hint: 'matrix.eliminateHint' },
};

/** Four-quadrant Eisenhower view built from existing priority/date fields. */
export function PriorityMatrix({ groups, onOpenTask, onComplete }: Props) {
  const { theme, isDark } = useTheme();
  const { t } = useI18n();

  if (!groups.length) {
    return (
      <EmptyState
        icon={<Check size={36} color={theme.text.tertiary} />}
        title={t('matrix.empty')}
        description={t('tasks.noTasksDesc')}
      />
    );
  }

  return (
    <View style={styles.container}>
      {groups.map((group) => {
        const palette = priorityColors[
          group.key === 'do' ? 'high' : group.key === 'schedule' ? 'medium' : 'low'
        ];
        const color = isDark ? palette.dark : palette.light;
        return (
          <View
            key={group.key}
            style={[styles.quadrant, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.header}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                  {t(META[group.key].title)}
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {t(META[group.key].hint)}
                </Text>
              </View>
              <View style={[styles.count, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.countText, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                  {group.tasks.length}
                </Text>
              </View>
            </View>

            {group.tasks.map((task) => (
              <View key={task.id} style={[styles.row, { borderTopColor: theme.border }]}>
                <Pressable
                  hitSlop={6}
                  onPress={() => void onComplete(task)}
                  style={[styles.check, { borderColor: color }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('tasks.swipeComplete')}
                >
                  <Check size={12} color={color} strokeWidth={3} style={{ opacity: 0.45 }} />
                </Pressable>
                <Pressable onPress={() => onOpenTask(task)} style={styles.rowBody}>
                  <Text
                    numberOfLines={3}
                    style={[styles.rowTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}
                  >
                    {task.title}
                  </Text>
                  {task.time ? (
                    <View style={styles.timeRow}>
                      <Clock size={11} color={theme.text.tertiary} />
                      <Text style={[styles.timeText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                        {task.time}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  quadrant: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: typography.sizes.md },
  hint: { fontSize: typography.sizes.xs },
  count: {
    minWidth: 26,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  countText: { fontSize: typography.sizes.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: typography.sizes.sm, lineHeight: typography.sizes.sm * 1.65 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: typography.sizes.xs },
});

export default PriorityMatrix;
