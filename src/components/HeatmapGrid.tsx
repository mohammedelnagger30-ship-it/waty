import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import type { HeatCell } from '@/src/utils/insights';

type Props = {
  cells: HeatCell[];
  size?: number;
  gap?: number;
  baseColor: string;
  levels?: string[];
  onPressCell?: (cell: HeatCell) => void;
};

export function HeatmapGrid({ cells, size = 11, gap = 4, baseColor, levels, onPressCell }: Props) {
  const palette = levels?.length
    ? levels
    : [baseColor + '1F', baseColor + '55', baseColor + '99', baseColor];
  const max = Math.max(1, ...cells.map((cell) => cell.count));

  const colorFor = (count: number) => {
    if (!count) return baseColor + '14';
    const index = Math.min(palette.length - 1, Math.max(0, Math.ceil((count / max) * palette.length) - 1));
    return palette[index];
  };

  return (
    <Svg width={12 * (size + gap)} height={7 * (size + gap)} style={styles.svg}>
      {cells.map((cell) => (
        <Rect
          key={cell.date}
          x={cell.week * (size + gap)}
          y={cell.day * (size + gap)}
          width={size}
          height={size}
          rx={3}
          fill={colorFor(cell.count)}
          onPress={onPressCell ? () => onPressCell(cell) : undefined}
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({ svg: { flexGrow: 0 } });

export default HeatmapGrid;
