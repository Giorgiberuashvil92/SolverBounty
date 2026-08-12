import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

type Props = {
  deadlineMs: number | null;
  totalMs: number;
  size?: number;
  children: ReactNode;
};

export function ActionTimer({
  deadlineMs,
  totalMs,
  size = 54,
  children,
}: Props) {
  const [leftMs, setLeftMs] = useState(0);

  useEffect(() => {
    if (!deadlineMs) {
      setLeftMs(0);
      return;
    }
    const tick = () => setLeftMs(Math.max(0, deadlineMs - Date.now()));
    tick();
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, [deadlineMs]);

  if (!deadlineMs) {
    return <>{children}</>;
  }

  const total = Math.max(1, totalMs);
  const ratio = Math.min(1, Math.max(0, leftMs / total));
  const secs = Math.ceil(leftMs / 1000);
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const urgent = secs <= 5;
  const color = urgent ? dash.ops : dash.brandSoft;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${size} ${size}`}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - ratio)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
      <View style={[styles.badge, urgent && styles.badgeUrgent]}>
        <Text style={[styles.badgeText, urgent && styles.badgeTextUrgent]}>{secs}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 22,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: 'rgba(11,16,32,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(155,107,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeUrgent: {
    borderColor: 'rgba(77,163,255,0.7)',
    backgroundColor: 'rgba(20,32,56,0.95)',
  },
  badgeText: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  badgeTextUrgent: {
    color: dash.opsSoft,
  },
});
