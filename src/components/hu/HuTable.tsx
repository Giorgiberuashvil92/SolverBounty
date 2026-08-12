import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../community/Avatar';
import { MiniCards } from '../community/MiniCards';
import type { HuPublicPlayer, HuView } from '../../api/huSocket';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { ActionTimer } from './ActionTimer';

type Props = {
  view: HuView;
};

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

function toneFrom(name: string) {
  const tones = ['#2A4A7A', '#1F4A36', '#4A2F55', '#3A3560', '#5A3828', '#2F4A28'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % 997;
  return tones[h % tones.length]!;
}

function highCardHint(hole: string[] | null | undefined): string | null {
  if (!hole?.length) return null;
  const order = '23456789TJQKA';
  let best = -1;
  let label = '';
  for (const c of hole) {
    const r = c[0]?.toUpperCase() ?? '';
    const i = order.indexOf(r);
    if (i > best) {
      best = i;
      label = r === 'T' ? 'T' : r;
    }
  }
  return label ? `High Card (${label})` : null;
}

const CHIP_COLORS = ['#1A5BB5', '#2B7FE0', '#4DA3FF'] as const;

function ChipGlyph({ size, fill }: { size: number; fill: string }) {
  const cx = size / 2;
  const r = size / 2 - 1;
  const ticks = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cx} r={r} fill={fill} stroke="rgba(255,255,255,0.42)" strokeWidth={1.2} />
      <Circle
        cx={cx}
        cy={cx}
        r={r * 0.58}
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={0.9}
      />
      {ticks.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = cx + Math.cos(rad) * r * 0.72;
        const y1 = cx + Math.sin(rad) * r * 0.72;
        const x2 = cx + Math.cos(rad) * r * 0.92;
        const y2 = cx + Math.sin(rad) * r * 0.92;
        return (
          <Path
            key={deg}
            d={`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={1.1}
            strokeLinecap="round"
          />
        );
      })}
      <Circle cx={cx} cy={cx} r={r * 0.16} fill="rgba(255,255,255,0.35)" />
    </Svg>
  );
}

function ChipStack({ size = 22, layers = 3 }: { size?: number; layers?: number }) {
  const step = Math.max(2, Math.round(size * 0.14));
  const height = size + step * (layers - 1);
  return (
    <View style={[styles.chipStackWrap, { width: size, height }]}>
      {Array.from({ length: layers }, (_, i) => (
        <View key={i} style={{ position: 'absolute', top: i * step, left: 0 }}>
          <ChipGlyph size={size} fill={CHIP_COLORS[i % CHIP_COLORS.length]!} />
        </View>
      ))}
    </View>
  );
}

function ChipBet({ amount }: { amount: number }) {
  return (
    <View style={styles.chipBet}>
      <ChipStack />
      <View style={styles.chipAmtBadge}>
        <Text style={styles.chipAmt}>{amount}</Text>
      </View>
    </View>
  );
}

function Nameplate({
  player,
  hint,
  acting,
  won,
}: {
  player: HuPublicPlayer;
  hint?: string | null;
  acting?: boolean;
  won?: boolean;
}) {
  return (
    <View style={[styles.plate, acting && styles.plateActing, won && styles.plateWon]}>
      <Text style={styles.plateName} numberOfLines={1}>
        {player.displayName}
      </Text>
      <View style={styles.plateStackRow}>
        <ChipGlyph size={13} fill="#2B7FE0" />
        <Text style={styles.plateStack}>{player.stack.toLocaleString()}</Text>
      </View>
      {hint ? <Text style={styles.plateHint}>{hint}</Text> : null}
    </View>
  );
}

export function HuTable({ view }: Props) {
  const { width } = useWindowDimensions();
  const tableW = Math.min(width - 20, 400);
  const tableH = Math.round(tableW * 1.28);

  const hero = view.players.find((p) => p.userId === view.heroUserId);
  const villain = view.players.find((p) => p.userId !== view.heroUserId);
  const heroHint = highCardHint(hero?.hole ?? null);
  const heroActing = view.actorUserId === hero?.userId && view.status === 'active';
  const villActing = view.actorUserId === villain?.userId && view.status === 'active';
  const heroWon = view.status === 'match_over' && view.winnerUserId === hero?.userId;
  const villWon = view.status === 'match_over' && view.winnerUserId === villain?.userId;
  const actionMs = view.actionMs ?? 20_000;
  const deadline = view.status === 'active' ? view.actionDeadlineMs : null;

  const avatarFor = (
    player: HuPublicPlayer,
    acting: boolean,
    status: 'online' | 'offline',
  ) => {
    const av = (
      <Avatar
        initials={initialsFrom(player.displayName)}
        tone={toneFrom(player.displayName)}
        size={46}
        status={status}
      />
    );
    if (!acting || !deadline) return av;
    return (
      <ActionTimer deadlineMs={deadline} totalMs={actionMs} size={54}>
        {av}
      </ActionTimer>
    );
  };

  return (
    <View style={styles.outer}>
      <View style={[styles.wrap, { width: tableW, height: tableH }]}>
        <LinearGradient
          colors={['#243656', '#1A2740', '#121C30', '#0E1626']}
          locations={[0, 0.35, 0.75, 1]}
          style={styles.felt}
        />
        <LinearGradient
          colors={['rgba(77,163,255,0.14)', 'transparent', 'rgba(155,107,255,0.08)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.feltGlow}
        />
        <View style={styles.innerRail} />
        <View style={styles.outerRail} />

        <View style={styles.blindBanner}>
          <Text style={styles.blindText}>
            {view.sb} / {view.bb}
            {'  ·  '}
            Increase in {view.handsUntilLevel} hands
          </Text>
        </View>

        {villain ? (
          <View style={styles.villainSeat}>
            {villain.hole && (view.showdown || view.status === 'match_over') ? (
              <MiniCards
                cards={villain.hole}
                size="sm"
                overlap={4}
                fan={false}
                animate
                dealKey={view.handNumber}
              />
            ) : (
              <View style={styles.backs}>
                <LinearGradient colors={['#2B7FE0', '#1A3A7A']} style={styles.back} />
                <LinearGradient
                  colors={['#2B7FE0', '#1A3A7A']}
                  style={[styles.back, { marginLeft: 6 }]}
                />
              </View>
            )}
            <View style={styles.villainRow}>
              {avatarFor(villain, villActing, villain.folded ? 'offline' : 'online')}
              <Nameplate player={villain} acting={villActing} won={villWon} />
              {villain.isButton ? (
                <View style={styles.dealer}>
                  <Text style={styles.dealerText}>D</Text>
                </View>
              ) : null}
            </View>
            {villain.bet > 0 ? (
              <View style={styles.villainBet}>
                <ChipBet amount={villain.bet} />
              </View>
            ) : null}
            {villain.folded ? (
              <View style={styles.foldBadge}>
                <Text style={styles.foldBadgeText}>Fold</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.center}>
          <View style={styles.potRow}>
            <ChipGlyph size={16} fill="#4DA3FF" />
            <Text style={styles.pot}>Pot: {view.pot.toLocaleString()}</Text>
          </View>
          {view.board.length > 0 ? (
            <View style={styles.board}>
              <MiniCards
                cards={view.board}
                size="md"
                overlap={5}
                fan={false}
                animate
                dealKey={view.handNumber}
              />
            </View>
          ) : (
            <Text style={styles.streetLabel}>{view.street}</Text>
          )}
          {view.lastAction ? (
            <View style={styles.actionToast}>
              <Text style={styles.actionToastText}>{view.lastAction.label}</Text>
            </View>
          ) : null}
        </View>

        {hero ? (
          <View style={styles.heroSeat}>
            {hero.bet > 0 ? (
              <View style={styles.heroBet}>
                <ChipBet amount={hero.bet} />
              </View>
            ) : null}
            <View style={styles.heroCardsRow}>
              {hero.hole ? (
                <MiniCards
                  cards={hero.hole}
                  size="md"
                  overlap={5}
                  fan
                  animate
                  dealKey={view.handNumber}
                />
              ) : null}
              {hero.isButton ? (
                <View style={styles.dealerHero}>
                  <Text style={styles.dealerText}>D</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.heroRow}>
              {avatarFor(hero, heroActing, 'online')}
              <Nameplate player={hero} hint={heroHint} acting={heroActing} won={heroWon} />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  wrap: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#121C30',
  },
  felt: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  feltGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  innerRail: {
    position: 'absolute',
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(77,163,255,0.22)',
  },
  outerRail: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    borderWidth: 10,
    borderColor: 'rgba(10,14,26,0.92)',
  },
  blindBanner: {
    position: 'absolute',
    top: 18,
    left: 36,
    right: 36,
    zIndex: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(11,16,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  blindText: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: 'center',
  },
  villainSeat: {
    position: 'absolute',
    top: 58,
    alignSelf: 'center',
    alignItems: 'center',
    width: '82%',
    gap: 8,
    zIndex: 4,
  },
  villainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroSeat: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    alignItems: 'center',
    width: '82%',
    gap: 8,
    zIndex: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroCardsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  center: {
    position: 'absolute',
    top: '36%',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 3,
  },
  plate: {
    minWidth: 108,
    maxWidth: 140,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(11,16,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  plateActing: {
    borderColor: 'rgba(77,163,255,0.55)',
    backgroundColor: 'rgba(20,32,56,0.92)',
  },
  plateWon: {
    borderColor: 'rgba(46,230,106,0.55)',
    backgroundColor: 'rgba(16,40,28,0.88)',
  },
  plateName: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  plateStackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  plateStack: {
    color: '#8FC4FF',
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  plateHint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 10,
    marginTop: 2,
  },
  dealer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  dealerHero: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dealerText: {
    color: '#111',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  backs: { flexDirection: 'row', marginBottom: 2 },
  back: {
    width: 36,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(143,196,255,0.4)',
  },
  chipBet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(8,12,24,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.28)',
  },
  chipStackWrap: {
    position: 'relative',
  },
  chipAmtBadge: {
    minWidth: 22,
    alignItems: 'center',
  },
  chipAmt: {
    color: '#EAF4FF',
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  villainBet: { marginTop: 2 },
  heroBet: { marginBottom: 2 },
  potRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pot: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  board: { marginTop: 2 },
  streetLabel: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  actionToast: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(11,16,32,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.25)',
  },
  actionToastText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  foldBadge: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  foldBadgeText: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
});
