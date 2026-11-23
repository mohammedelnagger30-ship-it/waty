import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { Play, Pause, RotateCcw, SkipForward, Settings as SettingsIcon, Timer } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { Card } from './Card';
import { taskRepository, pomodoroRepository } from '@/src/storage';
import { generateId, nowISO } from '@/src/storage/repository';
import { PomodoroSession } from '@/src/storage/entities';
import { notifyFocusSessionComplete } from '@/src/notifications/notificationService';

interface PomodoroTimerProps {
  taskId: string;
  taskTitle?: string;
  estimatedMinutes?: number;
  actualMinutes: number;
  sessionsCompleted: number;
  onTimeUpdate: (addedMinutes: number) => void;
  onSessionComplete: () => void;
}

type Phase = 'focus' | 'break';
type TimerState = 'idle' | 'running' | 'paused';

export function PomodoroTimer({
  taskId,
  taskTitle,
  estimatedMinutes,
  actualMinutes,
  sessionsCompleted,
  onTimeUpdate,
  onSessionComplete,
}: PomodoroTimerProps) {
  const { theme } = useTheme();
  const { t } = useI18n();

  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [showSettings, setShowSettings] = useState(false);

  const [phase, setPhase] = useState<Phase>('focus');
  const [state, setState] = useState<TimerState>('idle');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('focus');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const recordSession = useCallback(
    async (type: Phase, durationMin: number) => {
      const session: PomodoroSession = {
        id: generateId(),
        taskId,
        durationMinutes: durationMin,
        type: type === 'focus' ? 'focus' : 'break',
        startedAt: new Date(Date.now() - durationMin * 60 * 1000).toISOString(),
        endedAt: nowISO(),
      };
      await pomodoroRepository.create(session);

      if (type === 'focus') {
        onTimeUpdate(durationMin);
        onSessionComplete();
        void notifyFocusSessionComplete(taskTitle);
      }
    },
    [taskId, taskTitle, onTimeUpdate, onSessionComplete],
  );

  const handleComplete = useCallback(() => {
    stopInterval();
    const completedPhase = phaseRef.current;
    const completedMinutes = completedPhase === 'focus' ? workMinutes : breakMinutes;

    recordSession(completedPhase, completedMinutes);

    // Switch to opposite phase
    const nextPhase: Phase = completedPhase === 'focus' ? 'break' : 'focus';
    const nextSeconds = nextPhase === 'focus' ? workMinutes * 60 : breakMinutes * 60;
    setPhase(nextPhase);
    setSecondsLeft(nextSeconds);
    setState('idle');
  }, [workMinutes, breakMinutes, recordSession]);

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      stopInterval();
    }
    return () => stopInterval();
  }, [state, handleComplete]);

  const handleStart = () => {
    if (state === 'idle' || state === 'paused') {
      setState('running');
    }
  };

  const handlePause = () => {
    setState('paused');
  };

  const handleReset = () => {
    stopInterval();
    setState('idle');
    setPhase('focus');
    setSecondsLeft(workMinutes * 60);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const totalSeconds = phase === 'focus' ? workMinutes * 60 : breakMinutes * 60;
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeDisplay = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const phaseColor = phase === 'focus' ? theme.primary[500] : theme.accent[500];
  const isRunning = state === 'running';

  // Circular progress
  const radiusVal = 110;
  const circumference = 2 * Math.PI * radiusVal;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '22' }]}>
          <Timer size={16} color={phaseColor} />
          <Text style={[styles.phaseText, { color: phaseColor, fontFamily: typography.fontFamilySemiBold }]}>
            {phase === 'focus' ? t('pomodoro.focus') : t('pomodoro.break')}
          </Text>
        </View>
        <Pressable onPress={() => setShowSettings(!showSettings)} hitSlop={8}>
          <SettingsIcon size={20} color={theme.text.tertiary} />
        </Pressable>
      </View>

      {/* Timer circle */}
      <View style={styles.circleContainer}>
        <View style={[styles.circle, { borderColor: phaseColor + '33' }]}>
          <View
            style={[
              styles.progressRing,
              {
                borderColor: phaseColor,
                borderTopWidth: 4,
                borderRightWidth: progress > 0.25 ? 4 : 0,
                borderBottomWidth: progress > 0.5 ? 4 : 0,
                borderLeftWidth: progress > 0.75 ? 4 : 0,
                transform: [{ rotate: '-90deg' }],
              },
            ]}
          />
          <View style={styles.timeDisplay}>
            <Text style={[styles.timeText, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
              {timeDisplay}
            </Text>
            <Text style={[styles.phaseLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {phase === 'focus' ? t('pomodoro.focus') : t('pomodoro.break')}
            </Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable onPress={handleReset} style={[styles.controlBtn, { backgroundColor: theme.surfaceSecondary }]} hitSlop={12}>
          <RotateCcw size={22} color={theme.text.secondary} />
        </Pressable>

        <Pressable
          onPress={isRunning ? handlePause : handleStart}
          style={[styles.playBtn, { backgroundColor: phaseColor }]}
        >
          {isRunning ? (
            <Pause size={28} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
          )}
        </Pressable>

        <Pressable onPress={handleSkip} style={[styles.controlBtn, { backgroundColor: theme.surfaceSecondary }]} hitSlop={12}>
          <SkipForward size={22} color={theme.text.secondary} />
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
            {sessionsCompleted}
          </Text>
          <Text style={[styles.statLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('pomodoro.completedSessions')}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
            {actualMinutes}{t('common.min')}
          </Text>
          <Text style={[styles.statLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('pomodoro.focusTime')}
          </Text>
        </View>
        {estimatedMinutes && estimatedMinutes > 0 && (
          <>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                {estimatedMinutes}{t('common.min')}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {t('tasks.estimatedTime')}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Custom settings */}
      {showSettings && (
        <View style={[styles.settingsPanel, { backgroundColor: theme.surfaceSecondary, borderRadius: radius.md }]}>
          <Text style={[styles.settingsLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('pomodoro.workDuration')}
          </Text>
          <View style={styles.durationRow}>
            {[15, 25, 30, 45, 50].map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setWorkMinutes(m);
                  if (phase === 'focus' && state === 'idle') setSecondsLeft(m * 60);
                }}
                style={[
                  styles.durationChip,
                  {
                    backgroundColor: workMinutes === m ? theme.primary[500] : theme.surface,
                    borderColor: workMinutes === m ? theme.primary[500] : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.durationText,
                    {
                      color: workMinutes === m ? '#FFFFFF' : theme.text.secondary,
                      fontFamily: typography.fontFamilySemiBold,
                    },
                  ]}
                >
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.settingsLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold, marginTop: spacing.md }]}>
            {t('pomodoro.breakDuration')}
          </Text>
          <View style={styles.durationRow}>
            {[5, 10, 15, 20].map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setBreakMinutes(m);
                  if (phase === 'break' && state === 'idle') setSecondsLeft(m * 60);
                }}
                style={[
                  styles.durationChip,
                  {
                    backgroundColor: breakMinutes === m ? theme.accent[500] : theme.surface,
                    borderColor: breakMinutes === m ? theme.accent[500] : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.durationText,
                    {
                      color: breakMinutes === m ? '#FFFFFF' : theme.text.secondary,
                      fontFamily: typography.fontFamilySemiBold,
                    },
                  ]}
                >
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  phaseText: {
    fontSize: typography.sizes.sm,
  },
  circleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  circle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  timeDisplay: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 52,
    letterSpacing: 2,
  },
  phaseLabel: {
    fontSize: typography.sizes.sm,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: typography.sizes.lg,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  settingsPanel: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  settingsLabel: {
    fontSize: typography.sizes.sm,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  durationChip: {
    width: 40,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: {
    fontSize: typography.sizes.sm,
  },
});
