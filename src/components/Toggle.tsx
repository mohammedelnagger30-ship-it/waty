import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { usePressAnimation } from '@/src/hooks/usePressAnimation';
import { haptics } from '@/src/utils/haptics';
import { radius } from '@/src/theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const TOGGLE_TIMING = { duration: 220, easing: Easing.out(Easing.cubic) };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

export function Toggle({ value, onValueChange, disabled = false }: ToggleProps) {
  const { theme } = useTheme();
  const { isRTL } = useI18n();
  const activeColor = theme.primary[500];
  const position = useSharedValue(value ? 1 : 0);
  const { onPressIn, onPressOut, style: pressStyle } = usePressAnimation({
    scaleTo: 0.95,
    opacityTo: 0.85,
    disabled,
  });

  useEffect(() => {
    position.value = withTiming(value ? 1 : 0, TOGGLE_TIMING);
  }, [value, position]);

  const thumbStyle = useAnimatedStyle(() => {
    const offset = interpolate(position.value, [0, 1], [2, 22]);
    return {
      transform: [{ translateX: isRTL ? -offset : offset }],
    };
  }, [isRTL]);

  return (
    <AnimatedPressable
      onPress={() => {
        if (disabled) return;
        haptics.selection();
        onValueChange(!value);
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={[
        styles.container,
        {
          // Track color changes with state immediately; the thumb slides.
          backgroundColor: value ? activeColor : theme.surfaceTertiary,
          shadowColor: activeColor,
          shadowOpacity: value ? 0.42 : 0,
          shadowRadius: value ? 10 : 0,
          elevation: value && !theme.isDark ? 4 : 0,
        },
        pressStyle,
      ]}
    >
      <AnimatedView
        style={[
          styles.thumb,
          {
            backgroundColor: '#FFFFFF',
            borderColor: activeColor,
            borderWidth: value ? 1.5 : 0,
            pointerEvents: 'none',
          },
          thumbStyle,
        ]}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 28,
    borderRadius: radius.pill,
    justifyContent: 'center',
    padding: 2,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
