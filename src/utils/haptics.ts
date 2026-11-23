import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics are a no-op on web and on unsupported devices. Wrapping every call
 * keeps UI code free of try/catch blocks and avoids unhandled rejections.
 */
function safe(call: () => Promise<unknown>): void {
  if (Platform.OS === 'web') return;
  try {
    call().catch(() => {});
  } catch {
    // Ignore devices without a haptic engine.
  }
}

export const haptics = {
  selection: () => safe(() => Haptics.selectionAsync()),
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
