import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BellRing, Plus, X } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius, useResponsive } from '@/src/theme';
import { Task, ReminderOffset } from '@/src/storage/entities';
import { notificationSettingsRepository } from '@/src/storage';
import { generateId, todayISODate } from '@/src/storage/repository';
import { createDefaultTask } from '@/src/utils/taskUtils';
import { Button } from './Button';
import { Chip } from './Chip';
import { Input } from './Input';
import { ModalSheet } from './ModalSheet';
import { TimePickerField } from './TimePickerField';

type BatchMode = 'day' | 'week';

interface PlanRow {
  id: string;
  title: string;
  time: string;
  date: string;
}

interface PlanBatchModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (tasks: Task[]) => Promise<void> | void;
  initialDate?: string;
}

const DAY_NAMES_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromISO(value: string): Date {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function startOfWeek(value: string): Date {
  const d = fromISO(value);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Lets the user enter a whole day or week of timed tasks in one sheet. */
export function PlanBatchModal({
  visible,
  onClose,
  onSave,
  initialDate,
}: PlanBatchModalProps) {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const responsive = useResponsive();

  const seedDate = initialDate || todayISODate();
  const [mode, setMode] = useState<BatchMode>('day');
  const [day, setDay] = useState(seedDate);
  const [rows, setRows] = useState<PlanRow[]>([
    { id: generateId(), title: '', time: '09:00', date: seedDate },
  ]);
  const [saving, setSaving] = useState(false);

  const dayNames = language === 'ar' ? DAY_NAMES_AR : DAY_NAMES_EN;
  const weekDays = useMemo(() => {
    const start = startOfWeek(seedDate);
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(start);
      d.setDate(d.getDate() + index);
      return { iso: toISO(d), label: dayNames[index] };
    });
  }, [seedDate, dayNames]);

  const updateRow = useCallback((id: string, patch: Partial<PlanRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const addRow = useCallback(() => {
    setRows((current) => [
      ...current,
      { id: generateId(), title: '', time: '09:00', date: current[0]?.date ?? seedDate },
    ]);
  }, [seedDate]);

  const removeRow = useCallback((id: string) => {
    setRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)));
  }, []);

  const shiftDay = (delta: number) => {
    const d = fromISO(day);
    d.setDate(d.getDate() + delta);
    setDay(toISO(d));
  };

  const changeMode = (next: BatchMode) => {
    if (next === 'week') {
      setRows((current) => current.map((row) => ({ ...row, date: row.date || day })));
    }
    setMode(next);
  };

  const handleSave = async () => {
    const filled = rows.filter((row) => row.title.trim().length > 0);
    if (filled.length === 0) {
      Alert.alert(t('planning.batchTitle'), t('planning.emptyRows'));
      return;
    }

    setSaving(true);
    try {
      const settings = await notificationSettingsRepository.getOrCreate();
      // Always include the on-time alarm, plus whatever the user configured globally.
      const offsets: ReminderOffset[] = Array.from(
        new Set<ReminderOffset>(['at_time', ...(settings.defaultReminders ?? [])]),
      );
      const tasks = filled.map((row) =>
        createDefaultTask({
          title: row.title.trim(),
          date: mode === 'day' ? day : row.date,
          time: row.time || undefined,
          reminderOffsets: offsets,
        }),
      );
      await onSave(tasks);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title={t('planning.batchTitle')}>
      <View style={styles.content}>
        <View style={styles.modeRow}>
          <Chip selected={mode === 'day'} onPress={() => changeMode('day')}>
            {t('planning.batchDay')}
          </Chip>
          <Chip selected={mode === 'week'} onPress={() => changeMode('week')}>
            {t('planning.batchWeek')}
          </Chip>
        </View>

        <View style={styles.hintRow}>
          <BellRing size={16} color={theme.primary[500]} />
          <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('planning.batchDesc')}
          </Text>
        </View>

        {mode === 'day' && (
          <View style={styles.dateRow}>
            <Button size="sm" variant="ghost" onPress={() => shiftDay(-1)}>
              ‹
            </Button>
            <Text style={[styles.dateText, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
              {day}
            </Text>
            <Button size="sm" variant="ghost" onPress={() => shiftDay(1)}>
              ›
            </Button>
          </View>
        )}

        <ScrollView
          style={[styles.rowsScroll, { maxHeight: responsive.isShortLandscape ? 200 : 380 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {rows.map((row, index) => (
            <View
              key={row.id}
              style={[styles.row, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
            >
              <View style={styles.rowHeader}>
                <Text style={[styles.rowIndex, { color: theme.text.tertiary, fontFamily: typography.fontFamilySemiBold }]}>
                  {index + 1}
                </Text>
                {rows.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => removeRow(row.id)}
                  >
                    <X size={16} color={theme.text.tertiary} />
                  </Button>
                )}
              </View>
              <Input
                label={t('planning.rowTitle')}
                value={row.title}
                onChangeText={(text) => updateRow(row.id, { title: text })}
                placeholder={t('planning.rowTitle')}
              />
              <TimePickerField
                label={t('planning.rowTime')}
                value={row.time}
                onChange={(time) => updateRow(row.id, { time })}
                allowClear
                compact
              />
              {mode === 'week' && (
                <View style={styles.dayChips}>
                  {weekDays.map((item) => (
                    <Chip
                      key={item.iso}
                      selected={row.date === item.iso}
                      onPress={() => updateRow(row.id, { date: item.iso })}
                    >
                      {item.label}
                    </Chip>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.actions}>
          <Button variant="outline" size="sm" onPress={addRow} icon={<Plus size={16} />}>
            {t('planning.addRow')}
          </Button>
          <Button onPress={handleSave} loading={saving} disabled={saving}>
            {t('planning.savePlan')}
          </Button>
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  hint: {
    flex: 1,
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.xs * 1.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dateText: {
    minWidth: 110,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
  },
  rowsScroll: {
    maxHeight: 380,
  },
  row: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowIndex: {
    fontSize: typography.sizes.xs,
  },
  dayChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
