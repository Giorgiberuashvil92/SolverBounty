import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { formatSignedMoney } from '../../utils/money';
import type { PokerSession } from '../../types/session';

type TodaySnapshotCardProps = {
  toReviewCount: number;
  lastSession: PokerSession | null;
  onOpenReviews?: () => void;
};

export function TodaySnapshotCard({
  toReviewCount,
  lastSession,
  onOpenReviews,
}: TodaySnapshotCardProps) {
  const result = lastSession?.profitLossCents ?? 0;
  const lastResult = lastSession
    ? `${result === 0 ? 'Break even' : formatSignedMoney(result, lastSession.currency)} · ${sessionDuration(lastSession.durationSeconds)}`
    : 'No sessions yet';

  return (
    <Pressable
      onPress={onOpenReviews}
      style={({ pressed }) => [styles.shell, pressed && styles.pressed]}
    >
      <Metric
        icon="document-text-outline"
        label="Hands to review"
        value={String(toReviewCount)}
        valueColor={toReviewCount > 0 ? dash.text : dash.textMuted}
      />
      <View style={styles.divider} />
      <Metric
        icon="trending-up-outline"
        label="Last session"
        value={lastResult}
        valueColor={result > 0 ? dash.profit : result < 0 ? dash.loss : dash.textSecondary}
      />
    </Pressable>
  );
}

function sessionDuration(seconds: number): string {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function Metric({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={dash.opsSoft} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dash.borderStrong,
    backgroundColor: dash.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  metric: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: dash.opsDim,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.18)',
  },
  label: { color: dash.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 11 },
  value: { fontFamily: fonts.displayBold, fontSize: 19, marginTop: 1 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 10 },
  pressed: { opacity: 0.86 },
});
