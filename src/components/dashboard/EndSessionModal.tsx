import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

type EndSessionModalProps = {
  visible: boolean;
  buyInCents?: number;
  onCancel: () => void;
  onConfirm: (input: {
    cashOutCents: number;
    tiltScore: number;
    energyLevel: number;
  }) => void;
};

export function EndSessionModal({
  visible,
  buyInCents = 5000,
  onCancel,
  onConfirm,
}: EndSessionModalProps) {
  const [cashOut, setCashOut] = useState(String(buyInCents / 100));
  const [tilt, setTilt] = useState(3);
  const [energy, setEnergy] = useState(7);

  useEffect(() => {
    if (!visible) return;
    setCashOut(String(buyInCents / 100));
    setTilt(3);
    setEnergy(7);
  }, [visible, buyInCents]);

  const submit = () => {
    const dollars = Number(cashOut.replace(',', '.'));
    if (!Number.isFinite(dollars) || dollars < 0) return;
    onConfirm({
      cashOutCents: Math.round(dollars * 100),
      tiltScore: tilt,
      energyLevel: energy,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.sheet}>
          <Text style={styles.title}>End session</Text>
          <Text style={styles.sub}>Cash-out + quick mental close-out.</Text>

          <Text style={styles.label}>Cash-out ($)</Text>
          <TextInput
            value={cashOut}
            onChangeText={setCashOut}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholder="0"
            placeholderTextColor={dash.textMuted}
          />

          <Scale label="Tilt" value={tilt} onChange={setTilt} hot={tilt >= 7} />
          <Scale label="Energy" value={energy} onChange={setEnergy} />

          {tilt >= 7 ? (
            <Text style={styles.warn}>High tilt — consider study mode next.</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={submit} style={styles.confirmBtn}>
              <Text style={styles.confirmText}>End & save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Scale({
  label,
  value,
  onChange,
  hot,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hot?: boolean;
}) {
  return (
    <View style={styles.scale}>
      <View style={styles.scaleHead}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.scaleVal, hot && { color: dash.loss }]}>{value}/10</Text>
      </View>
      <View style={styles.pips}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.pip, n <= value && (hot ? styles.pipHot : styles.pipOn)]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d1520',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    paddingBottom: 28,
    gap: 10,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  sub: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 4,
  },
  label: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scale: { gap: 6, marginTop: 4 },
  scaleHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scaleVal: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  pips: { flexDirection: 'row', gap: 4 },
  pip: {
    flex: 1,
    height: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pipOn: { backgroundColor: dash.ops },
  pipHot: { backgroundColor: dash.loss },
  warn: {
    color: dash.loss,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelText: { color: dash.textSecondary, fontFamily: fonts.bodyBold },
  confirmBtn: {
    flex: 1.2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: dash.cta,
  },
  confirmText: { color: dash.ctaText, fontFamily: fonts.bodyBold },
});
