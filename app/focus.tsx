import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import { Target, ListFilter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius, bottomSpace } from '@/src/theme';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { PomodoroTimer } from '@/src/components/PomodoroTimer';
import { FocusTaskPickerModal } from '@/src/components/FocusTaskPickerModal';
import { taskRepository } from '@/src/storage';
import { Task } from '@/src/storage/entities';

/** Full-screen focus mode: same timer as task details, without the task list noise. */
export default function FocusScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [actualMinutes, setActualMinutes] = useState(0);
  const [sessions, setSessions] = useState(0);

  useFocusEffect(
    useCallback(() => {
      void taskRepository.getAll().then((all) => {
        setTasks(all.filter((task) => task.status !== 'done' && task.status !== 'cancelled'));
      });
    }, []),
  );

  const onTimeUpdate = async (addedMinutes: number) => {
    setActualMinutes((value) => value + addedMinutes);
    if (selected) {
      const updated = await taskRepository.update(selected.id, {
        actualMinutes: selected.actualMinutes + addedMinutes,
      });
      if (updated) setSelected(updated);
    }
  };

  const onSessionComplete = async () => {
    setSessions((value) => value + 1);
    if (selected) {
      const updated = await taskRepository.update(selected.id, {
        pomodoroSessions: selected.pomodoroSessions + 1,
      });
      if (updated) setSelected(updated);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('pomodoro.title')} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={[
            styles.taskPicker,
            { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.lg },
          ]}
        >
          <Target size={20} color={theme.primary[500]} />
          <View style={styles.pickerText}>
            <Text style={[styles.pickerLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('focusScreen.chooseTask')}
            </Text>
            <Text style={[styles.pickerValue, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
              {selected?.title ?? t('focusScreen.free')}
            </Text>
          </View>
          <ListFilter size={20} color={theme.text.tertiary} />
        </Pressable>

        <PomodoroTimer
          taskId={selected?.id ?? 'free-focus'}
          taskTitle={selected?.title ?? t('focusScreen.free')}
          estimatedMinutes={selected?.estimatedMinutes}
          actualMinutes={selected ? selected.actualMinutes : actualMinutes}
          sessionsCompleted={selected ? selected.pomodoroSessions : sessions}
          onTimeUpdate={onTimeUpdate}
          onSessionComplete={onSessionComplete}
        />
      </ScrollView>

      <FocusTaskPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        tasks={tasks}
        onSelect={setSelected}
        title={t('focusScreen.chooseTask')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { fontSize: typography.sizes.lg, flex: 1 },
  content: { padding: spacing.lg, paddingBottom: bottomSpace.normal },
  taskPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  pickerText: { flex: 1, gap: 2 },
  pickerLabel: { fontSize: typography.sizes.xs },
  pickerValue: { fontSize: typography.sizes.md },
});
