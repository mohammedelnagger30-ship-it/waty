import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

// One shared listener for the whole app. Previously every TaskCard and button
// queried the native module and registered its own subscription on mount,
// which made long lists expensive to render and scroll.
let reduced = false;
let initialized = false;
const listeners = new Set<() => void>();

function publish(next: boolean): void {
  if (next === reduced) return;
  reduced = next;
  listeners.forEach((listener) => listener());
}

function initialize(): void {
  if (initialized) return;
  initialized = true;

  try {
    AccessibilityInfo.isReduceMotionEnabled().then(publish).catch(() => {});
  } catch {
    // API not available on this platform.
  }

  try {
    // Kept for the lifetime of the app; there is no meaningful teardown while
    // UI components may still be mounting.
    AccessibilityInfo.addEventListener('reduceMotionChanged', publish);
  } catch {
    // API not available on this platform.
  }
}

function subscribe(listener: () => void): () => void {
  initialize();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return reduced;
}

/**
 * Tracks the OS "reduce motion" accessibility preference so every animation in
 * the app can degrade gracefully. Safe on web, where the API may be missing.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
