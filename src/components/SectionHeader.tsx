import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { useTheme } from '@/src/context';
import { spacing, radius, typography, iconSize } from '@/src/theme';

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  count?: string | number;
  color?: string;
  style?: ViewStyle;
}

/** Shared card/section heading: icon, title, optional description and count. */
export function SectionHeader({
  icon,
  title,
  description,
  count,
  color,
  style,
}: SectionHeaderProps) {
  const { theme } = useTheme();
  const accent = color ?? theme.primary[500];

  return (
    <View style={[styles.row, style]}>
      {icon && (
        <LinearGradient
          colors={[`${accent}2E`, `${accent}12`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.iconWrap, { borderColor: `${accent}33` }]}
        >
          {icon}
        </LinearGradient>
      )}
      <View style={styles.text}>
        <Text
          style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}
        >
          {title}
        </Text>
        {description && (
          <Text
            style={[
              styles.description,
              { color: theme.text.tertiary, fontFamily: typography.fontFamily },
            ]}
          >
            {description}
          </Text>
        )}
      </View>
      {count !== undefined && (
        <View style={[styles.count, { backgroundColor: `${accent}1C` }]}>
          <Text
            style={[styles.countText, { color: accent, fontFamily: typography.fontFamilySemiBold }]}
          >
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.sizes.md,
  },
  description: {
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
  },
  count: {
    minWidth: iconSize.xxl + spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: typography.sizes.xs,
  },
});
