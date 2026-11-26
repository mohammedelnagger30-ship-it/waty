import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Habit, HabitFrequency } from '@/src/storage/entities';
import { generateId } from '@/src/storage/repository';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography } from '@/src/theme';
import { weekDays } from '@/src/utils/taskUtils';
import { Button } from './Button';
import { Chip } from './Chip';
import { Input } from './Input';
import { ModalSheet } from './ModalSheet';
import { TimePickerField } from './TimePickerField';

const COLORS = ['#1A9FE8', '#8B5CF6', '#22C55E', '#F59E0B', '#EC4899', '#14B8A6', '#6366F1', '#DC2626'];
const FREQUENCIES: HabitFrequency[] = ['daily', 'weekly', 'custom'];

interface HabitFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (habit: Habit) => void;
  onDelete?: () => void;
  editingHabit?: Habit | null;
}

export function HabitFormModal({ visible, onClose, onSave, onDelete, editingHabit }: HabitFormModalProps) {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (!visible) return;
    if (editingHabit) {
      setTitle(editingHabit.title);
      setDescription(editingHabit.description ?? '');
      setFrequency(editingHabit.frequency);
      setCustomDays(editingHabit.customDays ?? []);
      setReminderTime(editingHabit.reminderTime ?? '09:00');
      setColor(editingHabit.color ?? COLORS[0]);
    } else {
      setTitle('');
      setDescription('');
      setFrequency('daily');
      setCustomDays([1, 2, 3, 4, 5]);
      setReminderTime('09:00');
      setColor(COLORS[0]);
    }
  }, [visible, editingHabit]);

  const toggleDay = (day: number) => {
    setCustomDays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day].sort()));
  };

  const save = () => {
    if (!title.trim()) return;
    const habit: Habit = {
      id: editingHabit?.id ?? generateId(),
      title: title.trim(),
      description: description.trim() || undefined,
      frequency,
      customDays: frequency === 'custom' ? customDays : undefined,
      reminderTime,
      color,
      streak: editingHabit?.streak ?? 0,
      bestStreak: editingHabit?.bestStreak ?? 0,
      completedDates: editingHabit?.completedDates ?? [],
      lastCompletedDate: editingHabit?.lastCompletedDate,
      createdAt: editingHabit?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(habit);
  };

  const dayNames = language === 'ar'
    ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <ModalSheet visible={visible} onClose={onClose} title={editingHabit ? t('plans.editHabit') : t('plans.newHabit')}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Input label={t('plans.habitTitle')} value={title} onChangeText={setTitle} placeholder={t('plans.habitTitle')} />
        <Input label={t('plans.habitDescription')} value={description} onChangeText={setDescription} multiline numberOfLines={2} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.frequency')}
          </Text>
          <View style={styles.chipRow}>
            {FREQUENCIES.map((item) => (
              <Chip key={item} selected={frequency === item} onPress={() => setFrequency(item)}>
                {item === 'daily' ? t('plans.daily') : item === 'weekly' ? t('plans.weekly') : t('plans.custom')}
              </Chip>
            ))}
          </View>
        </View>

        {frequency === 'custom' ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
              {t('plans.customDays')}
            </Text>
            <View style={styles.days}>
              {weekDays.map((day) => (
                <Chip key={day} selected={customDays.includes(day)} onPress={() => toggleDay(day)}>
                  {dayNames[day]}
                </Chip>
              ))}
            </View>
          </View>
        ) : null}

        <TimePickerField label={t('plans.reminderTime')} value={reminderTime} onChange={setReminderTime} compact />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
            {t('plans.color')}
          </Text>
          <View style={styles.colors}>
            {COLORS.map((item) => (
              <Pressable
                key={item}
                onPress={() => setColor(item)}
                style={[styles.colorDot, { backgroundColor: item, borderColor: color === item ? theme.text.primary : 'transparent' }]}
              >
                {color === item ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Button onPress={save} fullWidth>
            {t('common.save')}
          </Button>
          {editingHabit && onDelete ? (
            <Button variant="danger" onPress={onDelete} fullWidth>
              {t('plans.deleteHabit')}
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    // RN ScrollView defaults to flexGrow: 1, which makes short forms expand
    // to the sheet's max height and leaves a blank white band over the page.
    flexGrow: 0,
    flexShrink: 1,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  colors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
