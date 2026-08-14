import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

export function NeedsDetailsModal({ visible, onClose, onFill }: { visible: boolean; onClose: () => void; onFill: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.icon}><Ionicons name="document-text-outline" size={22} color={dash.warning} /></View>
        <Text style={styles.kicker}>NEEDS DETAILS</Text>
        <Text style={styles.title}>This hand is only a quick mark.</Text>
        <Text style={styles.body}>Add positions, cards, board, and the action line before Coach reviews it.</Text>
        <Pressable onPress={onFill} style={styles.primary}><Text style={styles.primaryText}>Fill details</Text></Pressable>
        <Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>Later</Text></Pressable>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: 'rgba(0,0,0,0.63)' }, card: { borderRadius: 18, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: '#151C31', padding: 20, alignItems: 'center', gap: 10 }, icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,176,32,0.12)' }, kicker: { color: dash.warning, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4 }, title: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 20, textAlign: 'center' }, body: { color: dash.textSecondary, fontFamily: fonts.body, fontSize: 13, textAlign: 'center', lineHeight: 19 }, primary: { width: '100%', alignItems: 'center', backgroundColor: dash.ops, borderRadius: 11, paddingVertical: 13, marginTop: 4 }, primaryText: { color: '#071426', fontFamily: fonts.bodyBold, fontSize: 14 }, secondary: { paddingVertical: 7 }, secondaryText: { color: dash.textSecondary, fontFamily: fonts.bodyBold, fontSize: 13 } });
