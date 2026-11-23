import { useEffect, useRef, useState, ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  ModalProps,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context';
import { useReducedMotion } from '@/src/hooks/useReducedMotion';
import { haptics } from '@/src/utils/haptics';
import { spacing, typography, radius } from '@/src/theme';

interface ModalSheetProps
  extends Omit<
    ModalProps,
    'renderToHardwareTextureAndroid' | 'animationType' | 'transparent' | 'visible' | 'onRequestClose'
  > {
  children: ReactNode;
  visible: boolean;
  onClose: () => void;
  title?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

const OPEN_TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };
const CLOSE_TIMING = { duration: 220, easing: Easing.in(Easing.cubic) };
const SNAP_TIMING = { duration: 180, easing: Easing.out(Easing.cubic) };

/**
 * Bottom sheet with a choreographed enter/exit, drag-to-dismiss handle and
 * reduced-motion support. Stays mounted until the exit animation finishes.
 */
export function ModalSheet({ children, visible, onClose, title, ...modalProps }: ModalSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { height: screenHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);

  // 0 = fully closed (off-screen), 1 = fully open.
  const progress = useSharedValue(0);
  const dragStart = useSharedValue(0);
  // Android keeps the sheet anchored to the bottom of the window, so the IME
  // covers the inputs. Lift the sheet by the keyboard height while typing.
  const keyboardOffset = useSharedValue(0);
  const sheetHeight = useSharedValue(0);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted || Platform.OS !== 'android') return;
    const animate = (height: number) => {
      keyboardOffset.value = reduced
        ? height
        : withTiming(height, { duration: 220, easing: Easing.out(Easing.cubic) });
    };
    const onShow = (event: { endCoordinates: { height: number } }) => {
      animate(Math.max(0, event.endCoordinates.height));
    };
    const onHide = () => animate(0);
    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
      keyboardOffset.value = 0;
    };
  }, [mounted, reduced, keyboardOffset]);

  useEffect(() => {
    if (!mounted) return;

    // Fallback in case the animation frame scheduler is unavailable (e.g. a
    // backgrounded tab): the sheet must never stay invisible or mounted forever.
    const clearSafetyTimer = () => {
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    };

    if (visible) {
      progress.value = reduced ? 1 : withTiming(1, OPEN_TIMING);
      if (!reduced) {
        safetyTimer.current = setTimeout(() => {
          progress.value = 1;
        }, 400);
      }
      return clearSafetyTimer;
    }

    if (reduced) {
      progress.value = 0;
      setMounted(false);
      return clearSafetyTimer;
    }

    progress.value = withTiming(0, CLOSE_TIMING, (finished?: boolean) => {
      if (finished) runOnJS(setMounted)(false);
    });
    safetyTimer.current = setTimeout(() => setMounted(false), 400);
    return clearSafetyTimer;
  }, [visible, mounted, reduced, progress]);

  const dismiss = Gesture.Pan()
    .onStart(() => {
      dragStart.value = progress.value;
    })
    .onUpdate((event) => {
      if (event.translationY <= 0) {
        progress.value = dragStart.value;
        return;
      }
      const distance = Math.max(screenHeight, 1);
      progress.value = Math.max(0, dragStart.value - event.translationY / distance);
    })
    .onEnd((event) => {
      if (progress.value < 0.8 || event.velocityY > 700) {
        runOnJS(haptics.light)();
        // Parent sets `visible=false`; the effect above runs the exit animation.
        runOnJS(onClose)();
      } else {
        progress.value = withTiming(1, SNAP_TIMING);
      }
    });

  const sheetStyle = useAnimatedStyle(
    () => {
      // Never push the top of a tall sheet off-screen while the IME is open.
      const maxLift = Math.max(0, screenHeight - sheetHeight.value - 8);
      const lift = Math.min(keyboardOffset.value, maxLift);
      return {
        transform: [
          {
            translateY: interpolate(
              progress.value,
              [0, 1],
              [Math.max(screenHeight, 1), -lift],
              'clamp',
            ),
          },
        ],
      };
    },
    [screenHeight],
  );

  const overlayStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      {...modalProps}
    >
      <AnimatedPressable
        style={[styles.overlay, { backgroundColor: theme.overlay }, overlayStyle]}
        onPress={onClose}
      >
        <AnimatedPressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              // Keep sheet content above the system navigation bar.
              paddingBottom: spacing.xxl + insets.bottom,
            },
            sheetStyle,
          ]}
          onPress={(event) => event.stopPropagation()}
          onLayout={(event) => {
            sheetHeight.value = event.nativeEvent.layout.height;
          }}
        >
          <GestureDetector gesture={dismiss}>
            <AnimatedView style={styles.handleArea}>
              <View
                style={[
                  styles.handle,
                  {
                    backgroundColor: theme.borderStrong,
                    // Set logical alignment so RTL layout stays correct.
                    alignSelf: 'center',
                  },
                ]}
              />
            </AnimatedView>
          </GestureDetector>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
            {title && (
              <Text style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}>
                {title}
              </Text>
            )}
            {children}
          </KeyboardAvoidingView>
        </AnimatedPressable>
      </AnimatedPressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  handleArea: {
    width: '100%',
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    width: '100%',
  },
  title: {
    fontSize: typography.sizes.xl,
    marginBottom: spacing.md,
  },
});
