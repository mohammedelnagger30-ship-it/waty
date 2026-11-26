import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface TrendChartProps {
  values: number[];
  color: string;
  height?: number;
}

/** Lightweight SVG area chart built on react-native-svg (already installed). */
export function TrendChart({ values, color, height = 110 }: TrendChartProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(80, width - 80);

  const { linePath, areaPath, last } = useMemo(() => {
    const max = values.reduce((value, point) => Math.max(value, point), 1);
    const points = values.map((value, index) => ({
      x: values.length <= 1 ? chartWidth / 2 : (index / (values.length - 1)) * chartWidth,
      y: height - 10 - (Math.max(0, value) / max) * (height - 24),
    }));
    const line = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(' ');
    const area = points.length
      ? `${line} L${points[points.length - 1].x.toFixed(1)},${height} L${points[0].x.toFixed(1)},${height} Z`
      : '';
    return { linePath: line, areaPath: area, last: points[points.length - 1] };
  }, [values, chartWidth, height]);

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        <Defs>
          <LinearGradient id="waqtyTrendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {areaPath ? <Path d={areaPath} fill="url(#waqtyTrendFill)" /> : null}
        {linePath ? (
          <Path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {last ? (
          <Path
            d={`M${last.x - 4},${last.y} L${last.x + 4},${last.y} M${last.x},${last.y - 4} L${last.x},${last.y + 4}`}
            stroke={color}
            strokeWidth={2}
          />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
