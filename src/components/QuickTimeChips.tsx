import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography } from '@/src/theme';
import { Chip } from './Chip';
import { getQuickTimePresets, type QuickTimePreset } from '@/src/utils/taskUtils';

interface QuickTimeChipsProps {
  onSelect: (preset: QuickTimePreset) => void;
  date: string;
  time: string;
}

/**
 * One-tap date/time presets. Reused by quick-add and the full task form so
 * setting a time never requires typing YYYY-MM-DD or HH:mm by hand.
 */
export function QuickTimeChips({ onSelect, date, time }: QuickTimeChipsProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const presets = getQuickTimePresets();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
        {t('tasks.quickTime')}
      </Text>
      <View style={styles.row}>
        {presets.map((preset) => (
          <Chip
            key={preset.key}
            selected={preset.key !== 'clear' && preset.date === date && preset.time === time}
            onPress={() => onSelect(preset)}
          >
            {t(`tasks.time.${preset.key}` as Parameters<typeof t>[0])}
          </Chip>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
});
