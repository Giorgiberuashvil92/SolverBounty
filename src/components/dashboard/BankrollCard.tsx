import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { formatMoney, formatSignedMoney } from '../../utils/money';
import type { Bankroll } from '../../types/session';

type BankrollCardProps = {
  bankroll: Bankroll;
  todaysProfitCents: number;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onOpenHistory?: () => void;
};

export function BankrollCard({
  bankroll,
  todaysProfitCents,
  onDeposit,
  onWithdraw,
  onOpenHistory,
}: BankrollCardProps) {
  const todayColor = todaysProfitCents >= 0 ? dash.profit : dash.loss;

  return (
    <View style={styles.shell}>
      <View style={styles.iconWrap}>
        <Ionicons name="wallet-outline" size={25} color={dash.opsSoft} />
      </View>
      <Pressable onPress={onOpenHistory} style={styles.copy}>
        <Text style={styles.label}>BANKROLL</Text>
        <View style={styles.amountRow}>
          <Text style={styles.total}>{formatMoney(bankroll.currentCents, bankroll.currency)}</Text>
          <Text style={[styles.today, { color: todayColor }]}>Today {formatSignedMoney(todaysProfitCents, bankroll.currency)}</Text>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Pressable onPress={onDeposit} hitSlop={5} style={styles.action}>
          <Text style={styles.depositText}>Deposit</Text>
        </Pressable>
        <Pressable onPress={onWithdraw} hitSlop={5} style={styles.action}>
          <Text style={styles.withdrawText}>Withdraw</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dash.border,
    backgroundColor: dash.surface,
    padding: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: dash.opsDim,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.22)',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  total: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 24 },
  today: { fontFamily: fonts.bodyBold, fontSize: 12 },
  actions: { gap: 5 },
  action: {
    minWidth: 62,
    alignItems: 'center',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  depositText: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 10 },
  withdrawText: { color: dash.textSecondary, fontFamily: fonts.bodyBold, fontSize: 10 },
});
