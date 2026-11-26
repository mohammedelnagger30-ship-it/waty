import { View, Text, StyleSheet } from 'react-native';
import { ReactNode } from 'react';
import { useTheme } from '@/src/context';
import { spacing, radius, typography } from '@/src/theme';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
}

export function StatCard({ icon, label, value, sublabel, color }: StatCardProps) {
  const { theme } = useTheme();
  const accent = color ?? theme.primary[500];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow.color,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>{icon}</View>
      <Text style={[styles.value, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>{label}</Text>
      {sublabel ? (
        <Text style={[styles.sublabel, { color: accent, fontFamily: typography.fontFamilySemiBold }]}>{sublabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '44%',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.sizes.xl,
  },
  label: {
    fontSize: typography.sizes.xs,
  },
  sublabel: {
    fontSize: typography.sizes.xs,
  },
});
