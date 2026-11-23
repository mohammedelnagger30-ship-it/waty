import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/src/context';
import { usePressAnimation } from '@/src/hooks/usePressAnimation';
import { haptics } from '@/src/utils/haptics';
import { spacing, radius, typography } from '@/src/theme';

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Chip({ children, selected = false, onPress, color }: ChipProps) {
  const { theme } = useTheme();
  const chipColor = color ?? theme.primary[500];
  const { onPressIn, onPressOut, style: pressStyle } = usePressAnimation({
    scaleTo: 0.94,
    opacityTo: 0.8,
    disabled: !onPress,
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        onPressIn();
        if (onPress) haptics.selection();
      }}
      onPressOut={onPressOut}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          // Colors stay in plain styles so a theme/palette or selection change
          // is reflected immediately; only the press feedback is animated.
          backgroundColor: selected ? chipColor : theme.surfaceSecondary,
          borderColor: selected ? chipColor : theme.border,
          borderWidth: selected ? 2 : 1.5,
          shadowColor: chipColor,
          shadowOpacity: selected ? (theme.isDark ? 0.42 : 0.26) : 0,
          shadowRadius: selected ? 9 : 0,
          elevation: selected && !theme.isDark ? 4 : 0,
        },
        pressStyle,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: selected ? '#FFFFFF' : theme.text.secondary,
            fontFamily: typography.fontFamilySemiBold,
          },
        ]}
      >
        {children}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  text: {
    fontSize: typography.sizes.sm,
  },
});
