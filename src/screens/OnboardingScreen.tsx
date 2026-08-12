import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import type { PlayerProfile } from '../auth/session';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';

type StepKey =
  | 'primaryGame'
  | 'venueFocus'
  | 'stakesBand'
  | 'experience'
  | 'goal';

const STEPS: Array<{
  key: StepKey;
  title: string;
  subtitle: string;
  options: Array<{ value: NonNullable<PlayerProfile[StepKey]>; label: string; hint: string }>;
}> = [
  {
    key: 'primaryGame',
    title: 'What do you grind most?',
    subtitle: 'We’ll tune Daily & coaching around this.',
    options: [
      { value: 'cash', label: 'Cash games', hint: 'NL / PLO rings' },
      { value: 'mtt', label: 'Tournaments', hint: 'MTT / satellites' },
      { value: 'mixed', label: 'Mixed', hint: 'Both cash & tournaments' },
    ],
  },
  {
    key: 'venueFocus',
    title: 'Where do you play?',
    subtitle: 'Live rooms feel different from online grind.',
    options: [
      { value: 'online', label: 'Online', hint: 'GG, Coin, PokerStars…' },
      { value: 'live', label: 'Live', hint: 'Casino / home games' },
      { value: 'both', label: 'Both', hint: 'Hybrid schedule' },
    ],
  },
  {
    key: 'stakesBand',
    title: 'Current stakes band?',
    subtitle: 'No judgment — helps bankroll & spot difficulty.',
    options: [
      { value: 'micro', label: 'Micro', hint: 'NL2–NL25 / micros' },
      { value: 'low', label: 'Low', hint: 'NL50–NL200' },
      { value: 'mid', label: 'Mid', hint: 'NL500+' },
      { value: 'high', label: 'High', hint: 'Nosebleeds / high MTT' },
    ],
  },
  {
    key: 'experience',
    title: 'How serious are you?',
    subtitle: 'Sets coach tone and review depth.',
    options: [
      { value: 'recreational', label: 'Recreational', hint: 'Fun + improvement' },
      { value: 'serious', label: 'Serious grinder', hint: 'Volume + study' },
      { value: 'pro', label: 'Pro / aspiring pro', hint: 'Edge hunting' },
    ],
  },
  {
    key: 'goal',
    title: 'Main goal right now?',
    subtitle: 'This becomes your home-screen priority.',
    options: [
      { value: 'track', label: 'Track results', hint: 'Bankroll clarity' },
      { value: 'improve', label: 'Fix leaks', hint: 'Key-hand reviews' },
      { value: 'coach', label: 'AI coach daily', hint: 'Second-look spots' },
      { value: 'move_up', label: 'Move up stakes', hint: 'Roll + winrate' },
    ],
  },
];

type OnboardingScreenProps = {
  onFinished?: () => void;
};

export function OnboardingScreen({ onFinished }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { user, completeOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<PlayerProfile>>(
    () => user?.profile ?? {},
  );
  const [partnerInsights, setPartnerInsights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = STEPS[step];
  const selected = answers[current.key];
  const isLast = step === STEPS.length - 1;
  const progress = useMemo(() => (step + 1) / STEPS.length, [step]);
  const canContinue = Boolean(selected);

  const onContinue = async () => {
    if (!selected) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await completeOnboarding({
        primaryGame: answers.primaryGame as NonNullable<PlayerProfile['primaryGame']>,
        venueFocus: answers.venueFocus as NonNullable<PlayerProfile['venueFocus']>,
        stakesBand: answers.stakesBand as NonNullable<PlayerProfile['stakesBand']>,
        experience: answers.experience as NonNullable<PlayerProfile['experience']>,
        goal: answers.goal as NonNullable<PlayerProfile['goal']>,
        partnerInsightsConsent: partnerInsights,
      });
      onFinished?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#151A32', '#0B1020', '#080C18']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <Text style={styles.kicker}>SETUP {step + 1}/{STEPS.length}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.sub}>{current.subtitle}</Text>

        {current.options.map((opt) => {
          const on = selected === opt.value;
          return (
            <Pressable
              key={opt.value}
              disabled={busy}
              onPress={() => setAnswers((prev) => ({ ...prev, [current.key]: opt.value }))}
              style={({ pressed }) => [
                styles.card,
                on && styles.cardOn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.cardTitle, on && styles.cardTitleOn]}>{opt.label}</Text>
              <Text style={styles.cardHint}>{opt.hint}</Text>
            </Pressable>
          );
        })}

        {isLast ? (
          <Pressable
            onPress={() => setPartnerInsights((v) => !v)}
            style={styles.consentRow}
          >
            <View style={[styles.box, partnerInsights && styles.boxOn]} />
            <Text style={styles.consentText}>
              Allow anonymized insights for partner offers (GG/Coin-style ads later).
              No raw hands or email without consent.
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          disabled={!canContinue || busy}
          onPress={() => void onContinue()}
          style={({ pressed }) => [
            styles.cta,
            (!canContinue || busy) && styles.ctaDisabled,
            pressed && canContinue && !busy && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={dash.ctaText} />
          ) : (
            <Text style={styles.ctaText}>{isLast ? 'Finish setup' : 'Continue'}</Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step > 0 ? (
          <Pressable
            disabled={busy}
            onPress={() => setStep((s) => s - 1)}
            style={styles.back}
          >
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dash.bg },
  content: { paddingHorizontal: 20, gap: 10 },
  kicker: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
  },
  barTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    backgroundColor: dash.ops,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    letterSpacing: -0.5,
  },
  sub: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    gap: 4,
  },
  cardOn: {
    borderColor: dash.ops,
    backgroundColor: dash.opsDim,
  },
  pressed: { opacity: 0.88 },
  cardTitle: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  cardTitleOn: {
    color: dash.opsSoft,
  },
  cardHint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  consentRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginTop: 2,
  },
  boxOn: { backgroundColor: dash.ops, borderColor: dash.ops },
  consentText: {
    flex: 1,
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  cta: {
    marginTop: 10,
    backgroundColor: dash.cta,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  error: { color: dash.loss, fontFamily: fonts.body, marginTop: 8 },
  back: { alignSelf: 'center', marginTop: 4, padding: 8 },
  backText: { color: dash.textSecondary, fontFamily: fonts.bodyBold },
});
