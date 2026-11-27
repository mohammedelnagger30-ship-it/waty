import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Clock, Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius } from '@/src/theme';
import { Button } from './Button';
import { Chip } from './Chip';
import { ModalSheet } from './ModalSheet';

interface TimePickerFieldProps {
  /** HH:mm, or empty when no time is set. */
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  allowClear?: boolean;
  compact?: boolean;
}

interface ClockParts {
  hour: number;
  minute: number;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatTime(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

function parseTime(value?: string): ClockParts | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function clampPart(raw: string, max: number): number | null {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return null;
  return Math.min(max, Math.max(0, value));
}

/**
 * A tap-to-open time picker. Quick presets cover the common cases, and the
 * hour/minute steppers mean the user never has to guess the HH:mm format.
 */
export function TimePickerField({
  value,
  onChange,
  label,
  allowClear = false,
  compact = false,
}: TimePickerFieldProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [hourDraft, setHourDraft] = useState('09');
  const [minuteDraft, setMinuteDraft] = useState('00');

  const open = useCallback(() => {
    const parsed = parseTime(value);
    const now = new Date();
    setHourDraft(pad(parsed?.hour ?? now.getHours()));
    setMinuteDraft(pad(parsed?.minute ?? now.getMinutes()));
    setVisible(true);
  }, [value]);

  const apply = useCallback((hour: number, minute: number) => {
    onChange(formatTime(hour, minute));
    setVisible(false);
  }, [onChange]);

  const confirm = useCallback(() => {
    apply(clampPart(hourDraft, 23) ?? 0, clampPart(minuteDraft, 59) ?? 0);
  }, [apply, hourDraft, minuteDraft]);

  const step = (part: 'hour' | 'minute', delta: number) => {
    if (part === 'hour') {
      const current = clampPart(hourDraft, 23) ?? 0;
      setHourDraft(pad((current + delta + 24) % 24));
    } else {
      const current = clampPart(minuteDraft, 59) ?? 0;
      setMinuteDraft(pad((current + delta + 60) % 60));
    }
  };

  const applyQuick = (time: string) => {
    const now = new Date();
    let hour = now.getHours();
    let minute = now.getMinutes();
    if (time === 'hour') {
      hour = (hour + 1) % 24;
    } else {
      const parsed = parseTime(time);
      if (parsed) {
        hour = parsed.hour;
        minute = parsed.minute;
      }
    }
    apply(hour, minute);
  };

  const previewHour = clampPart(hourDraft, 23) ?? 0;
  const previewMinute = clampPart(minuteDraft, 59) ?? 0;
  const selected = parseTime(value);
  const display = selected
    ? `${formatTime(selected.hour, selected.minute)} ${selected.hour < 12 ? t('timePicker.am') : t('timePicker.pm')}`
    : allowClear
      ? t('timePicker.clear')
      : t('timePicker.select');

  return (
    <>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${display}` : display}
        style={[
          styles.field,
          compact && styles.compactField,
          {
            backgroundColor: theme.surfaceSecondary,
            borderColor: theme.border,
          },
        ]}
      >
        <Clock size={compact ? 18 : 20} color={theme.text.tertiary} style={styles.clock} />
        <View style={styles.fieldText}>
          {label ? (
            <Text style={[styles.label, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {label}
            </Text>
          ) : null}
          <Text
            numberOfLines={1}
            style={[
              styles.value,
              { color: selected ? theme.text.primary : theme.text.tertiary, fontFamily: typography.fontFamilySemiBold },
            ]}
          >
            {display}
          </Text>
        </View>
      </Pressable>

      <ModalSheet visible={visible} onClose={() => setVisible(false)} title={t('timePicker.title')}>
        <ScrollView
          contentContainerStyle={styles.sheet}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.preview, { color: theme.primary[500], fontFamily: typography.fontFamilyBold }]}>
            {`${formatTime(previewHour, previewMinute)} ${previewHour < 12 ? t('timePicker.am') : t('timePicker.pm')}`}
          </Text>

          <View style={styles.stepperRow}>
            <Stepper
              label={t('timePicker.hour')}
              value={hourDraft}
              max={23}
              onChangeText={(text) => setHourDraft(text.replace(/\D/g, '').slice(0, 2))}
              onDecrease={() => step('hour', -1)}
              onIncrease={() => step('hour', 1)}
              theme={theme}
            />
            <Text style={[styles.colon, { color: theme.text.tertiary }]}>:</Text>
            <Stepper
              label={t('timePicker.minute')}
              value={minuteDraft}
              max={59}
              onChangeText={(text) => setMinuteDraft(text.replace(/\D/g, '').slice(0, 2))}
              onDecrease={() => step('minute', -1)}
              onIncrease={() => step('minute', 1)}
              theme={theme}
            />
          </View>

          <View style={styles.quickRow}>
            <Chip onPress={() => applyQuick('now')}>{t('timePicker.now')}</Chip>
            <Chip onPress={() => applyQuick('hour')}>{t('timePicker.inHour')}</Chip>
            <Chip onPress={() => applyQuick('09:00')}>{t('tasks.time.morning')}</Chip>
            <Chip onPress={() => applyQuick('19:00')}>{t('tasks.time.evening')}</Chip>
            <Chip onPress={() => applyQuick('12:00')}>{t('timePicker.noon')}</Chip>
          </View>

          <View style={styles.actions}>
            {allowClear ? (
              <Button variant="ghost" onPress={() => { onChange(''); setVisible(false); }}>
                {t('timePicker.clear')}
              </Button>
            ) : null}
            <Button variant="ghost" onPress={() => setVisible(false)}>
              {t('common.cancel')}
            </Button>
            <Button onPress={confirm}>{t('timePicker.confirm')}</Button>
          </View>
        </ScrollView>
      </ModalSheet>
    </>
  );
}

function Stepper({
  label,
  value,
  onChangeText,
  onDecrease,
  onIncrease,
  theme,
}: {
  label: string;
  value: string;
  max: number;
  onChangeText: (text: string) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={styles.stepper}>
      <Text style={[styles.stepperLabel, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
        {label}
      </Text>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={onDecrease}
          accessibilityRole="button"
          accessibilityLabel={`${label}-`}
          style={[styles.stepButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
        >
          <Minus size={16} color={theme.text.secondary} />
        </Pressable>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          textAlign="center"
          style={[
            styles.stepInput,
            { color: theme.text.primary, backgroundColor: theme.surfaceSecondary, borderColor: theme.border, fontFamily: typography.fontFamilySemiBold },
          ]}
        />
        <Pressable
          onPress={onIncrease}
          accessibilityRole="button"
          accessibilityLabel={`${label}+`}
          style={[styles.stepButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
        >
          <Plus size={16} color={theme.text.secondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  compactField: {
    minHeight: 46,
  },
  clock: {
    marginEnd: spacing.sm,
  },
  fieldText: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: typography.sizes.xs,
  },
  value: {
    fontSize: typography.sizes.md,
  },
  sheet: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  preview: {
    fontSize: typography.sizes.xxl,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stepper: {
    flex: 1,
    gap: spacing.xs,
  },
  stepperLabel: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  stepButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  stepInput: {
    width: 62,
    height: 44,
    borderWidth: 1.5,
    borderRadius: radius.md,
    fontSize: typography.sizes.lg,
    paddingHorizontal: spacing.sm,
  },
  colon: {
    fontSize: typography.sizes.xl,
    marginTop: spacing.lg,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
