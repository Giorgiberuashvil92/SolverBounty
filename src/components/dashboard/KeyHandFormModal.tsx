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

const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;

type KeyHandFormModalProps = {
  visible: boolean;
  stakesLabel?: string;
  onCancel: () => void;
  onConfirm: (input: {
    heroPosition: string;
    holeCards: string[];
    board: string[];
    resultBb: number;
    tags: string[];
    aiSummary: string;
  }) => void;
};

function parseCards(raw: string): string[] {
  return raw
    .trim()
    .split(/[\s,]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export function KeyHandFormModal({
  visible,
  stakesLabel,
  onCancel,
  onConfirm,
}: KeyHandFormModalProps) {
  const [position, setPosition] = useState<string>('BTN');
  const [holes, setHoles] = useState('As Ks');
  const [board, setBoard] = useState('');
  const [resultBb, setResultBb] = useState('0');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPosition('BTN');
    setHoles('As Ks');
    setBoard('');
    setResultBb('0');
    setNote('');
  }, [visible]);

  const submit = () => {
    const holeCards = parseCards(holes);
    if (holeCards.length < 2) return;
    const bb = Number(resultBb.replace(',', '.'));
    onConfirm({
      heroPosition: position,
      holeCards,
      board: parseCards(board),
      resultBb: Number.isFinite(bb) ? bb : 0,
      tags: ['study'],
      aiSummary: note.trim() || 'Logged from Daily.',
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
          <Text style={styles.title}>Log key hand</Text>
          <Text style={styles.sub}>
            {stakesLabel ? `${stakesLabel} · ` : ''}Cards like As Ks · board Kh 7s 2d
          </Text>

          <Text style={styles.label}>Position</Text>
          <View style={styles.chips}>
            {POSITIONS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPosition(p)}
                style={[styles.chip, position === p && styles.chipActive]}
              >
                <Text style={[styles.chipText, position === p && styles.chipTextActive]}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Hole cards</Text>
          <TextInput
            value={holes}
            onChangeText={setHoles}
            autoCapitalize="characters"
            placeholder="As Ks"
            placeholderTextColor={dash.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Board (optional)</Text>
          <TextInput
            value={board}
            onChangeText={setBoard}
            autoCapitalize="characters"
            placeholder="Kh 7s 2d"
            placeholderTextColor={dash.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Result (bb)</Text>
          <TextInput
            value={resultBb}
            onChangeText={setResultBb}
            keyboardType="numbers-and-punctuation"
            placeholder="12"
            placeholderTextColor={dash.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What matters about this hand?"
            placeholderTextColor={dash.textMuted}
            style={[styles.input, styles.note]}
            multiline
          />

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={submit} style={styles.confirmBtn}>
              <Text style={styles.confirmText}>Save hand</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    gap: 8,
    maxHeight: '92%',
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
    marginTop: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
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
    fontSize: 12,
  },
  chipTextActive: {
    color: dash.opsSoft,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  note: {
    minHeight: 64,
    textAlignVertical: 'top',
    fontFamily: fonts.body,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
  },
  confirmBtn: {
    flex: 1.2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: dash.ops,
  },
  confirmText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
  },
});
