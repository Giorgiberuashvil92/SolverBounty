import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import type { PlayerProfile } from '../../auth/session';

type FocusPlan = {
  title: string;
  body: string;
  action: string;
  destination: 'drills' | 'reviews' | 'coach';
};

function focusPlan(
  goal: PlayerProfile['goal'],
  stakesLabel: string,
): FocusPlan {
  const plans: Record<NonNullable<PlayerProfile['goal']>, FocusPlan> = {
  track: {
    title: 'Log one key hand',
    body: 'Capture the decision that shaped your session.',
    action: 'Review calendar',
    destination: 'reviews',
  },
  improve: {
    title: 'River bluff-catching',
    body: 'Warm up with 5 call-or-fold spots before you play.',
    action: '5-hand drill',
    destination: 'drills',
  },
  coach: {
    title: 'Pre-session check-in',
    body: 'Bring one spot you want to play better today.',
    action: 'Ask Coach',
    destination: 'coach',
  },
  move_up: {
    title: 'Protect your A-game',
    body: `Stay disciplined at ${stakesLabel} with a 3-minute warm-up.`,
    action: '3-min warm-up',
    destination: 'drills',
  },
  };
  return goal ? plans[goal] : {
    title: 'River bluff-catching',
    body: 'Warm up with 5 call-or-fold spots before you play.',
    action: '5-hand drill',
    destination: 'drills',
  };
}

type DailyFocusCardProps = {
  goal?: PlayerProfile['goal'];
  stakesLabel: string;
  onOpenReviews?: () => void;
  onOpenDrills?: () => void;
  onOpenCoach?: () => void;
};

export function DailyFocusCard({
  goal,
  stakesLabel,
  onOpenReviews,
  onOpenDrills,
  onOpenCoach,
}: DailyFocusCardProps) {
  const plan = focusPlan(goal, stakesLabel);
  const openPlan =
    plan.destination === 'reviews'
      ? onOpenReviews
      : plan.destination === 'coach'
        ? onOpenCoach
        : onOpenDrills;

  return (
    <View style={styles.shell}>
      <View style={styles.copy}>
        <Text style={styles.label}>TODAY'S FOCUS</Text>
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.body}>{plan.body}</Text>
      </View>
      {openPlan ? (
        <Pressable
          onPress={openPlan}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>{plan.action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 116,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dash.border,
    backgroundColor: dash.surface,
    padding: 14,
    gap: 10,
  },
  copy: { flex: 1, gap: 3 },
  label: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 20,
  },
  body: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: dash.ops,
    backgroundColor: 'rgba(77,163,255,0.08)',
  },
  actionText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  pressed: { opacity: 0.86 },
});
