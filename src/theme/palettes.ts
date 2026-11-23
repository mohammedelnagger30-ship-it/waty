import type { PaletteId } from '@/src/storage/entities';

export interface PaletteDefinition {
  id: PaletteId;
  name: { ar: string; en: string };
  primary: string;
  secondary: string;
  accent: string;
}

export const DEFAULT_PALETTE: PaletteId = 'indigo';

/**
 * Editorial, slightly desaturated palettes. Every base is deep enough to keep
 * white text readable on solid buttons while still feeling calm and premium.
 */
export const palettes: PaletteDefinition[] = [
  {
    id: 'indigo',
    name: { ar: 'نيلي', en: 'Indigo' },
    primary: '#4338CA',
    secondary: '#0E7490',
    accent: '#6D28D9',
  },
  {
    id: 'ocean',
    name: { ar: 'محيطي', en: 'Ocean' },
    primary: '#0F766E',
    secondary: '#1D4ED8',
    accent: '#0E7490',
  },
  {
    id: 'emerald',
    name: { ar: 'زمردي', en: 'Emerald' },
    primary: '#047857',
    secondary: '#0F766E',
    accent: '#4D7C0F',
  },
  {
    id: 'amber',
    name: { ar: 'ذهبي', en: 'Amber' },
    primary: '#B45309',
    secondary: '#9A3412',
    accent: '#A16207',
  },
  {
    id: 'rose',
    name: { ar: 'وردي', en: 'Rose' },
    primary: '#BE123C',
    secondary: '#9F1239',
    accent: '#9D174D',
  },
  {
    id: 'slate',
    name: { ar: 'رمادي', en: 'Slate' },
    primary: '#334155',
    secondary: '#0F766E',
    accent: '#475569',
  },
];

export function isPaletteId(value: unknown): value is PaletteId {
  return palettes.some((palette) => palette.id === value);
}

export function getPalette(id: PaletteId): PaletteDefinition {
  return palettes.find((palette) => palette.id === id) ?? palettes[0];
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const part = (value: number) => Math.round(Math.max(0, Math.min(255, value)))
    .toString(16)
    .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** Blend `target` into `color` by `ratio` (0 = color, 1 = target). */
export function mix(color: string, target: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(color);
  const [r2, g2, b2] = hexToRgb(target);
  return rgbToHex(
    r1 + (r2 - r1) * ratio,
    g1 + (g2 - g1) * ratio,
    b1 + (b2 - b1) * ratio,
  );
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

/** Deep shades are mixed into an ink tint, not pure black, so hues stay rich. */
const INK = '#0B1220';

/** Ten usable shades for a base color, tuned for light surfaces. */
export function buildScale(base: string): ColorScale {
  return {
    50: mix(base, '#FFFFFF', 0.94),
    100: mix(base, '#FFFFFF', 0.87),
    200: mix(base, '#FFFFFF', 0.75),
    300: mix(base, '#FFFFFF', 0.60),
    400: mix(base, '#FFFFFF', 0.36),
    500: base,
    600: mix(base, INK, 0.16),
    700: mix(base, INK, 0.32),
    800: mix(base, INK, 0.48),
    900: mix(base, INK, 0.62),
  };
}

/**
 * Dark-mode scales are reversed and slightly brightened so [500] stays vivid
 * against dark surfaces while [50] remains a subtle tint.
 */
export function buildDarkScale(base: string): ColorScale {
  const scale = buildScale(mix(base, '#FFFFFF', 0.18));
  return {
    50: scale[900],
    100: scale[800],
    200: scale[700],
    300: scale[600],
    400: scale[500],
    500: scale[400],
    600: scale[300],
    700: scale[200],
    800: scale[100],
    900: scale[50],
  };
}
