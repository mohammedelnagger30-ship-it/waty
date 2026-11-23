import { View, StyleSheet, Text } from 'react-native';
import { ReactNode } from 'react';
import { useTheme } from '@/src/context';
import { spacing, typography } from '@/src/theme';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: theme.surfaceSecondary }]}>
          {icon}
        </View>
      )}
      <Text style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.description, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
          {description}
        </Text>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.lg,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    lineHeight: typography.sizes.md * 1.5,
  },
  action: {
    marginTop: spacing.lg,
  },
});
