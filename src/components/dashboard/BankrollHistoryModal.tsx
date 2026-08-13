import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { formatMoney, formatSignedMoney } from '../../utils/money';
import type { Bankroll, BankrollLedgerEntry } from '../../types/session';

type BankrollHistoryModalProps = {
  visible: boolean;
  bankroll: Bankroll | null;
  onClose: () => void;
};

const TYPE_LABEL: Record<BankrollLedgerEntry['type'], string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  session_result: 'Session result',
  adjustment: 'Correction',
};

export function BankrollHistoryModal({
  visible,
  bankroll,
  onClose,
}: BankrollHistoryModalProps) {
  const insets = useSafeAreaInsets();
  if (!bankroll) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>BANKROLL</Text>
              <Text style={styles.title}>Transaction history</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
              <Ionicons name="close" size={20} color={dash.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.balance}>{formatMoney(bankroll.currentCents, bankroll.currency)}</Text>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {bankroll.ledger.length === 0 ? (
              <Text style={styles.empty}>No bankroll transactions yet.</Text>
            ) : (
              bankroll.ledger.map((entry) => (
                <View key={entry.id} style={styles.row}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{TYPE_LABEL[entry.type]}</Text>
                    <Text style={styles.rowDate}>
                      {new Date(entry.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.amount, entry.amountCents < 0 && styles.amountDown]}>
                    {formatSignedMoney(entry.amountCents, entry.currency)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#10182A',
    borderWidth: 1,
    borderColor: dash.borderStrong,
    padding: 18,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4 },
  title: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 22 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  balance: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 30 },
  list: { gap: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  rowDate: { color: dash.textMuted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  amount: { color: dash.profit, fontFamily: fonts.bodyBold, fontSize: 14 },
  amountDown: { color: dash.loss },
  empty: { color: dash.textMuted, fontFamily: fonts.body, fontSize: 14, paddingVertical: 18 },
});
