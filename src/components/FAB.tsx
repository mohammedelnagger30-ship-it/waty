import { ReactNode, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/src/context';
import { usePressAnimation } from '@/src/hooks/usePressAnimation';
import { useReducedMotion } from '@/src/hooks/useReducedMotion';
import { haptics } from '@/src/utils/haptics';
import { spacing, radius } from '@/src/theme';

interface FABProps {
  onPress: () => void;
  icon?: ReactNode;
  bottom?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);
const HALO_TIMING = { duration: 1900, easing: Easing.out(Easing.quad) };

export function FAB({ onPress, icon, bottom = 90 }: FABProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  const { onPressIn, onPressOut, style: pressStyle } = usePressAnimation({
    scaleTo: 0.9,
    opacityTo: 0.92,
  });

  useEffect(() => {
    if (reduced) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(withTiming(1, HALO_TIMING), -1, true);
  }, [reduced, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.32 }],
    opacity: (1 - pulse.value) * 0.32,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        onPressIn();
        haptics.light();
      }}
      onPressOut={onPressOut}
      style={[
        styles.fab,
        {
          backgroundColor: theme.primary[600],
          // The tab screen's area already ends at the top of the tab bar, so
          // `bottom` is measured from there (no system inset needed here).
          bottom,
          borderColor: 'rgba(255,255,255,0.18)',
          shadowColor: theme.primary[500],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: theme.isDark ? 0.5 : 0.4,
          shadowRadius: 14,
          elevation: 9,
        },
        pressStyle,
      ]}
    >
      <AnimatedView
        pointerEvents="none"
        style={[styles.halo, { borderColor: theme.primary[500] }, haloStyle]}
      />
      {icon ?? <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    end: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    left: -6,
    right: -6,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
});
