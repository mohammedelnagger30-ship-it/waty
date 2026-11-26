export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

/** Canonical icon sizes so every screen reads at the same visual weight. */
export const iconSize = {
  xs: 11,
  sm: 14,
  md: 18,
  lg: 20,
  xl: 22,
  xxl: 24,
  hero: 36,
} as const;

/** Canonical lucide stroke weights. */
export const iconStroke = {
  regular: 2,
  emphasis: 2.5,
  check: 3,
} as const;

/** Reference device: Redmi Note 8 = 1080x2340px @ 2.75x = 393x851dp. */
export const layout = {
  width: 393,
  height: 851,
  maxScreenWidth: 393,
} as const;

/** Bottom clearance tokens that match the tab bar and floating actions. */
export const bottomSpace = {
  compact: 64,
  normal: 80,
  tab: 96,
  fab: 112,
  sheet: 120,
} as const;

export const typography = {
  fontFamily: 'Cairo',
  fontFamilyBold: 'Cairo-Bold',
  fontFamilySemiBold: 'Cairo-SemiBold',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  weights: {
    regular: '400' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
} as const;
