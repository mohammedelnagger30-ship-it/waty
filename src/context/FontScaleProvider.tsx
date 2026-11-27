import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PixelRatio } from 'react-native';
import { settingsRepository } from '@/src/storage';

declare global {
  var __ALLOW_FONT_SCALING__: boolean | undefined;
  var __MAX_FONT_SIZE_MULTIPLIER__: number | undefined;
}

interface FontScaleContextValue {
  /**
   * When false (default / recommended), font scale is locked to 1.0 (natural size),
   * preventing Xiaomi / MIUI Lite mode from blowing up font sizes and breaking layouts.
   * When true, font scaling from system is respected.
   */
  simpleModeEnabled: boolean;
  setSimpleModeEnabled: (value: boolean) => void;
  /** Current detected system font scale (e.g. 1.4 on Xiaomi Lite Mode) */
  systemFontScale: number;
  /** True if system font scale is greater than 1.15 */
  isSystemScaleDetected: boolean;
  /** Additional user-chosen scale multiplier (0.9, 1.0, 1.15) */
  fontScaleMultiplier: number;
  setFontScaleMultiplier: (value: number) => void;
}

const FontScaleContext = createContext<FontScaleContextValue | null>(null);

function applyGlobalFontScaling(allowScaling: boolean, maxMultiplier?: number) {
  globalThis.__ALLOW_FONT_SCALING__ = allowScaling;
  globalThis.__MAX_FONT_SIZE_MULTIPLIER__ = allowScaling ? maxMultiplier : 1.0;
}

// Initialize immediately on module load so that first render already respects normal scale
applyGlobalFontScaling(false, 1.0);

export function FontScaleProvider({ children }: { children: ReactNode }) {
  const [simpleModeEnabled, setSimpleModeEnabledState] = useState(false);
  const [fontScaleMultiplier, setFontScaleMultiplierState] = useState(1.0);
  const [systemFontScale, setSystemFontScale] = useState(1.0);
  const persisted = useRef({ simpleModeEnabled: false, fontScaleMultiplier: 1.0 });

  useEffect(() => {
    try {
      const scale = PixelRatio.getFontScale();
      setSystemFontScale(scale);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    settingsRepository.getOrCreate()
      .then((settings) => {
        const value = settings.simpleModeEnabled ?? false;
        const multiplier = settings.fontScaleMultiplier ?? 1.0;
        persisted.current = { simpleModeEnabled: value, fontScaleMultiplier: multiplier };
        setSimpleModeEnabledState(value);
        setFontScaleMultiplierState(multiplier);
        applyGlobalFontScaling(value, value ? undefined : multiplier);
      })
      .catch(() => {});
  }, []);

  const setSimpleModeEnabled = useCallback((value: boolean) => {
    if (persisted.current.simpleModeEnabled === value) return;
    persisted.current = { ...persisted.current, simpleModeEnabled: value };
    setSimpleModeEnabledState(value);
    applyGlobalFontScaling(value, value ? undefined : persisted.current.fontScaleMultiplier);
    settingsRepository.patch({ simpleModeEnabled: value }).catch(() => {});
  }, []);

  const setFontScaleMultiplier = useCallback((value: number) => {
    if (persisted.current.fontScaleMultiplier === value) return;
    persisted.current = { ...persisted.current, fontScaleMultiplier: value };
    setFontScaleMultiplierState(value);
    if (!simpleModeEnabled) {
      globalThis.__MAX_FONT_SIZE_MULTIPLIER__ = value;
    }
    settingsRepository.patch({ fontScaleMultiplier: value }).catch(() => {});
  }, [simpleModeEnabled]);

  const isSystemScaleDetected = systemFontScale > 1.15;

  // Stable value: a settings load must not re-render every screen in the app.
  const value = useMemo(
    () => ({
      simpleModeEnabled,
      setSimpleModeEnabled,
      systemFontScale,
      isSystemScaleDetected,
      fontScaleMultiplier,
      setFontScaleMultiplier,
    }),
    [
      simpleModeEnabled,
      setSimpleModeEnabled,
      systemFontScale,
      isSystemScaleDetected,
      fontScaleMultiplier,
      setFontScaleMultiplier,
    ],
  );

  // Do not key this subtree. Font-scale settings only change a handful of
  // consumers; remounting every screen made navigation feel heavy.
  return (
    <FontScaleContext.Provider value={value}>
      {children}
    </FontScaleContext.Provider>
  );
}

export function useFontScale() {
  const ctx = useContext(FontScaleContext);
  if (!ctx) {
    throw new Error('useFontScale must be used within FontScaleProvider');
  }
  return ctx;
}
