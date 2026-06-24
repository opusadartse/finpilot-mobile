import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

function smoothLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M ${pts[0]!.x} ${pts[0]!.y} L ${pts[1]!.x} ${pts[1]!.y}`;
  }
  const p = [pts[0]!, ...pts, pts[pts.length - 1]!];
  let d = `M ${p[1]!.x} ${p[1]!.y}`;
  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1]!;
    const p1 = p[i]!;
    const p2 = p[i + 1]!;
    const p3 = p[i + 2]!;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function yTickRange(values: number[]): { lo: number; hi: number; ticks: number[] } {
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = Math.max(30, maxV - minV);
  const pad = Math.max(6, Math.round(span * 0.12));
  let lo = Math.floor((minV - pad) / 10) * 10;
  let hi = Math.ceil((maxV + pad) / 10) * 10;
  if (hi - lo < 40) hi = lo + 40;
  const tickCount = 5;
  const step = (hi - lo) / (tickCount - 1);
  const ticks = Array.from({ length: tickCount }, (_, i) => Math.round(hi - i * step));
  return { lo, hi, ticks };
}

export type ScoreHistoryChartProps = {
  values: number[];
  monthLabels: string[];
  lineColor?: string;
  gridColor?: string;
  labelColor?: string;
};

const PADDING_LEFT = 38;
const PADDING_RIGHT = 10;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 30;
const CHART_HEIGHT = 200;

export function ScoreHistoryChart({
  values,
  monthLabels,
  lineColor = "#3F4D63",
  gridColor = "#E8ECF1",
  labelColor = "#64748B",
}: ScoreHistoryChartProps) {
  const [w, setW] = useState(0);
  const gradId = useMemo(() => `scoreHistFill_${Math.random().toString(36).slice(2, 11)}`, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - w) > 0.5) setW(width);
  };

  const geom = useMemo(() => {
    if (w < 40 || values.length < 2) return null;
    const innerW = w - PADDING_LEFT - PADDING_RIGHT;
    const innerH = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const { lo, hi, ticks } = yTickRange(values);
    const baseline = PADDING_TOP + innerH;

    const pts = values.map((v, i) => {
      const x = PADDING_LEFT + (i / (values.length - 1)) * innerW;
      const y = PADDING_TOP + ((hi - v) / (hi - lo)) * innerH;
      return { x, y };
    });

    const lineD = smoothLinePath(pts);
    const fillD =
      lineD + ` L ${pts[pts.length - 1]!.x} ${baseline} L ${pts[0]!.x} ${baseline} Z`;

    const gridLines = ticks.map((tv) => {
      const gy = PADDING_TOP + ((hi - tv) / (hi - lo)) * innerH;
      return { y: gy, label: String(tv) };
    });

    return { innerW, innerH, lo, hi, ticks, baseline, pts, lineD, fillD, gridLines };
  }, [w, values]);

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {geom ? (
        <Svg width={w} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity={0.22} />
              <Stop offset="1" stopColor={lineColor} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>

          {geom.gridLines.map((g) => (
            <Line
              key={g.label}
              x1={PADDING_LEFT}
              y1={g.y}
              x2={w - PADDING_RIGHT}
              y2={g.y}
              stroke={gridColor}
              strokeWidth={StyleSheet.hairlineWidth}
            />
          ))}

          {geom.gridLines.map((g) => (
            <SvgText
              key={`t-${g.label}`}
              x={4}
              y={g.y + 4}
              fill={labelColor}
              fontSize={11}
              fontWeight="600"
            >
              {g.label}
            </SvgText>
          ))}

          <Path d={geom.fillD} fill={`url(#${gradId})`} stroke="none" />
          <Path d={geom.lineD} fill="none" stroke={lineColor} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />

          {geom.pts.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={5} fill="#FFFFFF" stroke={lineColor} strokeWidth={2} />
          ))}

          {monthLabels.map((label, i) => {
            const x = PADDING_LEFT + (i / (values.length - 1)) * geom.innerW;
            return (
              <SvgText
                key={label + i}
                x={x}
                y={CHART_HEIGHT - 8}
                fill={labelColor}
                fontSize={12}
                fontWeight="700"
                textAnchor="middle"
              >
                {label}
              </SvgText>
            );
          })}
        </Svg>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginTop: 4,
    minHeight: CHART_HEIGHT,
  },
  placeholder: {
    height: CHART_HEIGHT,
  },
});
