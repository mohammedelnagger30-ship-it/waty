import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { createTheme, isPaletteId, DEFAULT_PALETTE } from '../theme';
import type { PaletteId } from '@/src/storage/entities';
import { settingsRepository } from '@/src/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ReturnType<typeof createTheme>;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  paletteId: PaletteId;
  setPalette: (id: PaletteId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children, initialMode = 'system' }: { children: ReactNode; initialMode?: ThemeMode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [paletteId, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE);
  const loaded = useRef(false);
  const persisted = useRef({ theme: initialMode, colorPalette: DEFAULT_PALETTE });

  useEffect(() => {
    settingsRepository.getOrCreate()
      .then((settings) => {
        const nextTheme =
          settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system'
            ? settings.theme
            : mode;
        const nextPalette = isPaletteId(settings.colorPalette) ? settings.colorPalette : paletteId;
        persisted.current = { theme: nextTheme, colorPalette: nextPalette };
        setModeState(nextTheme);
        setPaletteState(nextPalette);
      })
      .catch(() => {})
      .finally(() => { loaded.current = true; });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    if (persisted.current.theme === mode && persisted.current.colorPalette === paletteId) return;
    persisted.current = { theme: mode, colorPalette: paletteId };
    settingsRepository.patch({ theme: mode, colorPalette: paletteId }).catch(() => {});
  }, [mode, paletteId]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const setPalette = useCallback((next: PaletteId) => setPaletteState(next), []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const theme = useMemo(() => createTheme(isDark, paletteId), [isDark, paletteId]);

  // Stable context value: otherwise every state update re-renders the whole
  // app tree even when the theme itself did not change.
  const value = useMemo(
    () => ({ theme, mode, setMode, isDark, paletteId, setPalette }),
    [theme, mode, setMode, isDark, paletteId, setPalette],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
