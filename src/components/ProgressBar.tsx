import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/src/context';
import { useReducedMotion } from '@/src/hooks/useReducedMotion';

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  height?: number;
  trackColor?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function ProgressBar({ progress, color, height = 8, trackColor }: ProgressBarProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const value = Math.max(0, Math.min(100, progress));
  const fill = useSharedValue(value);

  useEffect(() => {
    fill.value = reduced ? value : withTiming(value, { duration: 350, easing: Easing.out(Easing.cubic) });
  }, [value, reduced, fill]);

  // A completed bar becomes green with a soft glow; the fill itself animates.
  const complete = value >= 100;
  const barColor = complete ? theme.success : color ?? theme.primary[500];

  const fillStyle = useAnimatedStyle(() => ({
    width: (trackWidth * fill.value) / 100,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: trackColor ?? theme.surfaceTertiary,
          height,
          borderRadius: height / 2,
        },
      ]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <AnimatedView
        style={[
          styles.fill,
          {
            backgroundColor: barColor,
            borderRadius: height / 2,
            shadowColor: theme.success,
            shadowOpacity: complete ? 0.5 : 0,
            shadowRadius: complete ? 9 : 0,
          },
          fillStyle,
        ]}
      >
        <View style={styles.sheen} />
      </AnimatedView>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 1,
    left: 4,
    right: 4,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
});
