import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Plus, RefreshCw, X } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, radius, typography, iconSize } from '@/src/theme';
import { RecurringPlan, RecurringPlanMode, ReminderOffset } from '@/src/storage/entities';
import { notificationSettingsRepository } from '@/src/storage';
import { generateId, nowISO, todayISODate } from '@/src/storage/repository';
import { weekDays } from '@/src/utils/taskUtils';
import { formatRecurringSchedule } from '@/src/utils/recurringUtils';
import { Button } from './Button';
import { Chip } from './Chip';
import { Input } from './Input';
import { ModalSheet } from './ModalSheet';
import { TimePickerField } from './TimePickerField';

interface RecurringRow {
  id: string;
  title: string;
  time: string;
  mode: RecurringPlanMode;
  weekdays: number[];
  intervalDays: number;
  anchorDate: string;
}

interface RecurringPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (plans: RecurringPlan[]) => Promise<void> | void;
}

const DAY_NAMES_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function newRow(): RecurringRow {
  return {
    id: generateId(),
    title: '',
    time: '09:00',
    mode: 'weekdays',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    intervalDays: 2,
    anchorDate: todayISODate(),
  };
}

/** Enter several forever-repeating tasks at once, each with its own schedule. */
export function RecurringPlanModal({ visible, onClose, onSave }: RecurringPlanModalProps) {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const [rows, setRows] = useState<RecurringRow[]>([newRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setRows([newRow()]);
  }, [visible]);

  const dayNames = language === 'ar' ? DAY_NAMES_AR : DAY_NAMES_EN;

  const updateRow = useCallback((id: string, patch: Partial<RecurringRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const toggleDay = (id: string, day: number) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const weekdays = row.weekdays.includes(day)
      ? row.weekdays.filter((item) => item !== day)
      : [...row.weekdays, day].sort((a, b) => a - b);
    updateRow(id, { weekdays });
  };

  const handleSave = async () => {
    const filled = rows.filter((row) => row.title.trim().length > 0);
    if (filled.length === 0) {
      Alert.alert(t('plans.newRecurring'), t('planning.emptyRows'));
      return;
    }
    if (filled.some((row) => row.mode === 'weekdays' && row.weekdays.length === 0)) {
      Alert.alert(t('plans.newRecurring'), t('plans.recurringNeedDays'));
      return;
    }
    if (filled.some((row) => row.mode === 'interval' && row.intervalDays < 1)) {
      Alert.alert(t('plans.newRecurring'), t('plans.recurringNeedInterval'));
      return;
    }

    setSaving(true);
    try {
      const settings = await notificationSettingsRepository.getOrCreate();
      const offsets: ReminderOffset[] = Array.from(
        new Set<ReminderOffset>(['at_time', ...(settings.defaultReminders ?? [])]),
      );
      const timestamp = nowISO();
      const plans: RecurringPlan[] = filled.map((row) => ({
        id: generateId(),
        title: row.title.trim(),
        mode: row.mode,
        weekdays: row.mode === 'weekdays' ? [...row.weekdays].sort((a, b) => a - b) : undefined,
        intervalDays: row.mode === 'interval' ? Math.min(30, row.intervalDays) : undefined,
        anchorDate: row.anchorDate || todayISODate(),
        time: row.time || undefined,
        priority: 'medium',
        category: 'personal',
        tags: [],
        subtaskTitles: [],
        reminderOffsets: offsets,
        active: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
      await onSave(plans);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title={t('plans.newRecurring')}>
      <View style={styles.content}>
        <View style={styles.hintRow}>
          <RefreshCw size={16} color={theme.primary[500]} />
          <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('plans.recurringDesc')}
          </Text>
        </View>

        <ScrollView style={styles.rowsScroll} showsVerticalScrollIndicator={false}>
          {rows.map((row, index) => (
            <View
              key={row.id}
              style={[styles.row, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
            >
              <View style={styles.rowHeader}>
                <Text
                  style={[
                    styles.rowIndex,
                    { color: theme.text.tertiary, fontFamily: typography.fontFamilySemiBold },
                  ]}
                >
                  {index + 1}
                </Text>
                {rows.length > 1 ? (
                  <Button size="sm" variant="ghost" onPress={() => setRows((current) => current.filter((item) => item.id !== row.id))}>
                    <X size={16} color={theme.text.tertiary} />
                  </Button>
                ) : null}
              </View>

              <Input
                label={t('plans.recurringTitle')}
                value={row.title}
                onChangeText={(text) => updateRow(row.id, { title: text })}
                placeholder={t('plans.recurringTitle')}
              />
              <TimePickerField
                label={t('plans.recurringTime')}
                value={row.time}
                onChange={(time) => updateRow(row.id, { time })}
                allowClear
                compact
              />

              <Text style={[styles.sectionTitle, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
                {t('plans.scheduleMode')}
              </Text>
              <View style={styles.chipRow}>
                <Chip selected={row.mode === 'weekdays'} onPress={() => updateRow(row.id, { mode: 'weekdays' })}>
                  {t('plans.modeWeekdays')}
                </Chip>
                <Chip selected={row.mode === 'interval'} onPress={() => updateRow(row.id, { mode: 'interval' })}>
                  {t('plans.modeInterval')}
                </Chip>
              </View>

              {row.mode === 'weekdays' ? (
                <View style={styles.chipRow}>
                  {weekDays.map((day) => (
                    <Chip key={day} selected={row.weekdays.includes(day)} onPress={() => toggleDay(row.id, day)}>
                      {dayNames[day]}
                    </Chip>
                  ))}
                </View>
              ) : (
                <Input
                  label={t('plans.intervalDays')}
                  value={String(row.intervalDays)}
                  onChangeText={(text) => updateRow(row.id, { intervalDays: parseInt(text.replace(/\D/g, ''), 10) || 0 })}
                  placeholder="2"
                />
              )}

              <Input
                label={t('plans.startDate')}
                value={row.anchorDate}
                onChangeText={(text) => updateRow(row.id, { anchorDate: text })}
                placeholder={todayISODate()}
              />
              <Text style={[styles.summary, { color: theme.primary[500], fontFamily: typography.fontFamilySemiBold }]}>
                {formatRecurringSchedule(row, language)} · {t('plans.untilCancelled')}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.actions}>
          <Button variant="outline" size="sm" onPress={() => setRows((current) => [...current, newRow()])} icon={<Plus size={iconSize.sm} />}>
            {t('planning.addRow')}
          </Button>
          <Button onPress={handleSave} loading={saving} disabled={saving}>
            {t('common.save')}
          </Button>
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, maxHeight: '100%' },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  hint: { flex: 1, fontSize: typography.sizes.xs, lineHeight: typography.sizes.xs * typography.lineHeights.normal },
  rowsScroll: { flexGrow: 0 },
  row: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowIndex: { fontSize: typography.sizes.sm },
  sectionTitle: { fontSize: typography.sizes.xs, marginTop: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  summary: { fontSize: typography.sizes.xs, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'space-between' },
});
