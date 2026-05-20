import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { ImageSource } from './markerImages';

// ── Restaurant SVG geometry ──────────────────────────────────────────────────
const R_W = 80;
const R_H = 72;
const R_FILL_N    = '#003D35';
const R_FILL_S    = '#002A25';
const R_STROKE_N  = '#00C896';
const R_STROKE_S  = '#FFB020';

// ── Cluster SVG geometry ─────────────────────────────────────────────────────
const C_W = 88;
const C_H = 78;
const C_FILL   = '#00C896';
const C_STROKE = 'rgba(255,255,255,0.25)';

const WHITE = '#FFFFFF';

// ── Types ────────────────────────────────────────────────────────────────────
export type CaptureItem =
  | { key: string; type: 'restaurant'; label: string; selected: boolean }
  | { key: string; type: 'cluster'; count: number };

interface Props {
  items: CaptureItem[];
  onReady: (key: string, source: ImageSource) => void;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RestaurantCapture({
  svgKey, label, selected, onReady,
}: {
  svgKey: string;
  label: string;
  selected: boolean;
  onReady: (key: string, src: ImageSource) => void;
}) {
  const ref = useRef<any>(null);
  const fill   = selected ? R_FILL_S  : R_FILL_N;
  const stroke = selected ? R_STROKE_S : R_STROKE_N;
  const sw = selected ? 2.5 : 2;

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.toDataURL?.((data: string) => {
        if (data) onReady(svgKey, { uri: `data:image/png;base64,${data}` });
      });
    }, 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <Svg ref={ref} width={R_W} height={R_H} viewBox={`0 0 ${R_W} ${R_H}`}>
      <Rect x={18} y={10} width={44} height={34} rx={8}
        fill={fill} stroke={stroke} strokeWidth={sw} />
      <Polygon points="32,44 48,44 40,54"
        fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Seam cover */}
      <Rect x={32} y={43} width={16} height={sw + 1} fill={fill} />
      <SvgText x={40} y={32} fontSize={15} fontWeight="800"
        fill={WHITE} textAnchor="middle">
        {label}
      </SvgText>
    </Svg>
  );
}

function ClusterCapture({
  svgKey, count, onReady,
}: {
  svgKey: string;
  count: number;
  onReady: (key: string, src: ImageSource) => void;
}) {
  const ref = useRef<any>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.toDataURL?.((data: string) => {
        if (data) onReady(svgKey, { uri: `data:image/png;base64,${data}` });
      });
    }, 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <Svg ref={ref} width={C_W} height={C_H} viewBox={`0 0 ${C_W} ${C_H}`}>
      <Rect x={17} y={8} width={54} height={42} rx={12}
        fill={C_FILL} stroke={C_STROKE} strokeWidth={2} />
      <Polygon points="34,50 54,50 44,62"
        fill={C_FILL} stroke={C_FILL} strokeWidth={1} />
      {/* Seam cover */}
      <Rect x={34} y={49} width={20} height={3} fill={C_FILL} />
      <SvgText x={44} y={34} fontSize={16} fontWeight="900"
        fill={WHITE} textAnchor="middle">
        {count}
      </SvgText>
    </Svg>
  );
}

// ── Factory ──────────────────────────────────────────────────────────────────

export default function MarkerImageFactory({ items, onReady }: Props) {
  if (items.length === 0) return null;
  return (
    <View style={styles.hidden} pointerEvents="none">
      {items.map(item =>
        item.type === 'restaurant' ? (
          <RestaurantCapture
            key={item.key}
            svgKey={item.key}
            label={item.label}
            selected={item.selected}
            onReady={onReady}
          />
        ) : (
          <ClusterCapture
            key={item.key}
            svgKey={item.key}
            count={item.count}
            onReady={onReady}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Rendered at opacity 0 at top-left corner — stays within screen bounds
  // so Android does not clip it, but it is invisible to the user.
  hidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0,
  },
});
