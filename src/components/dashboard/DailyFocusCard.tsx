import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { formatSignedMoney } from '../../utils/money';
import type { PokerSession } from '../../types/session';
import type { PlayerProfile } from '../../auth/session';

const GOAL_COPY: Record<NonNullable<PlayerProfile['goal']>, string> = {
  track: 'Focus: clean bankroll tracking today.',
  improve: 'Focus: log & review at least one leak hand.',
  coach: 'Focus: ask coach on one tough spot.',
  move_up: 'Focus: volume at current stakes with A-game only.',
};

type DailyFocusCardProps = {
  toReviewCount: number;
  lastSession: PokerSession | null;
  goal?: PlayerProfile['goal'];
  currency: string;
  onOpenReviews?: () => void;
  onOpenCoach?: () => void;
};

export function DailyFocusCard({
  toReviewCount,
  lastSession,
  goal,
  currency,
  onOpenReviews,
  onOpenCoach,
}: DailyFocusCardProps) {
  const lastLine = lastSession
    ? `${lastSession.stakesLabel} · ${formatSignedMoney(
        lastSession.profitLossCents ?? 0,
        lastSession.currency || currency,
      )} · ${lastSession.keyHands?.length ?? 0} hands`
    : 'No finished session yet today.';

  const focus =
    goal && GOAL_COPY[goal]
      ? GOAL_COPY[goal]
      : 'Focus: one clean session, then review.';

  return (
    <View style={styles.shell}>
      <Text style={styles.label}>TODAY</Text>
      <Text style={styles.title}>Next actions</Text>
      <Text style={styles.focus}>{focus}</Text>

      <Pressable
        onPress={onOpenReviews}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View>
          <Text style={styles.rowTitle}>Hands to review</Text>
          <Text style={styles.rowSub}>Second-look queue</Text>
        </View>
        <Text style={styles.badge}>{toReviewCount}</Text>
      </Pressable>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Last session</Text>
          <Text style={styles.rowSub}>{lastLine}</Text>
        </View>
      </View>

      {onOpenCoach ? (
        <Pressable
          onPress={onOpenCoach}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Ask coach on a spot</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: dash.border,
    backgroundColor: dash.surface,
    padding: 16,
    gap: 10,
  },
  label: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  focus: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: dash.surfaceRaised,
    borderWidth: 1,
    borderColor: dash.border,
  },
  rowTitle: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  rowSub: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    color: dash.ctaText,
    backgroundColor: dash.cta,
    overflow: 'hidden',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    minWidth: 32,
    textAlign: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cta: {
    marginTop: 2,
    backgroundColor: dash.ops,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  pressed: { opacity: 0.88 },
});
