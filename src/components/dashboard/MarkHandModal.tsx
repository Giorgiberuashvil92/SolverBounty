import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

const STREETS = ['Preflop', 'Flop', 'Turn', 'River'] as const;

type MarkHandModalProps = {
  visible: boolean;
  stakesLabel?: string;
  saving?: boolean;
  onCancel: () => void;
  onSave: (input: { note: string; street: string }) => void;
};

export function MarkHandModal({ visible, stakesLabel, saving, onCancel, onSave }: MarkHandModalProps) {
  const [street, setStreet] = useState<(typeof STREETS)[number]>('Preflop');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setStreet('Preflop');
    setNote('');
  }, [visible]);

  const save = () => {
    const trimmed = note.trim();
    if (!trimmed || saving) return;
    onSave({ note: trimmed, street: street.toLowerCase() });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={styles.icon}><Ionicons name="bookmark-outline" size={18} color={dash.cta} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>MARK HAND{stakesLabel ? ` · ${stakesLabel}` : ''}</Text>
              <Text style={styles.title}>What made this hand worth a look?</Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={10}><Ionicons name="close" size={21} color={dash.textSecondary} /></Pressable>
          </View>
          <View style={styles.streetRow}>
            {STREETS.map((item) => <Pressable key={item} onPress={() => setStreet(item)} style={[styles.street, street === item && styles.streetOn]}><Text style={[styles.streetText, street === item && styles.streetTextOn]}>{item}</Text></Pressable>)}
          </View>
          <TextInput
            autoFocus
            value={note}
            onChangeText={setNote}
            placeholder="e.g. River call felt too thin"
            placeholderTextColor={dash.textMuted}
            returnKeyType="done"
            onSubmitEditing={save}
            maxLength={180}
            style={styles.input}
          />
          <Pressable disabled={!note.trim() || saving} onPress={save} style={[styles.save, (!note.trim() || saving) && styles.disabled]}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Save mark'}</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.58)' },
  sheet: { backgroundColor: '#151C31', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, borderColor: dash.borderStrong, padding: 18, paddingBottom: 28, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,230,106,0.12)' },
  kicker: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2 }, title: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 16, marginTop: 2 },
  streetRow: { flexDirection: 'row', gap: 7 }, street: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', backgroundColor: 'rgba(255,255,255,0.045)' }, streetOn: { borderColor: 'rgba(77,163,255,0.5)', backgroundColor: dash.opsDim }, streetText: { color: dash.textMuted, fontFamily: fonts.bodyBold, fontSize: 11 }, streetTextOn: { color: dash.opsSoft },
  input: { borderRadius: 11, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(5,8,18,0.42)', color: dash.text, paddingHorizontal: 12, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14 },
  save: { alignItems: 'center', borderRadius: 12, paddingVertical: 13, backgroundColor: dash.cta }, disabled: { opacity: 0.48 }, saveText: { color: dash.ctaText, fontFamily: fonts.bodyBold, fontSize: 14 },
});
