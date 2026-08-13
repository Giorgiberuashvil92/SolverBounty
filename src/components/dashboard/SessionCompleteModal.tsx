import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { formatDuration, formatMoney, formatSignedMoney, hourlyRateCents, MIN_HOURLY_DURATION_SECONDS } from '../../utils/money';
import type { PokerSession } from '../../types/session';
import type { DrillRecommendation } from '../../api/dashboardApi';

type GameQuality = 'A' | 'B' | 'C';

type SessionCompleteModalProps = {
  visible: boolean;
  session: PokerSession | null;
  gameQuality: GameQuality;
  tiltScore: number;
  energyLevel: number;
  recommendation?: DrillRecommendation | null;
  onClose: () => void;
  onOpenReviews: () => void;
  onOpenDrills: () => void;
  onShareCommunity: () => void;
};

function inferPattern(session: PokerSession): { title: string; detail: string; drill: string } {
  const hands = session.keyHands;
  const tags = hands.flatMap((hand) => hand.tags ?? []);
  const counts = tags.reduce<Record<string, number>>((all, tag) => {
    all[tag] = (all[tag] ?? 0) + 1;
    return all;
  }, {});
  const [tag, count = 0] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];
  const label = tag?.replace(/_/g, ' ');

  if (label && count >= 2) {
    return {
      title: `${label[0].toUpperCase()}${label.slice(1)} spots need attention`,
      detail: `${count} logged hands point to the same decision family.`,
      drill: `Practice ${label} spots`,
    };
  }
  if (hands.some((hand) => hand.board && hand.board.length >= 4)) {
    return {
      title: 'Late-street decisions need attention',
      detail: 'You logged postflop spots worth replaying before the next session.',
      drill: 'Practice turn and river spots',
    };
  }
  return {
    title: hands.length ? 'Review your key decisions' : 'Log more decisive hands',
    detail: hands.length ? 'One clean review now will make the next session sharper.' : 'Capture 3 key spots next time to unlock a reliable pattern.',
    drill: 'Play a targeted drill',
  };
}

export function SessionCompleteModal({
  visible,
  session,
  gameQuality,
  tiltScore,
  energyLevel,
  recommendation,
  onClose,
  onOpenReviews,
  onOpenDrills,
  onShareCommunity,
}: SessionCompleteModalProps) {
  const profit = session?.profitLossCents ?? 0;
  const rate = session && session.durationSeconds >= MIN_HOURLY_DURATION_SECONDS
    ? session.hourlyRateCents ?? hourlyRateCents(profit, session.durationSeconds)
    : null;
  const fallbackPattern = useMemo(() => session ? inferPattern(session) : null, [session]);
  const pattern = recommendation
    ? { title: recommendation.title, detail: recommendation.reason, drill: recommendation.packId }
    : fallbackPattern;
  const win = profit >= 0;

  if (!session || !pattern) return null;

  const closeAnd = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.navigation}>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close summary">
              <Ionicons name="close" size={22} color={dash.textSecondary} />
            </Pressable>
            <Text style={styles.navTitle}>Session complete</Text>
            <View style={styles.closeButton} />
          </View>

          <View style={styles.completionHero}>
            <View style={[styles.completionRing, win ? styles.ringWin : styles.ringLoss]}>
              <View style={styles.completionInner}>
                <Ionicons name={win ? 'checkmark' : 'flag-outline'} size={31} color={win ? dash.profit : dash.loss} />
              </View>
            </View>
            <Text style={styles.heroKicker}>{gameQuality}-GAME SESSION</Text>
            <Text style={styles.heroTitle}>{session.stakesLabel}</Text>
            <Text style={[styles.heroResult, win ? styles.valueWin : styles.valueLoss]}>{formatSignedMoney(profit, session.currency)}</Text>
          </View>

          <View style={styles.metrics}>
            <Metric label="Time" value={formatDuration(session.durationSeconds)} />
            <View style={styles.divider} />
            <Metric label="$/hr" value={rate == null ? '—' : formatSignedMoney(rate, session.currency)} tone={rate ?? undefined} />
            <View style={styles.divider} />
            <Metric label="Hands" value={String(session.keyHands.length)} />
          </View>

          <View style={styles.recapCard}>
            <View style={styles.cardTopLine}>
              <Text style={styles.cardEyebrow}>SESSION RECAP</Text>
              <Text style={styles.sessionType}>{session.venue === 'live' ? 'Live' : 'Online'} · {session.gameType === 'mtt' ? 'Tournament' : 'Cash'}</Text>
            </View>
            <RecapRow label="Total in" value={formatMoney(session.buyInCents, session.currency)} />
            <RecapRow label="Cash-out" value={formatMoney(session.cashOutCents ?? session.buyInCents, session.currency)} />
            <RecapRow label="Game quality" value={`${gameQuality}-game`} valueColor={gameQuality === 'A' ? dash.profit : gameQuality === 'C' ? dash.loss : dash.opsSoft} />
            <RecapRow label="Mental close" value={`Tilt ${tiltScore}/10 · Energy ${energyLevel}/10`} />
          </View>

          <View style={styles.patternCard}>
            <View style={styles.patternIcon}><Ionicons name="sparkles" size={19} color={dash.brandSoft} /></View>
            <View style={styles.patternCopy}>
              <Text style={styles.patternEyebrow}>{recommendation?.source === 'ai' ? 'AI DRILL PLAN' : 'POTENTIAL PATTERN'}</Text>
              <Text numberOfLines={1} style={styles.patternTitle}>{pattern.title}</Text>
              <Text numberOfLines={2} style={styles.patternBody}>{pattern.detail}</Text>
            </View>
            <Pressable onPress={() => closeAnd(onOpenDrills)} style={styles.drillButton}>
              <Text style={styles.drillButtonText}>{recommendation?.difficulty === 'advanced' ? 'Hard' : 'Drill'}</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Pressable onPress={() => closeAnd(onOpenReviews)}>
              <LinearGradient
                colors={[dash.opsDeep, dash.ops]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.reviewButton}
              >
                <Ionicons name="clipboard-outline" size={20} color="#FFFFFF" />
                <Text style={styles.reviewButtonText}>Review {session.keyHands.length} hands</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => closeAnd(onShareCommunity)} style={styles.shareButton}>
              <Ionicons name="people-outline" size={18} color={dash.opsSoft} />
              <Text style={styles.shareButtonText}>Share recap to Community</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone != null && tone > 0 ? styles.valueWin : null, tone != null && tone < 0 ? styles.valueLoss : null]}>{value}</Text>
    </View>
  );
}

function RecapRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.recapRow}>
      <Text style={styles.recapLabel}>{label}</Text>
      <Text style={[styles.recapValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#070B15' },
  safe: { flex: 1, paddingHorizontal: 20, paddingBottom: 10 },
  navigation: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.05)' },
  navTitle: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 20 },
  completionHero: { alignItems: 'center', gap: 3, marginTop: 6 },
  completionRing: { width: 106, height: 106, alignItems: 'center', justifyContent: 'center', borderRadius: 53, borderWidth: 2, padding: 7 },
  ringWin: { borderColor: dash.profit, shadowColor: dash.profit, shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  ringLoss: { borderColor: dash.loss, shadowColor: dash.loss, shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  completionInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroKicker: { color: dash.textMuted, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, marginTop: 3 },
  heroTitle: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 24 },
  heroResult: { fontFamily: fonts.displayBold, fontSize: 35 },
  metrics: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(20,26,44,0.88)', paddingVertical: 11, marginTop: 13 },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricLabel: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 10 },
  metricValue: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  divider: { width: 1, height: 27, backgroundColor: 'rgba(255,255,255,0.14)' },
  recapCard: { borderRadius: 14, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(20,26,44,0.88)', padding: 13, gap: 9, marginTop: 11 },
  cardTopLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 1 },
  cardEyebrow: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4 },
  sessionType: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 10 },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  recapLabel: { color: dash.textSecondary, fontFamily: fonts.body, fontSize: 13 },
  recapValue: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 13, textAlign: 'right' },
  patternCard: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(155,107,255,0.38)', backgroundColor: 'rgba(65,41,111,0.48)', padding: 11, marginTop: 11 },
  patternIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(155,107,255,0.2)' },
  patternCopy: { flex: 1, minWidth: 0, gap: 2 },
  patternEyebrow: { color: dash.brandSoft, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.2 },
  patternTitle: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  patternBody: { color: dash.textSecondary, fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
  drillButton: { borderWidth: 1, borderColor: dash.ops, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  drillButtonText: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 11 },
  footer: { marginTop: 'auto', gap: 8 },
  reviewButton: { height: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 15 },
  reviewButtonText: { color: '#FFFFFF', fontFamily: fonts.bodyBold, fontSize: 16 },
  shareButton: { height: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(255,255,255,0.04)' },
  shareButtonText: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 12 },
  valueWin: { color: dash.profit },
  valueLoss: { color: dash.loss },
});
