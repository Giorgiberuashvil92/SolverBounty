import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniCards } from '../community/MiniCards';
import type { HuView } from '../../api/huSocket';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

type Props = {
  view: HuView;
  youWon: boolean;
  onBack: () => void;
  onPlayAgain: () => void;
};

export function HuMatchResult({ view, youWon, onBack, onPlayAgain }: Props) {
  const insets = useSafeAreaInsets();
  const hero = view.players.find((p) => p.userId === view.heroUserId);
  const villain = view.players.find((p) => p.userId !== view.heroUserId);
  const lpDelta = youWon ? 18 : -17;
  const rating = youWon ? 3 : 2;
  const barPct = youWon ? 0.72 : 0.38;
  const ratingScore = 1200 + view.handNumber * 17 + (youWon ? 40 : 0);
  const perfectYou = Math.max(1, Math.round(view.handNumber * (youWon ? 0.35 : 0.28)));
  const perfectThem = Math.max(1, Math.round(view.handNumber * (youWon ? 0.28 : 0.35)));
  const mistakesYou = youWon ? 0 : 1;
  const mistakesThem = youWon ? 1 : 0;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#151A32', dash.bg, '#080C18']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={
          youWon
            ? ['rgba(46,230,106,0.35)', 'rgba(11,16,32,0.15)', 'transparent']
            : ['rgba(255,77,94,0.38)', 'rgba(11,16,32,0.15)', 'transparent']
        }
        locations={[0, 0.42, 1]}
        style={styles.heroGlow}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onBack} style={styles.backPill} hitSlop={8}>
          <Text style={styles.backText}>‹ Leave</Text>
        </Pressable>

        <View style={styles.heroBlock}>
          <Text style={styles.outcome}>{youWon ? 'VICTORY' : 'DEFEAT'}</Text>
          <View style={styles.stars}>
            {[1, 2, 3].map((i) => (
              <Text
                key={i}
                style={[styles.star, i <= rating ? styles.starOn : styles.starOff]}
              >
                ★
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.rankCard}>
          <View style={styles.rankTop}>
            <View>
              <Text style={styles.rankTier}>HU Online</Text>
              <Text style={styles.rankScore}>{ratingScore}</Text>
            </View>
            <Text style={styles.vsTiny}>vs {villain?.displayName ?? 'Opponent'}</Text>
          </View>
          <View style={styles.rankBounds}>
            <Text style={styles.bound}>Stack {hero?.stack ?? 0}</Text>
            <Text style={styles.bound}>H{view.handNumber}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.round(barPct * 100)}%` }]} />
          </View>
          <Text style={[styles.lpDelta, { color: youWon ? dash.profit : dash.loss }]}>
            {lpDelta > 0 ? `+${lpDelta}` : `${lpDelta}`} for the {youWon ? 'win' : 'loss'}
          </Text>
        </View>

        <View style={styles.momentsRow}>
          {hero?.hole ? (
            <View style={styles.moment}>
              <View style={styles.momentPocket}>
                <MiniCards cards={hero.hole} size="sm" overlap={4} fan={false} />
              </View>
              <Text style={styles.momentLabel}>{youWon ? 'Biggest win' : 'Heartbreaker'}</Text>
            </View>
          ) : null}
          {villain?.hole ? (
            <View style={styles.moment}>
              <View style={styles.momentPocket}>
                <MiniCards cards={villain.hole} size="sm" overlap={4} fan={false} />
              </View>
              <Text style={styles.momentLabel}>{youWon ? 'Their hand' : 'Biggest misstep'}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.stats}>
          <View style={styles.statsHead}>
            <Text style={[styles.statsHeadLabel, { flex: 1.4 }]}>Played hands</Text>
            <Text style={styles.statsHeadCol}>You</Text>
            <Text style={styles.statsHeadCol}>Opponent</Text>
          </View>
          <StatRow
            icon="✓"
            iconColor={dash.profit}
            label="Perfect"
            you={perfectYou}
            them={perfectThem}
            barColor={dash.profit}
          />
          <StatRow icon="◷" iconColor={dash.warning} label="Inaccurate" you={0} them={0} barColor={dash.warning} />
          <StatRow
            icon="!"
            iconColor={dash.loss}
            label="Mistakes"
            you={mistakesYou}
            them={mistakesThem}
            barColor={dash.loss}
          />
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onBack} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Back to lobby</Text>
          </Pressable>
          <Pressable onPress={onPlayAgain} style={styles.primaryBtn}>
            <LinearGradient
              colors={['#3DF080', dash.cta]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryGrad}
            >
              <Text style={styles.primaryText}>Play again</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function StatRow({
  icon,
  iconColor,
  label,
  you,
  them,
  barColor,
}: {
  icon: string;
  iconColor: string;
  label: string;
  you: number;
  them: number;
  barColor: string;
}) {
  const max = Math.max(you, them, 1);
  return (
    <View style={styles.statRow}>
      <View style={styles.statLabelWrap}>
        <Text style={[styles.statIcon, { color: iconColor }]}>{icon}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <View style={styles.statCol}>
        <Text style={styles.statNum}>{you}</Text>
        <View style={styles.miniTrack}>
          <View
            style={[
              styles.miniFill,
              { width: `${(you / max) * 100}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      </View>
      <View style={styles.statCol}>
        <Text style={styles.statNum}>{them}</Text>
        <View style={styles.miniTrack}>
          <View
            style={[
              styles.miniFill,
              { width: `${(them / max) * 100}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dash.bg,
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  backPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: dash.surfaceRaised,
    borderWidth: 1,
    borderColor: dash.borderStrong,
  },
  backText: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  heroBlock: {
    alignItems: 'center',
    marginTop: 48,
    gap: 6,
  },
  outcome: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 40,
    letterSpacing: 2,
  },
  stars: { flexDirection: 'row', gap: 8, marginTop: 2 },
  star: { fontSize: 20 },
  starOn: { color: dash.opsSoft },
  starOff: { color: 'rgba(255,255,255,0.18)' },
  rankCard: {
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: dash.surface,
    borderWidth: 1,
    borderColor: dash.border,
    gap: 8,
  },
  rankTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rankTier: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  rankScore: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 34,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  vsTiny: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 4,
  },
  rankBounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bound: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  barTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: dash.opsSoft,
  },
  lpDelta: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: 2,
  },
  momentsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  moment: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: dash.surfaceRaised,
    borderWidth: 1,
    borderColor: dash.border,
  },
  momentPocket: {
    minHeight: 44,
    justifyContent: 'center',
  },
  momentLabel: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    textAlign: 'center',
  },
  stats: {
    marginTop: 22,
    gap: 12,
  },
  statsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statsHeadLabel: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  statsHeadCol: {
    width: 72,
    textAlign: 'center',
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabelWrap: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    width: 16,
  },
  statLabel: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  statCol: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  statNum: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  miniTrack: {
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 999,
  },
  actions: {
    marginTop: 28,
    gap: 10,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: dash.surfaceRaised,
    borderWidth: 1,
    borderColor: dash.borderStrong,
  },
  secondaryText: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryGrad: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  primaryText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
});
