import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
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
  editingPlan?: RecurringPlan | null;
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

function planToRow(plan: RecurringPlan): RecurringRow {
  return {
    id: plan.id,
    title: plan.title,
    time: plan.time ?? '09:00',
    mode: plan.mode,
    weekdays: [...(plan.weekdays ?? [])],
    intervalDays: plan.intervalDays ?? 2,
    anchorDate: plan.anchorDate,
  };
}

/** Enter several forever-repeating tasks at once, each with its own schedule. */
export function RecurringPlanModal({ visible, onClose, onSave, editingPlan }: RecurringPlanModalProps) {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const { height: screenHeight } = useWindowDimensions();
  const isEditing = editingPlan != null;
  const modalTitle = isEditing ? t('plans.editRecurring') : t('plans.newRecurring');
  const scrollRef = useRef<ScrollView>(null);
  const [rows, setRows] = useState<RecurringRow[]>(() => [newRow()]);
  const [saving, setSaving] = useState(false);

  // Keep the rows area bounded so the sheet can scroll instead of clipping
  // rows and the save button on small screens/landscape keyboards.
  const rowsMaxHeight = useMemo(
    () => Math.max(180, Math.min(420, Math.round(screenHeight * 0.42))),
    [screenHeight],
  );

  useEffect(() => {
    if (!visible) return;
    setRows(editingPlan ? [planToRow(editingPlan)] : [newRow()]);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [visible, editingPlan]);

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
      Alert.alert(modalTitle, t('planning.emptyRows'));
      return;
    }
    if (filled.some((row) => row.mode === 'weekdays' && row.weekdays.length === 0)) {
      Alert.alert(modalTitle, t('plans.recurringNeedDays'));
      return;
    }
    if (filled.some((row) => row.mode === 'interval' && row.intervalDays < 1)) {
      Alert.alert(modalTitle, t('plans.recurringNeedInterval'));
      return;
    }

    setSaving(true);
    try {
      const settings = await notificationSettingsRepository.getOrCreate();
      const defaults: ReminderOffset[] = Array.from(
        new Set<ReminderOffset>(['at_time', ...(settings.defaultReminders ?? [])]),
      );
      const timestamp = nowISO();
      const plans: RecurringPlan[] = filled.map((row) => {
        const base = editingPlan?.id === row.id ? editingPlan : undefined;
        return {
          ...base,
          id: row.id,
          title: row.title.trim(),
          mode: row.mode,
          weekdays: row.mode === 'weekdays' ? [...row.weekdays].sort((a, b) => a - b) : undefined,
          intervalDays: row.mode === 'interval' ? Math.min(30, row.intervalDays) : undefined,
          anchorDate: row.anchorDate || todayISODate(),
          time: row.time || undefined,
          priority: base?.priority ?? 'medium',
          category: base?.category ?? 'personal',
          tags: base ? [...base.tags] : [],
          subtaskTitles: base ? [...base.subtaskTitles] : [],
          reminderOffsets: base ? [...(base.reminderOffsets ?? defaults)] : defaults,
          active: base ? base.active !== false : true,
          createdAt: base?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
      });
      await onSave(plans);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title={modalTitle}>
      <View style={styles.content}>
        <View style={styles.hintRow}>
          <RefreshCw size={16} color={theme.primary[500]} />
          <Text style={[styles.hint, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {t('plans.recurringDesc')}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={[styles.rowsScroll, { maxHeight: rowsMaxHeight }]}
          contentContainerStyle={styles.rowsContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                  >
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
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onPress={() => setRows((current) => [...current, newRow()])}
              icon={<Plus size={iconSize.sm} />}
            >
              {t('planning.addRow')}
            </Button>
          ) : (
            <View />
          )}
          <Button onPress={handleSave} loading={saving} disabled={saving}>
            {t('common.save')}
          </Button>
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, flexShrink: 1, minHeight: 0 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  hint: { flex: 1, fontSize: typography.sizes.xs, lineHeight: typography.sizes.xs * typography.lineHeights.normal },
  rowsScroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  rowsContent: { paddingBottom: spacing.xs },
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
