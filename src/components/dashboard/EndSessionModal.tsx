import { useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { formatDuration, formatSignedMoney } from '../../utils/money';
import type { PokerSession } from '../../types/session';

type EndSessionModalProps = {
  visible: boolean;
  session?: PokerSession | null;
  onCancel: () => void;
  onConfirm: (input: {
    cashOutCents: number;
    tiltScore: number;
    energyLevel: number;
    gameQuality: 'A' | 'B' | 'C';
  }) => void;
};

type CloseoutChoice = {
  label: string;
  value: number;
};

const TILT_CHOICES: CloseoutChoice[] = [
  { label: 'Calm', value: 2 },
  { label: 'Mixed', value: 5 },
  { label: 'Tilted', value: 8 },
];

const ENERGY_CHOICES: CloseoutChoice[] = [
  { label: 'Low', value: 3 },
  { label: 'Okay', value: 6 },
  { label: 'High', value: 9 },
];

function centsFromInput(value: string): number {
  const dollars = Number(value.replace(',', '.'));
  return Number.isFinite(dollars) && dollars >= 0 ? Math.round(dollars * 100) : 0;
}

function money(cents: number): string {
  return `$${Math.max(0, Math.round(cents / 100)).toLocaleString('en-US')}`;
}

function elapsedSeconds(session?: PokerSession | null): number {
  if (!session?.startedAt) return session?.durationSeconds ?? 0;
  const started = Date.parse(session.startedAt);
  return Number.isFinite(started)
    ? Math.max(0, Math.floor((Date.now() - started) / 1000))
    : session.durationSeconds;
}

export function EndSessionModal({
  visible,
  session,
  onCancel,
  onConfirm,
}: EndSessionModalProps) {
  const buyInCents = session?.buyInCents ?? 5_000;
  const currency = session?.currency ?? 'USD';
  const [cashOut, setCashOut] = useState(String(buyInCents / 100));
  const [tilt, setTilt] = useState(2);
  const [energy, setEnergy] = useState(6);
  const [gameQuality, setGameQuality] = useState<'A' | 'B' | 'C'>('A');

  useEffect(() => {
    if (!visible) return;
    setCashOut(String(buyInCents / 100));
    setTilt(2);
    setEnergy(6);
    setGameQuality('A');
  }, [visible, buyInCents]);

  const cashOutCents = centsFromInput(cashOut);
  const profitCents = cashOutCents - buyInCents;
  const profitPercent = buyInCents > 0 ? Math.round((profitCents / buyInCents) * 100) : 0;
  const duration = elapsedSeconds(session);
  const increment = Math.max(500, Math.round(buyInCents / 8 / 100) * 100);
  const quickCashOuts = [
    { label: '$0', value: 0 },
    { label: 'Even', value: buyInCents },
    { label: '+50%', value: Math.round(buyInCents * 1.5) },
    { label: '+100%', value: buyInCents * 2 },
  ];
  const sessionLabel = useMemo(() => {
    const venue = session?.venue === 'live' ? 'Live' : 'Online';
    const game = session?.gameType === 'mtt' ? 'Tournament' : 'Cash';
    return `${venue} ${game}`;
  }, [session?.gameType, session?.venue]);

  const submit = () => {
    const parsed = centsFromInput(cashOut);
    onConfirm({ cashOutCents: parsed, tiltScore: tilt, energyLevel: energy, gameQuality });
  };

  const adjustCashOut = (direction: -1 | 1) => {
    setCashOut(String(Math.max(0, cashOutCents + increment * direction) / 100));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.navigation}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Continue session"
              style={styles.navButton}
            >
              <Ionicons name="chevron-back" size={27} color={dash.text} />
            </Pressable>
            <Text style={styles.navTitle}>Finish session</Text>
            <Pressable onPress={submit} style={styles.doneButton}>
              <Text style={styles.doneText}>Save</Text>
            </Pressable>
          </View>

          <View style={styles.sessionCard}>
            <View style={styles.sessionHead}>
              <View style={styles.liveLabel}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE SESSION</Text>
              </View>
              <Text style={styles.duration}>{formatDuration(duration)}</Text>
            </View>
            <Text style={styles.sessionTitle}>{session?.stakesLabel ?? 'Cash session'}</Text>
            <Text style={styles.sessionMeta}>{sessionLabel} · {session?.keyHands.length ?? 0} hands logged</Text>
          </View>

          <View style={styles.cashoutSection}>
            <View style={styles.cashoutHeader}>
              <Text style={styles.sectionLabel}>CASH-OUT</Text>
              <Text style={styles.buyInLabel}>Buy-in {money(buyInCents)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Pressable onPress={() => adjustCashOut(-1)} style={styles.amountButton} accessibilityLabel="Decrease cash-out">
                <Ionicons name="remove" size={24} color={dash.opsSoft} />
              </Pressable>
              <TextInput
                value={cashOut}
                onChangeText={setCashOut}
                keyboardType="decimal-pad"
                selectTextOnFocus
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={dash.textMuted}
              />
              <Pressable onPress={() => adjustCashOut(1)} style={styles.amountButton} accessibilityLabel="Increase cash-out">
                <Ionicons name="add" size={24} color={dash.opsSoft} />
              </Pressable>
            </View>
            <View style={styles.quickRow}>
              {quickCashOuts.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => setCashOut(String(item.value / 100))}
                  style={[styles.quickOption, cashOutCents === item.value && styles.quickOptionSelected]}
                >
                  <Text style={[styles.quickText, cashOutCents === item.value && styles.quickTextSelected]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.resultCard, profitCents > 0 && styles.resultWin, profitCents < 0 && styles.resultLoss]}>
            <View>
              <Text style={styles.resultLabel}>SESSION RESULT</Text>
              <Text style={[styles.resultValue, profitCents > 0 && styles.resultValueWin, profitCents < 0 && styles.resultValueLoss]}>
                {formatSignedMoney(profitCents, currency)}
              </Text>
            </View>
            <View style={styles.resultDetail}>
              <Ionicons name={profitCents >= 0 ? 'trending-up-outline' : 'trending-down-outline'} size={22} color={profitCents >= 0 ? dash.profit : dash.loss} />
              <Text style={[styles.resultPercent, profitCents > 0 && styles.resultValueWin, profitCents < 0 && styles.resultValueLoss]}>{profitPercent > 0 ? '+' : ''}{profitPercent}%</Text>
            </View>
          </View>

          <View style={styles.closeoutSection}>
            <Text style={styles.sectionLabel}>QUICK CLOSE-OUT</Text>
            <View style={styles.gameQualityRow}>
              <Text style={styles.closeoutText}>Game</Text>
              <View style={styles.gameQualityChoices}>
                {(['A', 'B', 'C'] as const).map((grade) => (
                  <Pressable
                    key={grade}
                    onPress={() => setGameQuality(grade)}
                    style={[styles.gradeOption, gameQuality === grade && (grade === 'C' ? styles.gradeOptionC : styles.gradeOptionSelected)]}
                  >
                    <Text style={[styles.gradeText, gameQuality === grade && (grade === 'C' ? styles.gradeTextC : styles.gradeTextSelected)]}>{grade}-game</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <CloseoutRow label="Tilt" icon="pulse-outline" choices={TILT_CHOICES} value={tilt} onChange={setTilt} tone={tilt >= 8 ? 'loss' : 'blue'} />
            <CloseoutRow label="Energy" icon="flash-outline" choices={ENERGY_CHOICES} value={energy} onChange={setEnergy} tone="blue" />
          </View>

          <View style={styles.footer}>
            <Pressable onPress={submit} style={({ pressed }) => [pressed && styles.pressed]}>
              <LinearGradient
                colors={profitCents < 0 ? ['#D93C4C', dash.loss] : [dash.cta, '#22C95A']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmText}>End & save</Text>
                <Ionicons name="checkmark" size={25} color={profitCents < 0 ? '#FFFFFF' : dash.ctaText} />
              </LinearGradient>
            </Pressable>
            <Text numberOfLines={1} style={styles.footerCopy}>Your result and close-out will be saved to Reviews.</Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CloseoutRow({
  label,
  icon,
  choices,
  value,
  onChange,
  tone,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  choices: CloseoutChoice[];
  value: number;
  onChange: (value: number) => void;
  tone: 'blue' | 'loss';
}) {
  return (
    <View style={styles.closeoutRow}>
      <View style={styles.closeoutLabel}>
        <Ionicons name={icon} size={18} color={tone === 'loss' ? dash.loss : dash.opsSoft} />
        <Text style={styles.closeoutText}>{label}</Text>
      </View>
      <View style={styles.closeoutChoices}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <Pressable
              key={choice.label}
              onPress={() => onChange(choice.value)}
              style={[styles.choice, selected && (tone === 'loss' ? styles.choiceLoss : styles.choiceSelected)]}
            >
              <Text style={[styles.choiceText, selected && (tone === 'loss' ? styles.choiceTextLoss : styles.choiceTextSelected)]}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#070B15' },
  safe: { flex: 1, paddingHorizontal: 20, paddingBottom: 8 },
  navigation: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  navButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  navTitle: { flex: 1, color: dash.text, fontFamily: fonts.displayBold, fontSize: 23, textAlign: 'center' },
  doneButton: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  doneText: { color: dash.ops, fontFamily: fonts.bodyMedium, fontSize: 17 },
  sessionCard: { borderRadius: 15, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(18,32,58,0.9)', padding: 13, gap: 3, marginTop: 10 },
  sessionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: dash.profit },
  liveText: { color: dash.profit, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.1 },
  duration: { color: dash.textSecondary, fontFamily: fonts.bodyBold, fontSize: 13 },
  sessionTitle: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 25 },
  sessionMeta: { color: dash.textSecondary, fontFamily: fonts.body, fontSize: 12 },
  cashoutSection: { gap: 7, marginTop: 19 },
  cashoutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { color: dash.textSecondary, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.8 },
  buyInLabel: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 12 },
  amountRow: { height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  amountButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(143,196,255,0.42)', backgroundColor: 'rgba(18,31,55,0.72)' },
  amountInput: { flex: 1, color: dash.text, fontFamily: fonts.displayBold, fontSize: 45, lineHeight: 53, textAlign: 'center', padding: 0 },
  quickRow: { flexDirection: 'row', overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(18,26,45,0.88)' },
  quickOption: { flex: 1, minHeight: 39, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.09)' },
  quickOptionSelected: { borderWidth: 1, borderRadius: 15, borderColor: dash.ops, backgroundColor: 'rgba(26,92,191,0.32)' },
  quickText: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 11 },
  quickTextSelected: { color: dash.text, fontFamily: fonts.bodyBold },
  resultCard: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 15, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(20,26,44,0.9)', paddingHorizontal: 14, marginTop: 15 },
  resultWin: { borderColor: 'rgba(46,230,106,0.34)', backgroundColor: 'rgba(16,73,43,0.24)' },
  resultLoss: { borderColor: 'rgba(255,77,94,0.38)', backgroundColor: 'rgba(94,25,37,0.24)' },
  resultLabel: { color: dash.textMuted, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.3 },
  resultValue: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 31, marginTop: 1 },
  resultValueWin: { color: dash.profit },
  resultValueLoss: { color: dash.loss },
  resultDetail: { alignItems: 'flex-end', gap: 3 },
  resultPercent: { color: dash.textSecondary, fontFamily: fonts.bodyBold, fontSize: 15 },
  closeoutSection: { gap: 8, marginTop: 19 },
  gameQualityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gameQualityChoices: { flex: 1, flexDirection: 'row', gap: 5 },
  gradeOption: { flex: 1, minHeight: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(255,255,255,0.04)' },
  gradeOptionSelected: { borderColor: dash.profit, backgroundColor: 'rgba(46,230,106,0.13)' },
  gradeOptionC: { borderColor: dash.loss, backgroundColor: 'rgba(255,77,94,0.14)' },
  gradeText: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 10 },
  gradeTextSelected: { color: dash.profit, fontFamily: fonts.bodyBold },
  gradeTextC: { color: dash.loss, fontFamily: fonts.bodyBold },
  closeoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  closeoutLabel: { width: 84, flexDirection: 'row', alignItems: 'center', gap: 6 },
  closeoutText: { color: dash.textSecondary, fontFamily: fonts.bodyBold, fontSize: 13 },
  closeoutChoices: { flex: 1, flexDirection: 'row', gap: 5 },
  choice: { flex: 1, minHeight: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(255,255,255,0.04)' },
  choiceSelected: { borderColor: dash.ops, backgroundColor: 'rgba(77,163,255,0.17)' },
  choiceLoss: { borderColor: dash.loss, backgroundColor: 'rgba(255,77,94,0.14)' },
  choiceText: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 10 },
  choiceTextSelected: { color: dash.opsSoft, fontFamily: fonts.bodyBold },
  choiceTextLoss: { color: dash.loss, fontFamily: fonts.bodyBold },
  footer: { marginTop: 'auto', gap: 8 },
  confirmButton: { height: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, borderRadius: 16 },
  confirmText: { color: dash.ctaText, fontFamily: fonts.bodyBold, fontSize: 18 },
  footerCopy: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 11, textAlign: 'center' },
  pressed: { opacity: 0.84 },
});
