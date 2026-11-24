import { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, TextInput } from 'react-native';
import { Clock, Check } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { ModalSheet } from './ModalSheet';
import { Button } from './Button';
import { Chip } from './Chip';
import { Task, TaskPriority } from '@/src/storage/entities';
import { createDefaultTask, allPriorities, priorityColors } from '@/src/utils/taskUtils';
import { todayISODate } from '@/src/storage/repository';
import { QuickTimeChips } from './QuickTimeChips';
import { parseSmartInput } from '@/src/utils/smartInput';

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (task: Task) => void | Promise<void>;
  onMoreDetails?: (title: string, date: string, time: string, priority: TaskPriority) => void;
}

export function QuickAddModal({ visible, onClose, onAdd, onMoreDetails }: QuickAddModalProps) {
  const { theme, isDark } = useTheme();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISODate());
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [detected, setDetected] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDate(todayISODate());
      setTime('');
      setPriority('medium');
      setDetected([]);
    }
  }, [visible]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    const parsed = parseSmartInput(value);
    setDetected(parsed.detected);
    if (parsed.date) setDate(parsed.date);
    if (parsed.time) setTime(parsed.time);
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    const parsed = parseSmartInput(title);
    const task = createDefaultTask({
      title: (parsed.title || title).trim(),
      date: parsed.date ?? date,
      time: (parsed.time ?? time).trim() || undefined,
      priority,
    });
    // Wait for storage before closing so the new task is never "lost".
    await onAdd(task);
    onClose();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title={t('tasks.quickAdd')}>
      <View style={styles.form}>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.surfaceSecondary,
              borderColor: theme.border,
              borderRadius: radius.md,
            },
          ]}
        >
          <TextInput
            value={title}
            onChangeText={handleTitleChange}
            placeholder={t('tasks.quickAddPlaceholder')}
            placeholderTextColor={theme.text.tertiary}
            autoFocus
            style={[styles.input, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
            onSubmitEditing={handleAdd}
          />
        </View>

        {detected.length > 0 ? (
          <Text
            numberOfLines={1}
            style={[
              styles.detected,
              { color: theme.primary[500], fontFamily: typography.fontFamilySemiBold },
            ]}
          >
            ✓ {detected.join('  •  ')}
          </Text>
        ) : null}

        <View style={styles.priorityRow}>
          {allPriorities.map((p) => {
            const colors = priorityColors[p];
            return (
              <Chip
                key={p}
                selected={priority === p}
                color={isDark ? colors.dark : colors.light}
                onPress={() => setPriority(p)}
              >
                {t(`tasks.priority.${p}` as Parameters<typeof t>[0])}
              </Chip>
            );
          })}
        </View>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.surfaceSecondary,
              borderColor: theme.border,
              borderRadius: radius.md,
            },
          ]}
        >
          <Clock size={20} color={theme.text.tertiary} style={{ marginEnd: spacing.sm }} />
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="HH:mm"
            placeholderTextColor={theme.text.tertiary}
            keyboardType="numbers-and-punctuation"
            style={[styles.input, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
          />
        </View>

        <QuickTimeChips
          date={date}
          time={time}
          onSelect={(preset) => {
            setDate(preset.date);
            setTime(preset.time);
          }}
        />

        {onMoreDetails ? (
          <Pressable
            onPress={() => {
              const parsed = parseSmartInput(title);
              onMoreDetails(
                (parsed.title || title).trim(),
                parsed.date ?? date,
                (parsed.time ?? time).trim(),
                priority,
              );
            }}
            style={styles.moreDetails}
          >
            <Text style={[styles.moreDetailsText, { color: theme.primary[500], fontFamily: typography.fontFamilySemiBold }]}>
              {t('tasks.addDetails')}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <Button variant="ghost" onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onPress={handleAdd}
            disabled={!title.trim()}
            icon={<Check size={18} color="#FFFFFF" />}
          >
            {t('common.add')}
          </Button>
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  detected: {
    fontSize: typography.sizes.sm,
    marginTop: -spacing.sm,
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    paddingVertical: spacing.sm,
  },
  moreDetails: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  moreDetailsText: {
    fontSize: typography.sizes.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
