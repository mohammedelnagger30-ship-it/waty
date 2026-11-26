import { View, StyleSheet, Text, Pressable } from 'react-native';
import { ReactNode } from 'react';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, iconSize } from '@/src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrow } from './BackArrow';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** Explicit leading slot; takes precedence over the built-in back button. */
  left?: ReactNode;
  /** Adds an RTL-aware back button in the leading slot. */
  onBack?: () => void;
  align?: 'start' | 'center';
}

/** One header for every screen: safe area, title hierarchy and optional actions. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  left,
  onBack,
  align = 'start',
}: ScreenHeaderProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const centered = align === 'center';
  const leading =
    left ??
    (onBack ? (
      <Pressable
        onPress={onBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        style={styles.iconButton}
      >
        <BackArrow size={iconSize.xxl} color={theme.text.primary} />
      </Pressable>
    ) : null);

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {leading ? (
          <View style={styles.side}>{leading}</View>
        ) : centered && right ? (
          <View style={styles.sideSpacer} />
        ) : null}

        <View style={[styles.textContainer, centered && styles.textCenter]}>
          <Text
            style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                { color: theme.text.tertiary, fontFamily: typography.fontFamily },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {right ? (
          <View style={[styles.side, styles.right]}>{right}</View>
        ) : centered && leading ? (
          <View style={styles.sideSpacer} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  textCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.xxl,
    lineHeight: typography.sizes.xxl * typography.lineHeights.tight,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    marginTop: 2,
  },
  side: {
    minWidth: iconSize.xxl + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSpacer: {
    width: iconSize.xxl + spacing.sm,
  },
  right: {
    marginStart: spacing.md,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: spacing.xs,
  },
});
