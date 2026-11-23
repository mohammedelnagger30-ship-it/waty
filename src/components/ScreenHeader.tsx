import { View, StyleSheet, Text } from 'react-native';
import { ReactNode } from 'react';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography } from '@/src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {right && <View style={styles.right}>{right}</View>}
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
  title: {
    fontSize: typography.sizes.xxl,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    marginTop: 2,
  },
  right: {
    marginLeft: spacing.md,
  },
});
