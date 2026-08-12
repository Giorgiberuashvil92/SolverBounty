import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

type BankrollSetupCardProps = {
  onSetup: () => void;
};

export function BankrollSetupCard({ onSetup }: BankrollSetupCardProps) {
  return (
    <LinearGradient
      colors={['rgba(46,230,106,0.12)', dash.surfaceRaised, dash.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.shell}
    >
      <Text style={styles.label}>BANKROLL</Text>
      <Text style={styles.title}>Set your bankroll</Text>
      <Text style={styles.body}>
        Enter your current roll to start tracking sessions, P/L, and deposits.
      </Text>
      <Pressable
        onPress={onSetup}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Text style={styles.btnText}>Enter bankroll</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    gap: 8,
  },
  label: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  body: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: dash.cta,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  btnText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
});
