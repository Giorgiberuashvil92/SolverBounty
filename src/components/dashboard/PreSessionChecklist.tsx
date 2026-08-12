import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import type { PreSessionChecklist as Checklist } from '../../types/session';

type PreSessionChecklistProps = {
  value: Checklist;
  onChange: (next: Checklist) => void;
};

export function PreSessionChecklist({ value, onChange }: PreSessionChecklistProps) {
  const ready = value.hydration && value.warmup && value.focusLevel >= 7;

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>PRE-SESSION</Text>
          <Text style={styles.title}>Warm the engine</Text>
        </View>
        <Text style={[styles.ready, ready && styles.readyOn]}>
          {ready ? 'Ready' : 'Not ready'}
        </Text>
      </View>

      <ToggleRow
        label="Hydration"
        hint="Water before volume"
        active={value.hydration}
        onPress={() => onChange({ ...value, hydration: !value.hydration })}
      />
      <ToggleRow
        label="Warm-up"
        hint="Ranges / focus block"
        active={value.warmup}
        onPress={() => onChange({ ...value, warmup: !value.warmup })}
      />

      <Text style={styles.focusLabel}>Focus · {value.focusLevel}/10</Text>
      <View style={styles.focusRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = n <= value.focusLevel;
          return (
            <Pressable
              key={n}
              onPress={() => onChange({ ...value, focusLevel: n })}
              style={[styles.pip, active && styles.pipOn]}
            />
          );
        })}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  active,
  onPress,
}: {
  label: string;
  hint: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.toggleRow}>
      <View>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHint}>{hint}</Text>
      </View>
      <View style={[styles.check, active && styles.checkOn]}>
        <Text style={[styles.checkMark, active && styles.checkMarkOn]}>{active ? '✓' : ''}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    backgroundColor: dash.surface,
    borderWidth: 1,
    borderColor: dash.border,
    padding: 18,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  label: {
    color: dash.opsSoft,
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
  ready: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 4,
  },
  readyOn: {
    color: dash.profit,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(77,163,255,0.1)',
  },
  toggleLabel: {
    color: dash.text,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  toggleHint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: dash.borderStrong,
    backgroundColor: dash.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    borderColor: dash.ops,
    backgroundColor: dash.opsDim,
  },
  checkMark: {
    color: 'transparent',
    fontSize: 14,
    fontWeight: '700',
  },
  checkMarkOn: {
    color: dash.opsSoft,
  },
  focusLabel: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: 4,
  },
  focusRow: {
    flexDirection: 'row',
    gap: 5,
  },
  pip: {
    flex: 1,
    height: 10,
    borderRadius: 4,
    backgroundColor: dash.surfaceRaised,
    borderWidth: 1,
    borderColor: dash.border,
  },
  pipOn: {
    backgroundColor: dash.ops,
    borderColor: dash.ops,
  },
});
