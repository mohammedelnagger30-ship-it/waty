import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/src/context';
import { useReducedMotion } from '@/src/hooks/useReducedMotion';
import { typography } from '@/src/theme';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_TIMING = { duration: 450, easing: Easing.out(Easing.cubic) };

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  label,
  color,
}: ProgressRingProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const ringRadius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const center = size / 2;
  const value = Math.max(0, Math.min(100, progress));
  const animatedProgress = useSharedValue(value);

  useEffect(() => {
    animatedProgress.value = reduced ? value : withTiming(value, RING_TIMING);
  }, [value, reduced, animatedProgress]);

  // Reaching 100% flips the ring and the number to the success color and adds
  // a soft outer glow, making completion immediately visible.
  const complete = value >= 100;
  const ringColor = complete ? theme.success : color ?? theme.primary[500];
  const ringProps = useAnimatedProps<{ strokeDashoffset: number }>(() => ({
    strokeDashoffset: circumference - (animatedProgress.value / 100) * circumference,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={ringRadius}
          stroke={theme.surfaceTertiary}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={ringRadius}
          stroke={ringColor}
          strokeWidth={strokeWidth + 2}
          strokeOpacity={0.22}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
          animatedProps={ringProps}
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={ringRadius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
          animatedProps={ringProps}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text
          style={[
            styles.percentage,
            {
              color: complete ? theme.success : theme.text.primary,
              fontFamily: typography.fontFamilyBold,
            },
          ]}
        >
          {Math.round(value)}%
        </Text>
        {label && (
          <Text style={[styles.label, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontSize: 22,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
});
