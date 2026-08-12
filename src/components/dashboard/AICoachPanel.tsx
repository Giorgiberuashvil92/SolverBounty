import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

type AICoachPanelProps = {
  onVoiceLog?: () => void;
  onOpenChat?: () => void;
};

export function AICoachPanel({ onVoiceLog, onOpenChat }: AICoachPanelProps) {
  return (
    <Pressable onPress={onOpenChat} style={styles.shell}>
      <LinearGradient
        colors={['rgba(155,107,255,0.22)', 'rgba(26,34,56,0.95)', 'rgba(20,26,44,0.98)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.grad}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.eyebrow}>AI COACH</Text>
          <Text style={styles.title}>Ask the spot. Log by voice.</Text>
          <Text style={styles.body}>“Why fold here?” · “Is 33% pot fine?”</Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={onVoiceLog}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Voice</Text>
          </Pressable>
          <Pressable
            onPress={onOpenChat}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Chat</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  grad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  eyebrow: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  body: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  actions: {
    gap: 8,
  },
  primary: {
    backgroundColor: dash.cta,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  primaryText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  secondary: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  secondaryText: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.88,
  },
});
