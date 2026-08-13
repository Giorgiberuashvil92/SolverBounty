import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

type CoachMode = 'plan' | 'live' | 'review';

const COPY: Record<CoachMode, { title: string; body: string }> = {
  plan: {
    title: 'Ask Coach',
    body: 'Review a spot before you play',
  },
  live: {
    title: 'Ask Coach',
    body: 'Get a quick second opinion on a live spot',
  },
  review: {
    title: 'Ask Coach',
    body: 'Turn a hand from your queue into a lesson',
  },
};

type AICoachPanelProps = {
  mode?: CoachMode;
  onOpenChat?: () => void;
};

export function AICoachPanel({ mode = 'plan', onOpenChat }: AICoachPanelProps) {
  const copy = COPY[mode];
  return (
    <Pressable
      onPress={onOpenChat}
      style={({ pressed }) => [styles.shell, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="sparkles-outline" size={22} color={dash.brandSoft} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>AI COACH</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={dash.brandSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(155,107,255,0.33)',
    backgroundColor: 'rgba(49,31,100,0.82)',
    padding: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(196,164,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(196,164,255,0.3)',
  },
  copy: { flex: 1, gap: 1 },
  eyebrow: { color: dash.brandSoft, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.3 },
  title: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 15 },
  body: { color: 'rgba(255,255,255,0.63)', fontFamily: fonts.body, fontSize: 12 },
  pressed: { opacity: 0.86 },
});
