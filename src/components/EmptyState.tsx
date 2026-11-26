import { View, StyleSheet, Text } from 'react-native';
import { ReactNode } from 'react';
import { useTheme } from '@/src/context';
import { spacing, typography, radius } from '@/src/theme';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      {icon && (
        <View
          style={[
            styles.iconContainer,
            compact && styles.compactIcon,
            { backgroundColor: theme.surfaceSecondary },
          ]}
        >
          {icon}
        </View>
      )}
      <Text
        style={[
          styles.title,
          compact && styles.compactTitle,
          { color: theme.text.primary, fontFamily: typography.fontFamilyBold },
        ]}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={[
            styles.description,
            compact && styles.compactDescription,
            { color: theme.text.tertiary, fontFamily: typography.fontFamily },
          ]}
        >
          {description}
        </Text>
      )}
      {action && <View style={[styles.action, compact && styles.compactAction]}>{action}</View>}
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
  compact: {
    flex: 0,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  compactIcon: {
    width: 40,
    height: 40,
    marginBottom: spacing.sm,
  },
  compactTitle: {
    fontSize: typography.sizes.sm,
  },
  compactDescription: {
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
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
  compactAction: {
    marginTop: spacing.sm,
  },
});
