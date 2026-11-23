import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { PixelRatio, View } from 'react-native';
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
        setSimpleModeEnabledState(value);
        applyGlobalFontScaling(value, value ? undefined : 1.0);
      })
      .catch(() => {});
  }, []);

  const setSimpleModeEnabled = (value: boolean) => {
    setSimpleModeEnabledState(value);
    applyGlobalFontScaling(value, value ? undefined : 1.0);
    settingsRepository.patch({ simpleModeEnabled: value }).catch(() => {});
  };

  const setFontScaleMultiplier = (value: number) => {
    setFontScaleMultiplierState(value);
    if (!simpleModeEnabled) {
      globalThis.__MAX_FONT_SIZE_MULTIPLIER__ = value;
    }
  };

  const isSystemScaleDetected = systemFontScale > 1.15;

  return (
    <FontScaleContext.Provider
      value={{
        simpleModeEnabled,
        setSimpleModeEnabled,
        systemFontScale,
        isSystemScaleDetected,
        fontScaleMultiplier,
        setFontScaleMultiplier,
      }}
    >
      <View style={{ flex: 1 }} key={`${String(simpleModeEnabled)}-${fontScaleMultiplier}`}>
        {children}
      </View>
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
