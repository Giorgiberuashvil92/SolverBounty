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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import type { PreSessionChecklist } from '../../types/session';

type Venue = 'live' | 'online';
type TableType = 'cash' | 'mtt';
type BuyInPreset = 100 | 200 | 350 | 'custom';

type StakeOption = {
  label: string;
  detail: string;
  unitCents: number;
};

const CASH_STAKES: StakeOption[] = [
  { label: 'NL25', detail: '$0.10 / $0.25 blinds', unitCents: 25 },
  { label: 'NL50', detail: '$0.25 / $0.50 blinds', unitCents: 50 },
  { label: 'NL100', detail: '$0.50 / $1 blinds', unitCents: 100 },
  { label: 'NL200', detail: '$1 / $2 blinds', unitCents: 200 },
  { label: 'NL500', detail: '$2 / $5 blinds', unitCents: 500 },
];

const TOURNAMENT_STAKES: StakeOption[] = [
  { label: 'MTT $5', detail: '$5 tournament buy-in', unitCents: 500 },
  { label: 'MTT $10', detail: '$10 tournament buy-in', unitCents: 1_000 },
  { label: 'MTT $25', detail: '$25 tournament buy-in', unitCents: 2_500 },
  { label: 'MTT $50', detail: '$50 tournament buy-in', unitCents: 5_000 },
  { label: 'MTT $100', detail: '$100 tournament buy-in', unitCents: 10_000 },
];

type StartSessionModalProps = {
  visible: boolean;
  initialChecklist?: PreSessionChecklist;
  initialStakes?: string;
  initialBuyInCents?: number;
  initialVenue?: Venue;
  initialGameType?: TableType;
  bankrollCents?: number;
  onCancel: () => void;
  onConfirm: (input: {
    stakesLabel: string;
    buyInCents: number;
    venue: Venue;
    gameType: TableType;
    preSession: PreSessionChecklist;
  }) => void;
};

function dollars(cents: number): string {
  return `$${Math.max(0, Math.round(cents / 100)).toLocaleString('en-US')}`;
}

function optionIndex(options: StakeOption[], label: string): number {
  const index = options.findIndex((option) => option.label === label);
  return index >= 0 ? index : Math.min(2, options.length - 1);
}

function wrapIndex(index: number, length: number): number {
  return (index + length) % length;
}

export function StartSessionModal({
  visible,
  initialChecklist,
  initialStakes = 'NL50',
  initialBuyInCents = 5_000,
  initialVenue = 'online',
  initialGameType = 'cash',
  bankrollCents = 0,
  onCancel,
  onConfirm,
}: StartSessionModalProps) {
  const [venue, setVenue] = useState<Venue>('online');
  const [tableType, setTableType] = useState<TableType>('cash');
  const [stakeIndex, setStakeIndex] = useState(1);
  const [buyInBb, setBuyInBb] = useState(100);
  const [buyInPreset, setBuyInPreset] = useState<BuyInPreset>(100);
  const [customBuyIn, setCustomBuyIn] = useState('');

  const options = tableType === 'cash' ? CASH_STAKES : TOURNAMENT_STAKES;
  const selectedStake = options[stakeIndex] ?? options[0];
  const units = tableType === 'cash' ? buyInBb : buyInBb;
  const calculatedBuyIn = selectedStake.unitCents * units;
  const customCents = Math.round(Number(customBuyIn.replace(',', '.')) * 100);
  const buyInCents = buyInPreset === 'custom' && Number.isFinite(customCents) && customCents > 0
    ? customCents
    : calculatedBuyIn;

  const previousStake = options[wrapIndex(stakeIndex - 1, options.length)];
  const nextStake = options[wrapIndex(stakeIndex + 1, options.length)];
  const bankrollAfter = Math.max(0, bankrollCents - buyInCents);
  const cashRecommendation = `${dollars(selectedStake.unitCents * 200)}-${dollars(selectedStake.unitCents * 400)}`;

  useEffect(() => {
    if (!visible) return;
    const type = initialGameType;
    const initialOptions = type === 'cash' ? CASH_STAKES : TOURNAMENT_STAKES;
    const initialOption = initialOptions[optionIndex(initialOptions, initialStakes)];
    const initialUnits = Math.max(1, Math.round(initialBuyInCents / initialOption.unitCents));
    const matchingPreset = ([100, 200, 350] as const).find((value) => value === initialUnits);

    setVenue(initialVenue);
    setTableType(type);
    setStakeIndex(optionIndex(initialOptions, initialStakes));
    setBuyInBb(initialUnits);
    setBuyInPreset(matchingPreset ?? 'custom');
    setCustomBuyIn(matchingPreset ? '' : String(initialBuyInCents / 100));
  }, [visible, initialBuyInCents, initialGameType, initialStakes, initialVenue]);

  const setType = (type: TableType) => {
    const nextOptions = type === 'cash' ? CASH_STAKES : TOURNAMENT_STAKES;
    const defaultIndex = Math.min(2, nextOptions.length - 1);
    setTableType(type);
    setStakeIndex(defaultIndex);
    setBuyInBb(type === 'cash' ? 200 : 1);
    setBuyInPreset(type === 'cash' ? 200 : 100);
    setCustomBuyIn('');
  };

  const selectPreset = (preset: BuyInPreset) => {
    setBuyInPreset(preset);
    if (preset !== 'custom') {
      setBuyInBb(preset);
      setCustomBuyIn('');
    } else {
      setCustomBuyIn(String(Math.round(calculatedBuyIn / 100)));
    }
  };

  const adjustBuyIn = (direction: -1 | 1) => {
    if (buyInPreset === 'custom') {
      const current = Number(customBuyIn.replace(',', '.')) || 0;
      setCustomBuyIn(String(Math.max(1, current + direction * (tableType === 'cash' ? 25 : selectedStake.unitCents / 100))));
      return;
    }
    const step = tableType === 'cash' ? 25 : 1;
    const next = Math.max(1, buyInBb + direction * step);
    const matchingPreset = tableType === 'cash'
      ? ([100, 200, 350] as const).find((value) => value === next)
      : next === 1
        ? 100
        : next === 2
          ? 200
          : next === 3
            ? 350
            : undefined;
    setBuyInBb(next);
    setBuyInPreset(matchingPreset ?? 'custom');
    if (!matchingPreset) setCustomBuyIn(String(Math.round((selectedStake.unitCents * next) / 100)));
  };

  const submit = () => {
    if (!Number.isFinite(buyInCents) || buyInCents <= 0) return;
    onConfirm({
      stakesLabel: selectedStake.label,
      buyInCents,
      venue,
      gameType: tableType,
      preSession: {
        hydration: initialChecklist?.hydration ?? false,
        warmup: initialChecklist?.warmup ?? false,
        focusLevel: initialChecklist?.focusLevel ?? 5,
      },
    });
  };

  const setupLabel = useMemo(
    () => `${venue === 'live' ? 'Live' : 'Online'} ${tableType === 'cash' ? 'Cash' : 'Tournament'} · ${selectedStake.label} · ${dollars(buyInCents)}`,
    [buyInCents, selectedStake.label, tableType, venue],
  );

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
              accessibilityLabel="Close session setup"
              style={styles.navButton}
            >
              <Ionicons name="chevron-back" size={27} color={dash.text} />
            </Pressable>
            <Text style={styles.navTitle}>Choose your table</Text>
            <Pressable onPress={submit} style={styles.doneButton}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.modeStack}>
            <SegmentedControl
              items={[
                { label: 'Live', value: 'live', icon: 'ellipse' },
                { label: 'Online', value: 'online' },
              ]}
              value={venue}
              onChange={(value) => setVenue(value as Venue)}
            />
            <SegmentedControl
              items={[
                { label: 'Cash', value: 'cash' },
                { label: 'Tournament', value: 'mtt' },
              ]}
              value={tableType}
              onChange={(value) => setType(value as TableType)}
            />
          </View>

          <View style={styles.stakePicker}>
            <Pressable
              onPress={() => setStakeIndex((current) => wrapIndex(current - 1, options.length))}
              accessibilityRole="button"
              accessibilityLabel={`Previous stake, ${previousStake.label}`}
              style={styles.stakeStep}
            >
              <Ionicons name="chevron-up" size={24} color={dash.textMuted} />
            </Pressable>
            <View style={styles.selectorGlow} pointerEvents="none" />
            <View style={styles.selectorOuter}>
              <View style={styles.selectorInner}>
                <Text style={styles.neighborStake}>{previousStake.label}</Text>
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.currentStake}>{selectedStake.label}</Text>
                <Text style={styles.stakeDetail}>{selectedStake.detail}</Text>
                <Text style={styles.neighborStake}>{nextStake.label}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setStakeIndex((current) => wrapIndex(current + 1, options.length))}
              accessibilityRole="button"
              accessibilityLabel={`Next stake, ${nextStake.label}`}
              style={styles.stakeStep}
            >
              <Ionicons name="chevron-down" size={24} color={dash.textMuted} />
            </Pressable>
          </View>

          <View style={styles.buyInSection}>
            <Text style={styles.sectionLabel}>{tableType === 'cash' ? 'BUY-IN' : 'ENTRY TOTAL'}</Text>
            <View style={styles.amountRow}>
              <Pressable onPress={() => adjustBuyIn(-1)} style={styles.amountButton} accessibilityLabel="Decrease buy-in">
                <Ionicons name="remove" size={25} color={dash.opsSoft} />
              </Pressable>
              {buyInPreset === 'custom' ? (
                <TextInput
                  autoFocus={false}
                  value={customBuyIn}
                  onChangeText={setCustomBuyIn}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  style={styles.amountInput}
                />
              ) : (
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.amountText}>{dollars(buyInCents)}</Text>
              )}
              <Pressable onPress={() => adjustBuyIn(1)} style={styles.amountButton} accessibilityLabel="Increase buy-in">
                <Ionicons name="add" size={25} color={dash.opsSoft} />
              </Pressable>
            </View>

            <View style={styles.buyInPresets}>
              {tableType === 'cash' ? (
                <>
                  <BuyInOption label="100 BB" selected={buyInPreset === 100} onPress={() => selectPreset(100)} />
                  <BuyInOption label="200 BB" selected={buyInPreset === 200} onPress={() => selectPreset(200)} />
                  <BuyInOption label="350 BB" selected={buyInPreset === 350} onPress={() => selectPreset(350)} />
                </>
              ) : (
                <>
                  <BuyInOption label="1 entry" selected={buyInBb === 1 && buyInPreset !== 'custom'} onPress={() => { setBuyInBb(1); setBuyInPreset(100); setCustomBuyIn(''); }} />
                  <BuyInOption label="2 entries" selected={buyInBb === 2 && buyInPreset !== 'custom'} onPress={() => { setBuyInBb(2); setBuyInPreset(200); setCustomBuyIn(''); }} />
                  <BuyInOption label="3 entries" selected={buyInBb === 3 && buyInPreset !== 'custom'} onPress={() => { setBuyInBb(3); setBuyInPreset(350); setCustomBuyIn(''); }} />
                </>
              )}
              <BuyInOption label="Custom" selected={buyInPreset === 'custom'} onPress={() => selectPreset('custom')} />
            </View>

            <View style={styles.infoRows}>
              <InfoRow
                icon="information-circle-outline"
                text={tableType === 'cash' ? `Recommended range · ${cashRecommendation}` : `Tournament entry · ${selectedStake.detail}`}
              />
              <InfoRow icon="wallet-outline" text={`Bankroll after buy-in · ${dollars(bankrollAfter)}`} />
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable onPress={submit} style={({ pressed }) => [pressed && styles.pressed]}>
              <LinearGradient
                colors={[dash.opsDeep, dash.ops]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmText}>Use this setup</Text>
                <Ionicons name="arrow-forward" size={25} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
            <Text numberOfLines={1} style={styles.setupSummary}>{setupLabel}</Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SegmentedControl({
  items,
  value,
  onChange,
}: {
  items: Array<{ label: string; value: string; icon?: keyof typeof Ionicons.glyphMap }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{item.label}</Text>
            {selected && item.icon ? <Ionicons name={item.icon} size={10} color={dash.profit} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function BuyInOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.buyInOption, selected && styles.buyInOptionSelected]}>
      <Text style={[styles.buyInOptionText, selected && styles.buyInOptionTextSelected]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={dash.textMuted} />
      <Text numberOfLines={1} style={styles.infoText}>{text}</Text>
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
  modeStack: { gap: 8, marginTop: 12 },
  segmented: { flexDirection: 'row', height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(143,196,255,0.32)', padding: 2, backgroundColor: 'rgba(7,12,24,0.72)' },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 18 },
  segmentSelected: { borderWidth: 1, borderColor: 'rgba(77,163,255,0.8)', backgroundColor: 'rgba(22,78,164,0.32)' },
  segmentText: { color: dash.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 16 },
  segmentTextSelected: { color: dash.text, fontFamily: fonts.bodyBold },
  stakePicker: { height: 252, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  stakeStep: { height: 28, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  selectorGlow: { position: 'absolute', width: 226, height: 226, borderRadius: 113, borderWidth: 1, borderColor: 'rgba(77,163,255,0.12)' },
  selectorOuter: { width: 198, height: 198, borderRadius: 99, borderWidth: 2, borderColor: dash.ops, padding: 8, shadowColor: dash.ops, shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  selectorInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 90, borderWidth: 1, borderColor: 'rgba(143,196,255,0.32)', backgroundColor: 'rgba(6,12,27,0.88)' },
  neighborStake: { color: 'rgba(255,255,255,0.27)', fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 22 },
  currentStake: { maxWidth: '84%', color: dash.text, fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 45 },
  stakeDetail: { color: dash.opsSoft, fontFamily: fonts.bodyMedium, fontSize: 13 },
  buyInSection: { gap: 7, marginTop: 2 },
  sectionLabel: { color: dash.textSecondary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2 },
  amountRow: { height: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  amountButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(143,196,255,0.42)', backgroundColor: 'rgba(18,31,55,0.72)' },
  amountText: { flex: 1, color: dash.text, fontFamily: fonts.displayBold, fontSize: 47, lineHeight: 56, textAlign: 'center' },
  amountInput: { flex: 1, color: dash.text, fontFamily: fonts.displayBold, fontSize: 43, lineHeight: 50, textAlign: 'center', padding: 0 },
  buyInPresets: { flexDirection: 'row', overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(18,26,45,0.88)' },
  buyInOption: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.09)' },
  buyInOptionSelected: { borderWidth: 1, borderRadius: 18, borderColor: dash.ops, backgroundColor: 'rgba(26,92,191,0.32)' },
  buyInOptionText: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 11 },
  buyInOptionTextSelected: { color: dash.text, fontFamily: fonts.bodyBold },
  infoRows: { gap: 5, marginTop: 5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  infoText: { flex: 1, color: dash.textMuted, fontFamily: fonts.body, fontSize: 12 },
  footer: { marginTop: 'auto', gap: 9 },
  confirmButton: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(143,196,255,0.7)' },
  confirmText: { color: '#FFFFFF', fontFamily: fonts.bodyBold, fontSize: 18 },
  setupSummary: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: 'center' },
  pressed: { opacity: 0.84 },
});
