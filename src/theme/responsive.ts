import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * Layout breakpoints in density-independent pixels.
 *
 *  - compact: small phones (320dp and below, e.g. older Android Go devices)
 *  - phone:   standard phones (Redmi Note 8 = 393dp)
 *  - large:   phablets / small tablets in portrait (600dp - 839dp)
 *  - tablet:  10"+ tablets in portrait (840dp and above)
 *
 * Everything below 600dp keeps the original edge-to-edge phone layout. Wider
 * screens get a centered content column and a calmer gutter instead of being
 * forced into a 393dp stripe with empty space on both sides.
 */
export type Breakpoint = 'compact' | 'phone' | 'large' | 'tablet';

export interface ResponsiveMetrics {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isCompact: boolean;
  isPhone: boolean;
  isWide: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  /** Width of the main app column. Full-bleed on phones, centered on tablets. */
  contentWidth: number;
  /** Max width of forms/sheets so fields never stretch across a tablet. */
  formWidth: number;
  /** Horizontal breathing room outside the content column. */
  gutter: number;
  /** 1 column on phones, 2 columns where there is enough room. */
  columns: 1 | 2;
  /** Modest type/spacing multiplier for large screens. */
  scale: number;
}

export function getResponsiveMetrics(width: number, height: number): ResponsiveMetrics {
  const breakpoint: Breakpoint =
    width < 360 ? 'compact' : width < 600 ? 'phone' : width < 840 ? 'large' : 'tablet';
  const isWide = breakpoint === 'large' || breakpoint === 'tablet';

  const contentWidth = isWide
    ? breakpoint === 'large'
      ? Math.min(width - 48, 720)
      : Math.min(width - 96, 960)
    : width;
  const formWidth = isWide ? Math.min(contentWidth, 640) : width;
  const gutter = isWide ? Math.max(24, Math.round((width - contentWidth) / 2)) : 0;

  return {
    width,
    height,
    breakpoint,
    isCompact: breakpoint === 'compact',
    isPhone: breakpoint === 'phone',
    isWide,
    isTablet: breakpoint === 'tablet',
    isLandscape: width > height,
    contentWidth,
    formWidth,
    gutter,
    columns: contentWidth >= 720 ? 2 : 1,
    scale: breakpoint === 'tablet' ? 1.12 : breakpoint === 'large' ? 1.06 : 1,
  };
}

/** Reactive breakpoint hook. Safe to call in any component under the root. */
export function useResponsive(): ResponsiveMetrics {
  const { width, height } = useWindowDimensions();
  return useMemo(() => getResponsiveMetrics(width, height), [width, height]);
}
