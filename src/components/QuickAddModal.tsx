import { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, TextInput } from 'react-native';
import { Clock, Check } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { ModalSheet } from './ModalSheet';
import { Button } from './Button';
import { Task } from '@/src/storage/entities';
import { createDefaultTask } from '@/src/utils/taskUtils';
import { todayISODate } from '@/src/storage/repository';

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (task: Task) => void;
  onMoreDetails?: (title: string, time: string) => void;
}

export function QuickAddModal({ visible, onClose, onAdd, onMoreDetails }: QuickAddModalProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setTime('');
    }
  }, [visible]);

  const handleAdd = () => {
    if (!title.trim()) return;
    const task = createDefaultTask({
      title: title.trim(),
      date: todayISODate(),
      time: time.trim() || undefined,
    });
    onAdd(task);
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
            onChangeText={setTitle}
            placeholder={t('tasks.quickAddPlaceholder')}
            placeholderTextColor={theme.text.tertiary}
            autoFocus
            style={[styles.input, { color: theme.text.primary, fontFamily: typography.fontFamily }]}
            onSubmitEditing={handleAdd}
          />
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

        {onMoreDetails ? (
          <Pressable onPress={() => onMoreDetails(title.trim(), time.trim())} style={styles.moreDetails}>
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
