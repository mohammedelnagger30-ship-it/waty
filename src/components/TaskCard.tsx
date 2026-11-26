import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Check, Clock, Calendar, AlertTriangle, Trash2, Star } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { Task } from '@/src/storage/entities';
import { priorityColors, categoryColors, getSubtaskProgress, getTaskGroup } from '@/src/utils/taskUtils';
import { haptics } from '@/src/utils/haptics';
import { useReducedMotion } from '@/src/hooks/useReducedMotion';
import { ProgressBar } from './ProgressBar';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

const COMPLETE_THRESHOLD = 80;
const DELETE_THRESHOLD = 160;
const MAX_TRANSLATION = 200;
const SNAP_TIMING = { duration: 220, easing: Easing.out(Easing.cubic) };
const PRESS_TIMING = { duration: 110, easing: Easing.out(Easing.quad) };

type SwipeAction = 'complete' | 'postpone' | 'delete';

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
  onComplete: (task: Task) => void | Promise<void>;
  onPostpone: (task: Task) => void | Promise<void>;
  onDelete: (task: Task) => void | Promise<void>;
  /** Optional multi-select mode used by the bulk actions bar. */
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (task: Task) => void;
  /** Makes tag chips tappable (used to filter the list by tag). */
  onTagPress?: (tag: string) => void;
  /** Number of other timed tasks overlapping this one. */
  conflictCount?: number;
}

/** The only always-running animation on a card; mounted only for active tasks. */
function ActivePulse({ color, reduced }: { color: string; reduced: boolean }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduced, pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + pulse.value * 0.3 }],
    opacity: 0.55 + pulse.value * 0.45,
  }));

  return <AnimatedView style={[styles.activeDot, { backgroundColor: color }, style]} />;
}

function TaskCardImpl({
  task,
  onPress,
  onComplete,
  onPostpone,
  onDelete,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onTagPress,
  conflictCount = 0,
}: TaskCardProps) {
  const { theme, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const reduced = useReducedMotion();

  // +1 in LTR, -1 in RTL. All swipe math is done in "logical" space so the
  // same green/yellow/red actions appear on the mirrored side in RTL.
  const dir = isRTL ? -1 : 1;
  const translateX = useSharedValue(0);
  const cardScale = useSharedValue(1);
  // 0 = none, 1 = complete, 2 = postpone, 3 = delete.
  const zone = useSharedValue(0);

  const runAction = useCallback(
    (action: SwipeAction) => {
      const callback =
        action === 'complete' ? onComplete : action === 'postpone' ? onPostpone : onDelete;

      if (action === 'delete') haptics.warning();
      else haptics.success();

      // Keep the action revealed until persistence finishes, then spring back.
      // If the list reloads and unmounts this card, the reset is harmless.
      Promise.resolve()
        .then(() => callback(task))
        .catch(() => {})
        .finally(() => {
          translateX.value = withTiming(0, SNAP_TIMING);
        });
    },
    [onComplete, onPostpone, onDelete, task, translateX],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!selectionMode)
        .activeOffsetX([-15, 15])
        // Let vertical scrolling win immediately; only near-horizontal drags reveal actions.
        .failOffsetY([-12, 12])
        .onUpdate((event) => {
          const logical = event.translationX * dir;
          const clamped = Math.max(-MAX_TRANSLATION, Math.min(MAX_TRANSLATION, logical));
          translateX.value = clamped * dir;

          const nextZone =
            clamped > COMPLETE_THRESHOLD ? 1
            : clamped < -DELETE_THRESHOLD ? 3
            : clamped < -COMPLETE_THRESHOLD ? 2
            : 0;

          if (zone.value !== nextZone) {
            zone.value = nextZone;
            if (nextZone !== 0) runOnJS(haptics.selection)();
          }
        })
        .onEnd((event) => {
          // Include a short velocity projection so a quick flick triggers the action.
          const projected = (event.translationX + event.velocityX * 0.12) * dir;

          let action: SwipeAction | null = null;
          if (projected > COMPLETE_THRESHOLD) action = 'complete';
          else if (projected < -DELETE_THRESHOLD) action = 'delete';
          else if (projected < -COMPLETE_THRESHOLD) action = 'postpone';

          zone.value = 0;

          if (action) {
            translateX.value = withTiming(
              (action === 'complete' ? MAX_TRANSLATION : -MAX_TRANSLATION) * dir,
              { duration: reduced ? 0 : 140, easing: Easing.out(Easing.cubic) },
            );
            runOnJS(runAction)(action);
          } else {
            translateX.value = withTiming(0, SNAP_TIMING);
          }
        })
        .onFinalize(() => {
          zone.value = 0;
        }),
    [selectionMode, dir, reduced, runAction, translateX, zone],
  );

  const priorityColor = priorityColors[task.priority];
  const color = isDark ? priorityColor.dark : priorityColor.light;
  const catColor = categoryColors[task.category];
  const group = getTaskGroup(task);
  const isOverdue = group === 'overdue';
  const isDone = task.status === 'done';
  const isActive = task.status === 'in_progress';
  const isPostponed = task.status === 'postponed';
  const subProgress = getSubtaskProgress(task);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: cardScale.value }],
  }));

  const completeStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(translateX.value * dir, [0, COMPLETE_THRESHOLD], [0, 1], 'clamp'),
    }),
    [dir],
  );

  const postponeStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(
        translateX.value * dir,
        [-DELETE_THRESHOLD, -DELETE_THRESHOLD + 40, -COMPLETE_THRESHOLD, 0],
        [0, 0, 1, 0],
        'clamp',
      ),
    }),
    [dir],
  );

  const deleteStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(
        translateX.value * dir,
        [-DELETE_THRESHOLD, -DELETE_THRESHOLD + 40],
        [1, 0],
        'clamp',
      ),
    }),
    [dir],
  );

  const categoryLabel =
    task.category === 'custom' && task.customCategory
      ? task.customCategory
      : t(`tasks.category.${task.category}` as Parameters<typeof t>[0]);

  return (
    <View style={styles.wrapper}>
      <AnimatedView
        style={[styles.actionBg, styles.completeAction, { backgroundColor: theme.success }, completeStyle]}
      >
        <View style={styles.actionContent}>
          <Check size={22} color="#FFFFFF" />
          <Text style={styles.actionText}>{t('tasks.swipeComplete')}</Text>
        </View>
      </AnimatedView>

      <AnimatedView
        style={[styles.actionBg, styles.secondaryAction, { backgroundColor: theme.warning }, postponeStyle]}
      >
        <View style={styles.actionContent}>
          <Calendar size={22} color="#FFFFFF" />
          <Text style={styles.actionText}>{t('tasks.swipePostpone')}</Text>
        </View>
      </AnimatedView>

      <AnimatedView
        style={[styles.actionBg, styles.secondaryAction, { backgroundColor: theme.error }, deleteStyle]}
      >
        <View style={styles.actionContent}>
          <Trash2 size={22} color="#FFFFFF" />
          <Text style={styles.actionText}>{t('tasks.swipeDelete')}</Text>
        </View>
      </AnimatedView>

      <GestureDetector gesture={pan}>
        <AnimatedPressable
          onPress={() => {
            haptics.selection();
            if (selectionMode) onToggleSelect?.(task);
            else onPress(task);
          }}
          onPressIn={() => {
            if (!reduced) cardScale.value = withTiming(0.985, PRESS_TIMING);
          }}
          onPressOut={() => {
            cardScale.value = withTiming(1, PRESS_TIMING);
          }}
          style={[
            styles.card,
            {
              backgroundColor: selected ? theme.primary[50] : isActive ? theme.primary[50] : theme.surface,
              borderColor: selected
                ? theme.primary[500]
                : isActive
                ? theme.primary[300]
                : isOverdue
                ? theme.error + '66'
                : theme.border,
              borderWidth: selected ? 2 : isActive || isOverdue ? 1.5 : 1,
              shadowColor: isActive ? theme.primary[500] : 'transparent',
              shadowOpacity: isActive ? (isDark ? 0.35 : 0.18) : 0,
              shadowRadius: isActive ? 12 : 0,
              elevation: isActive && !isDark ? 3 : 0,
              opacity: isDone ? 0.62 : 1,
            },
            cardStyle,
          ]}
        >
          <View style={[styles.priorityBar, { backgroundColor: color }]} />

          <View style={styles.cardContent}>
            <View style={styles.topRow}>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  if (selectionMode) {
                    haptics.selection();
                    onToggleSelect?.(task);
                    return;
                  }
                  if (isDone) return;
                  haptics.success();
                  onComplete(task);
                }}
                style={[
                  styles.checkbox,
                  {
                    borderColor: selected || isDone ? theme.success : color,
                    backgroundColor: selected || isDone ? theme.success : 'transparent',
                    shadowColor: isDone ? theme.success : 'transparent',
                    shadowOpacity: isDone ? 0.45 : 0,
                    shadowRadius: isDone ? 8 : 0,
                    elevation: isDone && !isDark ? 3 : 0,
                  },
                ]}
              >
                {(isDone || selected) && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
              </Pressable>

              <View style={styles.titleArea}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.title,
                    {
                      color: theme.text.primary,
                      fontFamily: typography.fontFamilySemiBold,
                      textDecorationLine: isDone ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {task.title}
                </Text>
                {task.description ? (
                  <Text
                    numberOfLines={1}
                    style={[styles.description, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}
                  >
                    {task.description}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={[styles.categoryChip, { backgroundColor: catColor + '22' }]}>
                <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                <Text style={[styles.categoryText, { color: catColor, fontFamily: typography.fontFamilySemiBold }]}>
                  {categoryLabel}
                </Text>
              </View>

              <View style={styles.metaRight}>
                {task.isMIT && (
                  <View style={[styles.mitBadge, { backgroundColor: theme.accent[500] + '20' }]}>
                    <Star size={12} color={theme.accent[isDark ? 300 : 600]} fill={theme.accent[isDark ? 300 : 600]} />
                  </View>
                )}
                {conflictCount > 0 && (
                  <View style={[styles.conflictBadge, { backgroundColor: theme.warningSoft }]}>
                    <AlertTriangle size={12} color={theme.warning} />
                    <Text style={[styles.conflictText, { color: theme.warning }]}>
                      {t('tasks.scheduleConflict')}
                    </Text>
                  </View>
                )}
                {isOverdue && (
                  <View style={[styles.overdueBadge, { backgroundColor: theme.errorSoft }]}>
                    <AlertTriangle size={12} color={theme.error} />
                    <Text style={[styles.overdueText, { color: theme.error }]}>
                      {t('tasks.group.overdue')}
                    </Text>
                  </View>
                )}
                {task.time ? (
                  <View style={styles.timeChip}>
                    <Clock size={13} color={theme.text.tertiary} />
                    <Text style={[styles.timeText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                      {task.time}
                    </Text>
                  </View>
                ) : null}
                {task.estimatedMinutes != null && task.estimatedMinutes > 0 && (
                  <View style={styles.timeChip}>
                    <Text style={[styles.durationText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                      {task.estimatedMinutes}{t('common.min')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {task.subtasks.length > 0 && (
              <View style={styles.subtaskRow}>
                <View style={styles.subtaskBar}>
                  <ProgressBar
                    progress={subProgress}
                    height={5}
                    color={theme.primary[500]}
                    trackColor={theme.surfaceTertiary}
                  />
                </View>
                <Text style={[styles.subtaskCount, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                  {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
                </Text>
              </View>
            )}

            {task.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {task.tags.slice(0, 3).map((tag, i) => (
                  <Pressable
                    key={i}
                    disabled={!onTagPress}
                    hitSlop={4}
                    onPress={() => onTagPress?.(tag)}
                    style={[styles.tagChip, { backgroundColor: theme.surfaceSecondary }]}
                  >
                    <Text style={[styles.tagText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                      #{tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {isActive && (
              <View
                style={[
                  styles.statusBadge,
                  styles.activeBadge,
                  { backgroundColor: theme.infoSoft, shadowColor: theme.shadow.color },
                ]}
              >
                <ActivePulse color={theme.primary[500]} reduced={reduced} />
                <Text style={[styles.statusText, { color: theme.primary[isDark ? 300 : 600], fontFamily: typography.fontFamilySemiBold }]}>
                  {t('tasks.status.in_progress')}
                </Text>
              </View>
            )}
            {isPostponed && (
              <View style={[styles.statusBadge, { backgroundColor: theme.warningSoft }]}>
                <Text style={[styles.statusText, { color: theme.warning, fontFamily: typography.fontFamilySemiBold }]}>
                  {t('tasks.status.postponed')}
                </Text>
              </View>
            )}
          </View>
        </AnimatedPressable>
      </GestureDetector>
    </View>
  );
}

export const TaskCard = React.memo(TaskCardImpl);

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  actionBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  // Logical start/end styles mirror automatically with RTL.
  completeAction: {
    alignItems: 'flex-end',
    paddingEnd: spacing.xl,
  },
  secondaryAction: {
    alignItems: 'flex-start',
    paddingStart: spacing.xl,
  },
  actionContent: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilySemiBold,
  },
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 76,
  },
  priorityBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs + 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleArea: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.sizes.md,
    lineHeight: typography.sizes.md * 1.35,
  },
  description: {
    fontSize: typography.sizes.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: typography.sizes.xs,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  conflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  conflictText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilySemiBold,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  overdueText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilySemiBold,
  },
  mitBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: typography.sizes.xs,
  },
  durationText: {
    fontSize: typography.sizes.xs,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtaskBar: {
    flex: 1,
  },
  subtaskCount: {
    fontSize: typography.sizes.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  tagChip: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  tagText: {
    fontSize: typography.sizes.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  activeBadge: {
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.xs,
  },
});
