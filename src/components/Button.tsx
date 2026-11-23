import { Pressable, StyleSheet, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/src/context';
import { usePressAnimation } from '@/src/hooks/usePressAnimation';
import { haptics } from '@/src/utils/haptics';
import { spacing, radius, typography } from '@/src/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const inactive = disabled || loading;
  const { onPressIn, onPressOut, style: pressStyle } = usePressAnimation({
    baseOpacity: inactive ? 0.5 : 1,
    opacityTo: 0.85,
    disabled: inactive,
  });

  const sizeStyles = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: typography.sizes.sm },
    md: { paddingVertical: spacing.md * 0.75, paddingHorizontal: spacing.lg, fontSize: typography.sizes.md },
    lg: { paddingVertical: spacing.lg * 0.75, paddingHorizontal: spacing.xl, fontSize: typography.sizes.lg },
  };

  const variantStyles: Record<Variant, { bg: string; text: string; border: string }> = {
    primary: { bg: theme.primary[600], text: '#FFFFFF', border: 'rgba(255,255,255,0.16)' },
    secondary: { bg: theme.secondary[600], text: '#FFFFFF', border: 'rgba(255,255,255,0.16)' },
    outline: { bg: theme.infoSoft, text: theme.primary[600], border: theme.primary[500] },
    ghost: { bg: 'transparent', text: theme.text.secondary, border: 'transparent' },
    danger: { bg: theme.error, text: '#FFFFFF', border: 'rgba(255,255,255,0.16)' },
  };

  const vs = variantStyles[variant];
  const sz = sizeStyles[size];
  const filled = variant === 'primary' || variant === 'secondary' || variant === 'danger';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        onPressIn();
        if (!inactive) haptics.selection();
      }}
      onPressOut={onPressOut}
      disabled={inactive}
      style={[
        styles.base,
        {
          backgroundColor: vs.bg,
          borderColor: vs.border,
          borderWidth: variant === 'outline' ? 1.5 : filled ? 1 : 0,
          paddingVertical: sz.paddingVertical,
          paddingHorizontal: sz.paddingHorizontal,
          shadowColor: filled ? vs.bg : 'transparent',
          shadowOpacity: filled ? (theme.isDark ? 0.3 : 0.22) : 0,
          shadowRadius: filled ? 12 : 0,
          shadowOffset: { width: 0, height: filled ? 5 : 0 },
          elevation: filled && !theme.isDark ? 4 : 0,
        },
        fullWidth && styles.fullWidth,
        style,
        pressStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vs.text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: vs.text,
                fontSize: sz.fontSize,
                fontFamily: typography.fontFamilySemiBold,
              },
            ]}
          >
            {children}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    textAlign: 'center',
  },
});
