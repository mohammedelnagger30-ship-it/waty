import { View, StyleSheet, Text, ScrollView, Pressable } from 'react-native';
import { Clock, Play } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { ModalSheet } from './ModalSheet';
import { Task } from '@/src/storage/entities';
import { categoryColors } from '@/src/utils/taskUtils';

interface FocusTaskPickerModalProps {
  visible: boolean;
  onClose: () => void;
  tasks: Task[];
  onSelect: (task: Task) => void;
  title?: string;
}

/** Generic task picker used by "Start focus" and "new template from task". */
export function FocusTaskPickerModal({ visible, onClose, tasks, onSelect, title }: FocusTaskPickerModalProps) {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <ModalSheet visible={visible} onClose={onClose} title={title ?? t('today.startFocus')}>
      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('tasks.noTasks')}
          </Text>
          <Text style={[styles.emptyDesc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('tasks.noTasksDesc')}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {tasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => { onSelect(task); onClose(); }}
              style={[
                styles.item,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.border,
                  borderRadius: radius.md,
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: categoryColors[task.category] }]} />
              <View style={styles.itemText}>
                <Text style={[styles.itemTitle, { color: theme.text.primary, fontFamily: typography.fontFamily }]} numberOfLines={1}>
                  {task.title}
                </Text>
                {task.time ? (
                  <View style={styles.metaRow}>
                    <Clock size={12} color={theme.text.tertiary} />
                    <Text style={[styles.metaText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                      {task.time}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Play size={18} color={theme.primary[500]} fill={theme.primary[500]} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 420,
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: typography.sizes.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: typography.sizes.xs,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
  },
  emptyDesc: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
});
