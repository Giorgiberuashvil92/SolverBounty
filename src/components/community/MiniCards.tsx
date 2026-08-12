import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/typography';

type MiniCardsProps = {
  cards: string[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Negative overlaps; 0+ leaves a gap. Default -8 (community compact). */
  overlap?: number;
  /** Slight fan rotation. Off for board rows. */
  fan?: boolean;
  /** Deal-in animation when cards change. */
  animate?: boolean;
  /** Resets deal tracking when the hand changes. */
  dealKey?: string | number;
};

function suitOf(card: string): 'red' | 'black' {
  const s = card.slice(-1).toLowerCase();
  return s === 'h' || s === 'd' ? 'red' : 'black';
}

function rankOf(card: string): string {
  return card.slice(0, -1);
}

function suitGlyph(card: string): string {
  const s = card.slice(-1).toLowerCase();
  if (s === 'h') return '♥';
  if (s === 'd') return '♦';
  if (s === 'c') return '♣';
  return '♠';
}

const SIZE = {
  sm: { w: 28, h: 38, r: 11, s: 9 },
  md: { w: 34, h: 48, r: 14, s: 12 },
  lg: { w: 40, h: 56, r: 16, s: 13 },
  xl: { w: 48, h: 66, r: 18, s: 15 },
} as const;

function DealCard({
  card,
  index,
  total,
  dims,
  step,
  fan,
  shouldAnimate,
}: {
  card: string;
  index: number;
  total: number;
  dims: (typeof SIZE)[keyof typeof SIZE];
  step: number;
  fan: boolean;
  shouldAnimate: boolean;
}) {
  const progress = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  const started = useRef(false);
  const color = suitOf(card) === 'red' ? '#B42348' : '#111827';
  const rot = fan ? (index - (total - 1) / 2) * 4 : 0;

  useEffect(() => {
    if (!shouldAnimate) {
      progress.setValue(1);
      return;
    }
    if (started.current) return;
    started.current = true;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay: index * 90,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  }, [shouldAnimate, index, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-28, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 1],
  });
  const spin = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [`${rot - 18}deg`, `${rot}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width: dims.w,
          height: dims.h,
          marginLeft: index === 0 ? 0 : step,
          zIndex: total - index,
          opacity,
          transform: [{ translateY }, { scale }, { rotate: spin }],
        },
      ]}
    >
      <Text style={[styles.rank, { color, fontSize: dims.r, lineHeight: dims.r + 4 }]}>
        {rankOf(card)}
      </Text>
      <Text style={[styles.suit, { color, fontSize: dims.s }]}>{suitGlyph(card)}</Text>
    </Animated.View>
  );
}

export function MiniCards({
  cards,
  size = 'md',
  overlap = -8,
  fan = true,
  animate = false,
  dealKey = '',
}: MiniCardsProps) {
  const dims = SIZE[size];
  const prevCardsRef = useRef<string[]>([]);
  const prevDealKeyRef = useRef(dealKey);

  if (prevDealKeyRef.current !== dealKey) {
    prevDealKeyRef.current = dealKey;
    prevCardsRef.current = [];
  }

  const prev = prevCardsRef.current;
  const slots = cards.map((card, index) => {
    const slotKey = `${dealKey}:${index}:${card}`;
    const isNew = animate && (index >= prev.length || prev[index] !== card);
    return { card, index, slotKey, isNew };
  });

  prevCardsRef.current = cards;

  return (
    <View style={styles.row}>
      {slots.map(({ card, index, slotKey, isNew }) => (
        <DealCard
          key={slotKey}
          card={card}
          index={index}
          total={cards.length}
          dims={dims}
          step={overlap}
          fan={fan}
          shouldAnimate={isNew}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#F8F6F1',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingTop: 5,
    paddingHorizontal: 5,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  rank: {
    fontFamily: fonts.bodyBold,
  },
  suit: {
    fontFamily: fonts.body,
    marginTop: -1,
  },
});
