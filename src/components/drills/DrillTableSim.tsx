import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MiniCards } from '../community/MiniCards';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { DEFAULT_FELT_THEME_ID, getFeltTheme } from '../../theme/felt';
import type { Drill, DrillActor } from '../../data/drills';

const SEATS_6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;

function seatPoints(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = (i / count) * Math.PI * 2 + Math.PI / 2;
    return {
      x: 0.5 + 0.42 * Math.cos(t),
      y: 0.5 + 0.38 * Math.sin(t),
    };
  });
}

function seatsHeroBottom(hero: string): string[] {
  const seats = [...SEATS_6];
  const i = seats.indexOf(hero as (typeof SEATS_6)[number]);
  if (i <= 0) return seats;
  return [...seats.slice(i), ...seats.slice(0, i)];
}

function actorMap(actors: DrillActor[] | undefined): Record<string, DrillActor> {
  const map: Record<string, DrillActor> = {};
  for (const a of actors ?? []) map[a.position] = a;
  return map;
}

function stateChip(actor: DrillActor | undefined, isHero: boolean): string {
  if (isHero) return 'ACT';
  if (!actor) return '·';
  switch (actor.state) {
    case 'fold':
      return 'OUT';
    case 'open':
    case 'raise':
      return actor.amountBb != null ? `${actor.amountBb}bb` : 'RAISE';
    case '3bet':
      return actor.amountBb != null ? `${actor.amountBb}bb` : '3BET';
    case 'call':
      return actor.amountBb != null ? `C ${actor.amountBb}` : 'CALL';
    case 'complete':
      return 'LIMP';
    case 'check':
      return 'CHECK';
    case 'toAct':
      return 'ACT';
    case 'wait':
    default:
      return '·';
  }
}

type DrillTableSimProps = {
  drill: Drill;
};

export function DrillTableSim({ drill }: DrillTableSimProps) {
  const { width } = useWindowDimensions();
  const felt = getFeltTheme(DEFAULT_FELT_THEME_ID);
  const seats = seatsHeroBottom(drill.heroPosition);
  const points = seatPoints(seats.length);
  const actors = actorMap(drill.actors);
  const tableW = Math.min(width - 36, 340);
  const tableH = Math.round(tableW * 0.62);
  const seatW = 58;
  const seatH = 52;

  return (
    <View style={styles.wrap}>
      <View style={[styles.stage, { width: tableW, height: tableH }]}>
        <LinearGradient
          colors={felt.colors}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[styles.felt, { borderColor: felt.border }]}
        >
          <View style={styles.feltInner}>
            {drill.board?.length ? (
              <View style={styles.boardRow}>
                <MiniCards cards={drill.board} size="sm" />
              </View>
            ) : (
              <Text style={styles.feltCenter}>{drill.stakesLabel}</Text>
            )}
            {drill.potBb != null ? (
              <View style={styles.potPill}>
                <Text style={styles.potText}>Pot {drill.potBb}bb</Text>
              </View>
            ) : (
              <Text style={styles.feltSub}>{drill.stackBb}bb eff</Text>
            )}
          </View>
        </LinearGradient>

        {seats.map((pos, i) => {
          const pt = points[i];
          const isHero = pos === drill.heroPosition;
          const actor = actors[pos];
          const folded = actor?.state === 'fold';
          const hot =
            isHero ||
            actor?.state === 'open' ||
            actor?.state === 'raise' ||
            actor?.state === '3bet' ||
            actor?.state === 'call' ||
            actor?.state === 'complete' ||
            actor?.state === 'check' ||
            actor?.state === 'toAct';

          return (
            <View
              key={pos}
              style={[
                styles.seat,
                {
                  left: pt.x * tableW - seatW / 2,
                  top: pt.y * tableH - seatH / 2,
                  width: seatW,
                  height: seatH,
                },
                isHero && styles.seatHero,
                folded && styles.seatFold,
                hot && !isHero && !folded && styles.seatLive,
              ]}
            >
              <Text
                style={[
                  styles.seatPos,
                  (isHero || folded || hot) && styles.seatPosOn,
                ]}
                numberOfLines={1}
              >
                {isHero ? 'ME' : pos}
              </Text>
              <Text
                style={[
                  styles.seatAct,
                  isHero && styles.seatActHero,
                  folded && styles.seatActFold,
                ]}
                numberOfLines={1}
              >
                {stateChip(actor, isHero)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.heroStrip}>
        <MiniCards cards={drill.holeCards} size="md" />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>
            {drill.heroPosition} · {drill.holeCards.join(' ')}
          </Text>
          <Text style={styles.heroLine} numberOfLines={2}>
            {drill.actionLine}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  stage: {
    alignSelf: 'center',
    position: 'relative',
  },
  felt: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    borderWidth: 2,
    overflow: 'hidden',
  },
  feltInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 24,
  },
  feltCenter: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 1.2,
  },
  feltSub: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: fonts.body,
    fontSize: 11,
  },
  boardRow: {
    transform: [{ scale: 0.92 }],
  },
  potPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  potText: {
    color: '#F7F4EF',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  seat: {
    position: 'absolute',
    borderRadius: 14,
    backgroundColor: 'rgba(10,14,26,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 1,
  },
  seatHero: {
    backgroundColor: 'rgba(77,163,255,0.28)',
    borderColor: dash.opsSoft,
    borderWidth: 1.5,
  },
  seatLive: {
    borderColor: 'rgba(46,230,106,0.45)',
    backgroundColor: 'rgba(14,28,20,0.92)',
  },
  seatFold: {
    opacity: 0.42,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  seatPos: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  seatPosOn: {
    color: '#fff',
  },
  seatAct: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
  },
  seatActHero: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
  },
  seatActFold: {
    color: 'rgba(255,255,255,0.35)',
  },
  heroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
  heroTitle: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  heroLine: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
