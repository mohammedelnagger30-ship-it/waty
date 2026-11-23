import { View, StyleSheet, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { useTheme } from '@/src/context';
import { spacing, radius } from '@/src/theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  onPress?: () => void;
}

export function Card({ children, style, padded = true }: CardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 8,
          elevation: 3,
          borderWidth: 1,
          borderColor: theme.border,
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  padded: {
    padding: spacing.lg,
  },
});
