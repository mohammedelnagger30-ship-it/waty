import { useCallback, useEffect } from 'react';
import { useSharedValue, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';
import { useReducedMotion } from './useReducedMotion';

interface PressAnimationOptions {
  /** Scale while the control is held down. */
  scaleTo?: number;
  /** Opacity while the control is held down. */
  opacityTo?: number;
  /** Resting opacity (used for disabled states). */
  baseOpacity?: number;
  /** Disable all press feedback. */
  disabled?: boolean;
}

const IN_TIMING = { duration: 90, easing: Easing.out(Easing.quad) };
const OUT_TIMING = { duration: 150, easing: Easing.out(Easing.cubic) };

/**
 * Shared spring-based press feedback. Returns an animated style to spread last
 * in the component's style array plus handlers for Pressable.
 */
export function usePressAnimation({
  scaleTo = 0.96,
  opacityTo = 0.85,
  baseOpacity = 1,
  disabled = false,
}: PressAnimationOptions = {}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(baseOpacity);

  // Keep the resting opacity in sync when a control becomes enabled/disabled.
  useEffect(() => {
    opacity.value = baseOpacity;
  }, [baseOpacity, opacity]);

  const onPressIn = useCallback(() => {
    if (disabled || reduced) return;
    scale.value = withTiming(scaleTo, IN_TIMING);
    opacity.value = withTiming(opacityTo, IN_TIMING);
  }, [disabled, reduced, scale, opacity, scaleTo, opacityTo]);

  const onPressOut = useCallback(() => {
    if (disabled || reduced) return;
    scale.value = withTiming(1, OUT_TIMING);
    opacity.value = withTiming(baseOpacity, OUT_TIMING);
  }, [disabled, reduced, scale, opacity, baseOpacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, style };
}
