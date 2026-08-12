import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { formatMoney, formatSignedMoney } from '../../utils/money';
import type { Bankroll } from '../../types/session';

type BankrollCardProps = {
  bankroll: Bankroll;
  todaysProfitCents: number;
  onDeposit?: () => void;
  onWithdraw?: () => void;
};

export function BankrollCard({
  bankroll,
  todaysProfitCents,
  onDeposit,
  onWithdraw,
}: BankrollCardProps) {
  const dayDelta = bankroll.currentCents - bankroll.startingOfDayCents;
  const dayColor = dayDelta >= 0 ? dash.profit : dash.loss;
  const todayColor = todaysProfitCents >= 0 ? dash.profit : dash.loss;

  return (
    <LinearGradient
      colors={['rgba(77,163,255,0.1)', dash.surfaceRaised, dash.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.shell}
    >
      <View style={styles.top}>
        <Text style={styles.label}>BANKROLL</Text>
        <Text style={[styles.pill, { color: dayColor, borderColor: `${dayColor}55` }]}>
          Day {formatSignedMoney(dayDelta, bankroll.currency)}
        </Text>
      </View>

      <Text style={styles.total}>{formatMoney(bankroll.currentCents, bankroll.currency)}</Text>
      <Text style={styles.caption}>Command center · effective roll</Text>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Session P/L</Text>
          <Text style={[styles.metricValue, { color: todayColor }]}>
            {formatSignedMoney(todaysProfitCents, bankroll.currency)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Start of day</Text>
          <Text style={styles.metricValue}>
            {formatMoney(bankroll.startingOfDayCents, bankroll.currency)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onDeposit}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
          <Text style={styles.btnText}>Deposit</Text>
        </Pressable>
        <Pressable
          onPress={onWithdraw}
          style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
        >
          <Text style={styles.btnGhostText}>Withdraw</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 18,
    gap: 8,
    overflow: 'hidden',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  pill: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  total: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 42,
    letterSpacing: -1.2,
    marginTop: 4,
  },
  caption: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 4,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8,4,18,0.45)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  metric: {
    flex: 1,
    gap: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 12,
  },
  metricLabel: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  metricValue: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  btn: {
    flex: 1,
    backgroundColor: dash.cta,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  btnGhost: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15,24,36,0.75)',
  },
  btnGhostText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.88,
  },
});
