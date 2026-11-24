import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, View, StyleSheet, Text, Pressable } from 'react-native';
import { Play, Pause, RotateCcw, SkipForward, Settings as SettingsIcon, Timer } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { Card } from './Card';
import { Chip } from './Chip';
import { pomodoroRepository, settingsRepository } from '@/src/storage';
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

type Phase = 'focus' | 'break' | 'longBreak';
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
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [autoStart, setAutoStart] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [phase, setPhase] = useState<Phase>('focus');
  const [state, setState] = useState<TimerState>('idle');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('focus');
  const focusCountRef = useRef(0);
  const secondsRef = useRef(25 * 60);
  const deadlineRef = useRef<number | null>(null);
  const phaseStartedAtRef = useRef(Date.now());
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Durations are stored in Settings so every task uses the same preferences.
  useEffect(() => {
    let mounted = true;
    void settingsRepository.getOrCreate().then((settings) => {
      if (!mounted) return;
      const work = settings.focusMinutes ?? 25;
      setWorkMinutes(work);
      setBreakMinutes(settings.breakMinutes ?? 5);
      setLongBreakMinutes(settings.longBreakMinutes ?? 15);
      setAutoStart(!!settings.autoStartNextPhase);
      secondsRef.current = work * 60;
      setSecondsLeft(work * 60);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

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
    const configuredMinutes =
      completedPhase === 'focus'
        ? workMinutes
        : completedPhase === 'break'
          ? breakMinutes
          : longBreakMinutes;
    // Count real elapsed time so backgrounded/late completions stay accurate.
    const elapsedMs = Math.max(0, Date.now() - phaseStartedAtRef.current);
    const completedMinutes = Math.max(
      1,
      Math.min(configuredMinutes, Math.round(elapsedMs / 60000)),
    );

    void recordSession(completedPhase, completedMinutes);

    // A long break follows every 4 completed focus sessions.
    let nextPhase: Phase;
    if (completedPhase === 'focus') {
      focusCountRef.current += 1;
      nextPhase = focusCountRef.current % 4 === 0 ? 'longBreak' : 'break';
    } else {
      nextPhase = 'focus';
    }
    const nextSeconds =
      (nextPhase === 'focus'
        ? workMinutes
        : nextPhase === 'break'
          ? breakMinutes
          : longBreakMinutes) * 60;
    secondsRef.current = nextSeconds;
    setPhase(nextPhase);
    setSecondsLeft(nextSeconds);
    setState(autoStart ? 'running' : 'idle');
    phaseStartedAtRef.current = Date.now();
    pausedAtRef.current = null;
    deadlineRef.current = autoStart ? Date.now() + nextSeconds * 1000 : null;
  }, [workMinutes, breakMinutes, longBreakMinutes, autoStart, recordSession, stopInterval]);

  useEffect(() => {
    if (state !== 'running') {
      stopInterval();
      return;
    }

    const tick = () => {
      if (deadlineRef.current === null) return;
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      secondsRef.current = remaining;
      setSecondsLeft(remaining);
      if (remaining <= 0) handleComplete();
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => stopInterval();
  }, [state, handleComplete, stopInterval]);

  // Stop the JS ticker while backgrounded; the deadline is wall-clock based,
  // so the timer catches up on resume without keeping the renderer awake.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        stopInterval();
        return;
      }
      if (state === 'running' && deadlineRef.current !== null) {
        const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
        secondsRef.current = remaining;
        setSecondsLeft(remaining);
        if (remaining <= 0) handleComplete();
      }
    });
    return () => subscription.remove();
  }, [state, handleComplete, stopInterval]);

  const handleStart = () => {
    if (state === 'idle' || state === 'paused') {
      if (secondsRef.current <= 0) {
        secondsRef.current = workMinutes * 60;
        setSecondsLeft(secondsRef.current);
      }
      if (state === 'idle') {
        phaseStartedAtRef.current = Date.now();
      } else if (pausedAtRef.current !== null) {
        // Paused time must not be counted as focus time.
        phaseStartedAtRef.current += Date.now() - pausedAtRef.current;
      }
      pausedAtRef.current = null;
      deadlineRef.current = Date.now() + secondsRef.current * 1000;
      setState('running');
    }
  };

  const handlePause = () => {
    if (state === 'running' && deadlineRef.current !== null) {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      secondsRef.current = remaining;
      setSecondsLeft(remaining);
      pausedAtRef.current = Date.now();
      deadlineRef.current = null;
    }
    stopInterval();
    setState('paused');
  };

  const handleReset = () => {
    stopInterval();
    deadlineRef.current = null;
    pausedAtRef.current = null;
    phaseStartedAtRef.current = Date.now();
    setState('idle');
    setPhase('focus');
    secondsRef.current = workMinutes * 60;
    setSecondsLeft(secondsRef.current);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const applyDuration = (which: 'work' | 'break' | 'longBreak', minutes: number) => {
    if (which === 'work') {
      setWorkMinutes(minutes);
      void settingsRepository.patch({ focusMinutes: minutes });
    } else if (which === 'break') {
      setBreakMinutes(minutes);
      void settingsRepository.patch({ breakMinutes: minutes });
    } else {
      setLongBreakMinutes(minutes);
      void settingsRepository.patch({ longBreakMinutes: minutes });
    }
    const active = which === phase || (which === 'break' && phase === 'longBreak');
    if (active && state === 'idle') {
      secondsRef.current = minutes * 60;
      setSecondsLeft(secondsRef.current);
    }
  };

  const toggleAutoStart = () => {
    const next = !autoStart;
    setAutoStart(next);
    void settingsRepository.patch({ autoStartNextPhase: next });
  };

  const totalSeconds =
    (phase === 'focus'
      ? workMinutes
      : phase === 'break'
        ? breakMinutes
        : longBreakMinutes) * 60;
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeDisplay = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const phaseLabel =
    phase === 'focus'
      ? t('pomodoro.focus')
      : phase === 'break'
        ? t('pomodoro.break')
        : t('pomodoro.longBreak');
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
            {phaseLabel}
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
              {phaseLabel}
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
                onPress={() => applyDuration('work', m)}
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
                onPress={() => applyDuration('break', m)}
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

          <Text style={[styles.settingsLabel, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold, marginTop: spacing.md }]}>
            {t('pomodoro.longBreakDuration')}
          </Text>
          <View style={styles.durationRow}>
            {[10, 15, 20, 30].map((m) => (
              <Pressable
                key={m}
                onPress={() => applyDuration('longBreak', m)}
                style={[
                  styles.durationChip,
                  {
                    backgroundColor: longBreakMinutes === m ? theme.accent[500] : theme.surface,
                    borderColor: longBreakMinutes === m ? theme.accent[500] : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.durationText,
                    {
                      color: longBreakMinutes === m ? '#FFFFFF' : theme.text.secondary,
                      fontFamily: typography.fontFamilySemiBold,
                    },
                  ]}
                >
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Chip selected={autoStart} onPress={toggleAutoStart}>
              {t('pomodoro.autoStart')}
            </Chip>
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
