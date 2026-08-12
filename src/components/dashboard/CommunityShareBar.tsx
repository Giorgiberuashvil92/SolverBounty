import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

type CommunityShareBarProps = {
  streakDays: number;
  onShareGroup?: () => void;
  onShareDiscord?: () => void;
  onShareTelegram?: () => void;
};

export function CommunityShareBar({
  streakDays,
  onShareGroup,
  onShareDiscord,
  onShareTelegram,
}: CommunityShareBarProps) {
  return (
    <LinearGradient
      colors={['rgba(168,85,247,0.18)', 'rgba(13,21,36,0.92)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.shell}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>CIRCLE</Text>
          <Text style={styles.title}>Send it to the table</Text>
        </View>
        <Text style={styles.streak}>{streakDays}d streak</Text>
      </View>

      <View style={styles.row}>
        <Chip label="Study group" onPress={onShareGroup} />
        <Chip label="Discord" onPress={onShareDiscord} />
        <Chip label="Telegram" onPress={onShareTelegram} />
      </View>
    </LinearGradient>
  );
}

function Chip({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.28)',
    padding: 18,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.8,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.display,
    fontSize: 18,
    marginTop: 2,
  },
  streak: {
    color: dash.lilac,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.28)',
    backgroundColor: 'rgba(8,4,18,0.45)',
  },
  chipText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.85,
    borderColor: dash.brand,
  },
});
