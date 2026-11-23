import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Tracks the OS "reduce motion" accessibility preference so every animation in
 * the app can degrade gracefully. Safe on web, where the API may be missing.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    const sync = (enabled: boolean) => {
      if (active) setReduced(enabled);
    };

    try {
      AccessibilityInfo.isReduceMotionEnabled().then(sync).catch(() => {});
    } catch {
      // API not available on this platform.
    }

    let subscription: { remove: () => void } | undefined;
    try {
      subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', sync);
    } catch {
      subscription = undefined;
    }

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  return reduced;
}
