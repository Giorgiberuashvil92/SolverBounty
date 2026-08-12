import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { AppTab } from '../navigation/tabs';

type TabIconProps = {
  name: AppTab;
  color: string;
  size?: number;
  active?: boolean;
};

/** Crisp poker-native glyphs for the tab bar. */
export function TabIcon({ name, color, size = 22, active = false }: TabIconProps) {
  switch (name) {
    case 'daily':
      return <ChipIcon color={color} size={size} active={active} />;
    case 'community':
      return <FeltIcon color={color} size={size} active={active} />;
    case 'coach':
      return <SpadeIcon color={color} size={size} active={active} />;
    case 'reviews':
      return <HoleCardsIcon color={color} size={size} active={active} />;
    case 'drills':
      return <TargetIcon color={color} size={size} active={active} />;
    default:
      return null;
  }
}

function ChipIcon({
  color,
  size,
  active,
}: {
  color: string;
  size: number;
  active: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="9"
        stroke={color}
        strokeWidth="1.7"
        fill={active ? 'rgba(143,196,255,0.12)' : 'none'}
      />
      <Circle cx="12" cy="12" r="5.15" stroke={color} strokeWidth="1.5" />
      <Circle cx="12" cy="12" r="1.55" fill={color} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 12 + Math.cos(rad) * 7.15;
        const y1 = 12 + Math.sin(rad) * 7.15;
        const x2 = 12 + Math.cos(rad) * 8.55;
        const y2 = 12 + Math.sin(rad) * 8.55;
        return (
          <Path
            key={deg}
            d={`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`}
            stroke={color}
            strokeWidth="1.55"
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

function FeltIcon({
  color,
  size,
  active,
}: {
  color: string;
  size: number;
  active: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 12c0-3.15 3.35-5.75 7.5-5.75s7.5 2.6 7.5 5.75-3.35 5.75-7.5 5.75S4.5 15.15 4.5 12Z"
        stroke={color}
        strokeWidth="1.7"
        fill={active ? 'rgba(143,196,255,0.14)' : 'none'}
      />
      <Path
        d="M7.35 12c0-2 2.1-3.65 4.65-3.65S16.65 10 16.65 12s-2.1 3.65-4.65 3.65S7.35 14 7.35 12Z"
        stroke={color}
        strokeWidth="1.3"
        opacity={0.75}
      />
      <Circle cx="12" cy="5.45" r="1.1" fill={color} />
      <Circle cx="12" cy="18.55" r="1.1" fill={color} />
      <Circle cx="4.85" cy="9.25" r="1" fill={color} />
      <Circle cx="19.15" cy="9.25" r="1" fill={color} />
      <Circle cx="4.85" cy="14.75" r="1" fill={color} />
      <Circle cx="19.15" cy="14.75" r="1" fill={color} />
    </Svg>
  );
}

function SpadeIcon({
  color,
  size,
  active,
}: {
  color: string;
  size: number;
  active: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5c2.85 3.15 7.35 6.35 7.35 9.35 0 2.55-1.95 4.3-4.2 4.3-1.15 0-2.15-.5-3.15-1.45-.95.95-1.95 1.45-3.15 1.45-2.25 0-4.2-1.75-4.2-4.3 0-3 4.5-6.2 7.35-9.35Z"
        stroke={color}
        strokeWidth="1.65"
        strokeLinejoin="round"
        fill={active ? color : 'none'}
      />
      <Path
        d="M12 15.35v3.45M9.35 20.35h5.3"
        stroke={color}
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HoleCardsIcon({
  color,
  size,
  active,
}: {
  color: string;
  size: number;
  active: boolean;
}) {
  const fill = active ? 'rgba(143,196,255,0.14)' : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G transform="rotate(-15 9 13)">
        <Rect
          x="4.1"
          y="5.4"
          width="9.3"
          height="13.1"
          rx="1.85"
          stroke={color}
          strokeWidth="1.55"
          fill={fill}
        />
      </G>
      <G transform="rotate(13 15.2 12)">
        <Rect
          x="10.5"
          y="4.7"
          width="9.3"
          height="13.1"
          rx="1.85"
          stroke={color}
          strokeWidth="1.55"
          fill={active ? 'rgba(143,196,255,0.22)' : 'none'}
        />
        <Path d="M15.15 9l1.6 1.6-1.6 1.6-1.6-1.6 1.6-1.6Z" fill={color} />
      </G>
    </Svg>
  );
}

function TargetIcon({
  color,
  size,
  active,
}: {
  color: string;
  size: number;
  active: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="8.2"
        stroke={color}
        strokeWidth="1.65"
        fill={active ? 'rgba(143,196,255,0.12)' : 'none'}
      />
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5" />
      <Circle cx="12" cy="12" r="1.7" fill={color} />
      <Path
        d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4"
        stroke={color}
        strokeWidth="1.55"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function RangeIcon({
  color,
  size,
  active,
}: {
  color: string;
  size: number;
  active: boolean;
}) {
  const cells = [
    { x: 4, y: 4, fill: true },
    { x: 10, y: 4, fill: false },
    { x: 16, y: 4, fill: false },
    { x: 4, y: 10, fill: false },
    { x: 10, y: 10, fill: true },
    { x: 16, y: 10, fill: false },
    { x: 4, y: 16, fill: false },
    { x: 10, y: 16, fill: false },
    { x: 16, y: 16, fill: true },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2.75"
        y="2.75"
        width="18.5"
        height="18.5"
        rx="3"
        stroke={color}
        strokeWidth="1.35"
        opacity={active ? 0.35 : 0.22}
      />
      {cells.map((c, i) => (
        <Rect
          key={i}
          x={c.x}
          y={c.y}
          width="4.15"
          height="4.15"
          rx="0.85"
          stroke={color}
          strokeWidth="1.25"
          fill={c.fill ? color : 'transparent'}
        />
      ))}
    </Svg>
  );
}

/** Range matrix glyph — used on Drills → Ranges entry. */
export function RangeTabIcon({
  color,
  size = 14,
  active = false,
}: {
  color: string;
  size?: number;
  active?: boolean;
}) {
  return <RangeIcon color={color} size={size} active={active} />;
}
