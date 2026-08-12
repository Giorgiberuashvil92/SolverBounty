import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import type { PreSessionChecklist } from '../../types/session';

const STAKES = ['NL25', 'NL50', 'NL100', 'NL200'] as const;

type StartSessionModalProps = {
  visible: boolean;
  initialChecklist?: PreSessionChecklist;
  onCancel: () => void;
  onConfirm: (input: {
    stakesLabel: string;
    buyInCents: number;
    preSession: PreSessionChecklist;
  }) => void;
};

export function StartSessionModal({
  visible,
  initialChecklist,
  onCancel,
  onConfirm,
}: StartSessionModalProps) {
  const [stakes, setStakes] = useState<string>('NL50');
  const [buyIn, setBuyIn] = useState('50');
  const [hydration, setHydration] = useState(false);
  const [warmup, setWarmup] = useState(false);
  const [focusLevel, setFocusLevel] = useState(5);

  useEffect(() => {
    if (!visible) return;
    setStakes('NL50');
    setBuyIn('50');
    setHydration(initialChecklist?.hydration ?? false);
    setWarmup(initialChecklist?.warmup ?? false);
    setFocusLevel(initialChecklist?.focusLevel ?? 5);
  }, [visible, initialChecklist]);

  const submit = () => {
    const dollars = Number(buyIn.replace(',', '.'));
    if (!Number.isFinite(dollars) || dollars <= 0) return;
    onConfirm({
      stakesLabel: stakes.trim() || 'NL50',
      buyInCents: Math.round(dollars * 100),
      preSession: { hydration, warmup, focusLevel },
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
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Start session</Text>
            <Text style={styles.sub}>Stakes, buy-in, then a 10-second pre-check.</Text>

            <Text style={styles.label}>Stakes</Text>
            <View style={styles.chips}>
              {STAKES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => {
                    setStakes(s);
                    const bb = Number(s.replace('NL', ''));
                    if (Number.isFinite(bb)) setBuyIn(String(bb));
                  }}
                  style={[styles.chip, stakes === s && styles.chipActive]}
                >
                  <Text style={[styles.chipText, stakes === s && styles.chipTextActive]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Buy-in ($)</Text>
            <TextInput
              value={buyIn}
              onChangeText={setBuyIn}
              keyboardType="decimal-pad"
              placeholder="50"
              placeholderTextColor={dash.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>Pre-session</Text>
            <Toggle
              label="Hydration"
              active={hydration}
              onPress={() => setHydration((v) => !v)}
            />
            <Toggle label="Warm-up" active={warmup} onPress={() => setWarmup((v) => !v)} />
            <Text style={styles.focusLabel}>Focus · {focusLevel}/10</Text>
            <View style={styles.pips}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setFocusLevel(n)}
                  style={[styles.pip, n <= focusLevel && styles.pipOn]}
                />
              ))}
            </View>

            <View style={styles.actions}>
              <Pressable onPress={onCancel} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submit} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>Go live</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Toggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.toggle}>
      <Text style={styles.toggleText}>{label}</Text>
      <View style={[styles.check, active && styles.checkOn]}>
        <Text style={styles.checkMark}>{active ? '✓' : ''}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#0d1520',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    paddingBottom: 28,
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
    marginBottom: 8,
    marginTop: 4,
  },
  label: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 10,
    marginBottom: 6,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(77,163,255,0.14)',
    borderColor: 'rgba(77,163,255,0.35)',
  },
  chipText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  chipTextActive: { color: dash.opsSoft },
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
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 6,
  },
  toggleText: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: dash.ops, borderColor: dash.ops },
  checkMark: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 12 },
  focusLabel: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 4,
  },
  pips: { flexDirection: 'row', gap: 4, marginTop: 6 },
  pip: {
    flex: 1,
    height: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pipOn: { backgroundColor: dash.ops },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
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
