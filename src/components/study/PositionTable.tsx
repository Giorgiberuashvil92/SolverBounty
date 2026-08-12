import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

export const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
export type Position = (typeof POSITIONS)[number];

type PositionTableProps = {
  selected: Position;
  onSelect: (position: Position) => void;
};

export function PositionTable({ selected, onSelect }: PositionTableProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {POSITIONS.map((pos) => {
          const active = selected === pos;
          return (
            <Pressable
              key={pos}
              onPress={() => onSelect(pos)}
              style={({ pressed }) => [
                styles.seat,
                active && styles.seatActive,
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={[styles.seatText, active && styles.seatTextActive]}>{pos}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  track: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(10,14,26,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  seat: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatActive: {
    borderColor: dash.opsSoft,
    backgroundColor: 'rgba(77,163,255,0.24)',
    shadowColor: dash.ops,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  seatText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  seatTextActive: {
    color: dash.opsSoft,
  },
});
