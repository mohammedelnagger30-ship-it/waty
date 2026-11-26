import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/context';
import { spacing, typography } from '@/src/theme';

interface LoadingStateProps {
  label?: string;
  action?: ReactNode;
}

/** One themed loading state for every screen and empty-data branch. */
export function LoadingState({ label, action }: LoadingStateProps) {
  const { theme } = useTheme();

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size="large" color={theme.primary[500]} />
      {label ? (
        <Text
          style={[styles.label, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}
        >
          {label}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  label: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.sm,
  },
});
