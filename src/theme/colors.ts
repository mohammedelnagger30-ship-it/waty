import type { PaletteId } from '@/src/storage/entities';
import {
  buildDarkScale,
  buildScale,
  DEFAULT_PALETTE,
  getPalette,
  type ColorScale,
} from './palettes';

export interface Theme {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  success: string;
  warning: string;
  error: string;
  info: string;
  /** Low-opacity state backgrounds for badges and active rows. */
  successSoft: string;
  warningSoft: string;
  errorSoft: string;
  infoSoft: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: string;
  borderStrong: string;
  overlay: string;
  shadow: {
    color: string;
    colorStrong: string;
  };
  tab: {
    background: string;
    active: string;
    inactive: string;
  };
}

/**
 * Editorial light neutrals: a quiet off-white canvas, pure white surfaces and
 * layered borders/text so active states can rise above the background.
 */
const lightBase: Omit<Theme, 'isDark' | 'primary' | 'secondary' | 'accent' | 'tab'> = {
  background: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF1F7',
  surfaceTertiary: '#E1E7F0',
  success: '#15803D',
  warning: '#B45309',
  error: '#DC2626',
  info: '#1D4ED8',
  successSoft: 'rgba(21, 128, 61, 0.12)',
  warningSoft: 'rgba(180, 83, 9, 0.12)',
  errorSoft: 'rgba(220, 38, 38, 0.11)',
  infoSoft: 'rgba(29, 78, 216, 0.10)',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#8493A8',
    inverse: '#FFFFFF',
  },
  border: '#DCE3ED',
  borderStrong: '#B8C3D3',
  overlay: 'rgba(15, 23, 42, 0.44)',
  shadow: {
    color: 'rgba(15, 23, 42, 0.07)',
    colorStrong: 'rgba(15, 23, 42, 0.15)',
  },
};

/** Deep, near-black navy surfaces with enough separation for elevated cards. */
const darkBase: Omit<Theme, 'isDark' | 'primary' | 'secondary' | 'accent' | 'tab'> = {
  background: '#0B0F16',
  surface: '#151B27',
  surfaceSecondary: '#1E2635',
  surfaceTertiary: '#293344',
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  successSoft: 'rgba(74, 222, 128, 0.15)',
  warningSoft: 'rgba(251, 191, 36, 0.15)',
  errorSoft: 'rgba(248, 113, 113, 0.15)',
  infoSoft: 'rgba(96, 165, 250, 0.15)',
  text: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    tertiary: '#7C8DA6',
    inverse: '#151B27',
  },
  border: '#2B3648',
  borderStrong: '#3D4A61',
  overlay: 'rgba(0, 0, 0, 0.62)',
  shadow: {
    color: 'rgba(0, 0, 0, 0.32)',
    colorStrong: 'rgba(0, 0, 0, 0.55)',
  },
};

/** Build the full theme for a mode + user-selected palette. */
export function createTheme(isDark: boolean, paletteId: PaletteId = DEFAULT_PALETTE): Theme {
  const palette = getPalette(paletteId);
  const primary = isDark ? buildDarkScale(palette.primary) : buildScale(palette.primary);
  const base = isDark ? darkBase : lightBase;

  return {
    ...base,
    isDark,
    primary,
    secondary: isDark ? buildDarkScale(palette.secondary) : buildScale(palette.secondary),
    accent: isDark ? buildDarkScale(palette.accent) : buildScale(palette.accent),
    tab: {
      background: isDark ? darkBase.surface : lightBase.surface,
      active: isDark ? primary[300] : primary[600],
      inactive: isDark ? darkBase.text.tertiary : lightBase.text.tertiary,
    },
  };
}

export const lightTheme = createTheme(false, DEFAULT_PALETTE);
export const darkTheme = createTheme(true, DEFAULT_PALETTE);
