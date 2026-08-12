import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ArenaPrize } from '../../api/arenaApi';
import {
  WEEKLY_PRIZES,
  medalForRank,
  prizeForRank,
  type DrillPrize,
  type LeaderboardEntry,
} from '../../data/drillLeaderboard';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { formatMoney } from '../../utils/money';

type Props = {
  visible: boolean;
  onClose: () => void;
  rows: LeaderboardEntry[];
  youRank: number;
  youLp: number;
  youAccuracy: number;
  youHuWins?: number;
  youHuLosses?: number;
  youHuPlayed?: number;
  prizePoolCents?: number;
  entrants?: number;
  prizes?: ArenaPrize[];
  endsAt?: string;
};

function prizeTone(tone: DrillPrize['tone'], i = 0) {
  if (tone === 'gold' || i === 0) {
    return { bg: 'rgba(255,176,32,0.14)', border: 'rgba(255,176,32,0.45)', text: dash.warning };
  }
  if (tone === 'silver' || i === 1) {
    return { bg: 'rgba(200,210,230,0.12)', border: 'rgba(200,210,230,0.35)', text: '#D7DEEA' };
  }
  if (tone === 'bronze' || i === 2) {
    return { bg: 'rgba(205,127,50,0.14)', border: 'rgba(205,127,50,0.4)', text: '#E8A86A' };
  }
  return { bg: 'rgba(46,230,106,0.12)', border: 'rgba(46,230,106,0.35)', text: dash.cta };
}

export function DrillLeaderboardModal({
  visible,
  onClose,
  rows,
  youRank,
  youLp,
  youAccuracy,
  youHuWins = 0,
  youHuLosses = 0,
  youHuPlayed = 0,
  prizePoolCents,
  entrants,
  prizes,
  endsAt,
}: Props) {
  const insets = useSafeAreaInsets();
  const chase = prizeForRank(youRank);
  const top3 = rows.slice(0, 3);
  const prizeCards =
    prizes?.map((p, i) => ({
      place: p.place,
      title: p.title,
      detail: p.detail,
      tone: (i === 0
        ? 'gold'
        : i === 1
          ? 'silver'
          : i === 2
            ? 'bronze'
            : 'mint') as DrillPrize['tone'],
    })) ?? WEEKLY_PRIZES;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <LinearGradient
          colors={['#1A2240', '#0B1020', '#080C18']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>ARENA · THIS WEEK</Text>
            <Text style={styles.title}>Leaderboard</Text>
            <Text style={styles.sub}>
              Daily 10 + HU wins · LP · bankroll pool
              {endsAt ? ` · ends ${endsAt}` : ''}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.doneBtn} hitSlop={8}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: Math.max(insets.bottom, 20) }]}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['rgba(46,230,106,0.2)', 'rgba(20,26,44,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.poolCard}
          >
            <Text style={styles.poolEyebrow}>PRIZE BANKROLL</Text>
            <Text style={styles.poolTitle}>
              {prizePoolCents != null ? formatMoney(prizePoolCents) : '—'}
            </Text>
            <Text style={styles.poolSub}>
              House seed + $5 per entrant
              {entrants != null ? ` · ${entrants} in` : ''}
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(77,163,255,0.18)', 'rgba(20,26,44,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.youCard}
          >
            <Text style={styles.youEyebrow}>YOUR RANK</Text>
            <View style={styles.youRow}>
              <Text style={styles.youRank}>#{youRank || '—'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.youLp}>{youLp} LP</Text>
                <Text style={styles.youAcc}>
                  {youAccuracy}% soft accuracy
                  {youHuPlayed ? ` · HU ${youHuWins}-${youHuLosses}` : ''}
                </Text>
              </View>
            </View>
            {chase ? (
              <Text style={styles.youPrize}>
                In prize range · {chase.place} — {chase.title}
              </Text>
            ) : (
              <Text style={styles.youPrizeMuted}>
                Climb into Top 10 to unlock weekly bankroll share.
              </Text>
            )}
          </LinearGradient>

          <Text style={styles.section}>Podium</Text>
          <View style={styles.podium}>
            {top3.length === 0 ? (
              <Text style={styles.empty}>Be the first entrant this week.</Text>
            ) : (
              top3.map((row, i) => {
                const rank = i + 1;
                return (
                  <View
                    key={row.id}
                    style={[
                      styles.podiumCard,
                      rank === 1 && styles.podiumFirst,
                      row.isYou && styles.podiumYou,
                    ]}
                  >
                    <Text style={styles.podiumPlace}>#{rank}</Text>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {row.isYou ? 'You' : row.name}
                    </Text>
                    <Text style={styles.podiumLp}>{row.lp} LP</Text>
                  </View>
                );
              })
            )}
          </View>

          <Text style={styles.section}>Standings</Text>
          <View style={styles.list}>
            {rows.map((row, i) => {
              const rank = i + 1;
              return (
                <View key={row.id} style={[styles.row, row.isYou && styles.rowYou]}>
                  <Text style={[styles.rank, rank <= 3 && styles.rankHot]}>
                    {medalForRank(rank)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {row.isYou ? 'You' : row.name}
                      {row.isYou ? '  ·  you' : ''}
                    </Text>
                    <Text style={styles.meta}>
                      {row.accuracy}% · {row.answered} spots
                      {row.huPlayed ? ` · HU ${row.huWins ?? 0}-${row.huLosses ?? 0}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.lp}>{row.lp}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.section}>Bankroll split</Text>
          <View style={styles.prizeList}>
            {prizeCards.map((p, i) => {
              const tone = prizeTone(p.tone, i);
              return (
                <View
                  key={p.place}
                  style={[
                    styles.prizeCard,
                    { backgroundColor: tone.bg, borderColor: tone.border },
                  ]}
                >
                  <Text style={[styles.prizePlace, { color: tone.text }]}>{p.place}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prizeTitle}>{p.title}</Text>
                    <Text style={styles.prizeDetail}>{p.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.footnote}>
            Everyone plays the same Daily 10. Best +100 LP · Playable +40 · Leak 0. First ranked
            run each day enters you and grows the pool. Real HU wins add +100 LP; losses add +20.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dash.bg },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  kicker: {
    color: 'rgba(255,255,255,0.38)',
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    letterSpacing: -0.4,
  },
  sub: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  doneBtn: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(77,163,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
  },
  doneText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  body: {
    paddingHorizontal: 16,
    gap: 12,
  },
  poolCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.35)',
    gap: 4,
  },
  poolEyebrow: {
    color: dash.cta,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  poolTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 34,
    letterSpacing: -0.8,
  },
  poolSub: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  youCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.28)',
    gap: 8,
  },
  youEyebrow: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  youRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  youRank: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 36,
    letterSpacing: -1,
  },
  youLp: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
  },
  youAcc: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  youPrize: {
    color: dash.cta,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  youPrizeMuted: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  section: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 4,
  },
  empty: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  podium: {
    flexDirection: 'row',
    gap: 8,
  },
  podiumCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 4,
  },
  podiumFirst: {
    borderColor: 'rgba(255,176,32,0.45)',
    backgroundColor: 'rgba(255,176,32,0.1)',
  },
  podiumYou: {
    borderColor: 'rgba(77,163,255,0.45)',
  },
  podiumPlace: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  podiumName: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  podiumLp: {
    color: dash.opsSoft,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
  list: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(20,26,44,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowYou: {
    borderColor: 'rgba(77,163,255,0.4)',
    backgroundColor: 'rgba(77,163,255,0.1)',
  },
  rank: {
    width: 28,
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    textAlign: 'center',
  },
  rankHot: { color: dash.warning },
  name: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  meta: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
  lp: {
    color: dash.cta,
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  prizeList: { gap: 8 },
  prizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  prizePlace: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    minWidth: 42,
  },
  prizeTitle: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  prizeDetail: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  footnote: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
});
