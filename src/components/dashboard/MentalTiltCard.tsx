import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

type MentalTiltCardProps = {
  tiltScore: number;
  energyLevel: number;
  onTiltChange: (n: number) => void;
  onEnergyChange: (n: number) => void;
  onCompleteReview?: () => void;
};

export function MentalTiltCard({
  tiltScore,
  energyLevel,
  onTiltChange,
  onEnergyChange,
  onCompleteReview,
}: MentalTiltCardProps) {
  const tiltHot = tiltScore >= 7;

  return (
    <View style={styles.shell}>
      <Text style={styles.label}>MENTAL / TILT</Text>
      <Text style={styles.title}>Close the loop</Text>

      <Scale label="Tilt" value={tiltScore} onChange={onTiltChange} hot={tiltHot} />
      <Scale label="Energy" value={energyLevel} onChange={onEnergyChange} />

      {tiltHot ? (
        <Text style={styles.warn}>
          High tilt signal — consider ending or switching to study mode.
        </Text>
      ) : (
        <Text style={styles.ok}>Mind looks steady. Save the review when you’re done.</Text>
      )}

      <Pressable
        onPress={onCompleteReview}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Text style={styles.btnText}>Save mental review</Text>
      </Pressable>
    </View>
  );
}

function Scale({
  label,
  value,
  onChange,
  hot,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hot?: boolean;
}) {
  return (
    <View style={styles.scaleBlock}>
      <View style={styles.scaleHeader}>
        <Text style={styles.scaleLabel}>{label}</Text>
        <Text style={[styles.scaleValue, hot && { color: dash.loss }]}>{value}/10</Text>
      </View>
      <View style={styles.pips}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.pip, n <= value && (hot ? styles.pipHot : styles.pipOn)]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    backgroundColor: dash.surface,
    borderWidth: 1,
    borderColor: dash.border,
    padding: 18,
    gap: 12,
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
    marginTop: -4,
  },
  scaleBlock: {
    gap: 6,
  },
  scaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  scaleValue: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  pips: {
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
  pipHot: {
    backgroundColor: dash.loss,
    borderColor: dash.loss,
  },
  warn: {
    color: dash.loss,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  ok: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  btn: {
    marginTop: 2,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: dash.opsDim,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  btnText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.88,
  },
});
