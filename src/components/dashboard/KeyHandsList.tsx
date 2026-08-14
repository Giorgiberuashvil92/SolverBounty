import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MiniCards } from '../community/MiniCards';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import type { KeyHand } from '../../types/session';

type KeyHandsListProps = {
  hands: KeyHand[];
  onAdd?: () => void;
  onOpen?: (hand: KeyHand) => void;
  onShare?: (hand: KeyHand) => void;
};

export function KeyHandsList({ hands, onAdd, onOpen, onShare }: KeyHandsListProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>KEY HANDS</Text>
          <Text style={styles.title}>Spots worth a second look</Text>
        </View>
        <Pressable onPress={onAdd} style={styles.addBtn}>
          <Text style={styles.add}>+ Log</Text>
        </Pressable>
      </View>

      {hands.length === 0 ? (
        <Text style={styles.empty}>No key hands logged this session.</Text>
      ) : (
        hands.map((hand, index) => (
          <Pressable
            key={hand.id}
            onPress={() => onOpen?.(hand)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.spineDot} />
            {index < hands.length - 1 ? <View style={styles.spineLine} /> : null}
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                {hand.holeCards?.length ? (
                  <MiniCards cards={hand.holeCards} size="sm" />
                ) : (
                  <Text style={styles.fallback}>Hand</Text>
                )}
                <View style={styles.meta}>
                  <Text style={styles.pos}>{hand.heroPosition ?? '?'}</Text>
                  {hand.resultBb != null ? (
                    <Text
                      style={[
                        styles.result,
                        { color: hand.resultBb >= 0 ? dash.profit : dash.loss },
                      ]}
                    >
                      {hand.resultBb > 0 ? '+' : ''}
                      {hand.resultBb}bb
                    </Text>
                  ) : null}
                </View>
              </View>
              <Text style={styles.summary} numberOfLines={2}>
                {hand.aiSummary ?? hand.rawInput ?? 'No summary'}
              </Text>
              <View style={styles.footer}>
                <View style={styles.tags}>
                  {hand.tags.slice(0, 3).map((tag) => (
                    <Text key={tag} style={[styles.tag, tag === 'needs_details' && styles.tagPending]}>
                      {tag === 'needs_details' ? 'Needs details' : `#${tag}`}
                    </Text>
                  ))}
                </View>
                {onShare ? (
                  <Pressable onPress={() => onShare(hand)} hitSlop={8}>
                    <Text style={styles.share}>Share</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Pressable>
        ))
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: dash.opsDim,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  add: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  empty: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    position: 'relative',
    paddingLeft: 4,
  },
  spineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: dash.ops,
    marginTop: 18,
  },
  spineLine: {
    position: 'absolute',
    left: 7,
    top: 28,
    bottom: -12,
    width: 2,
    backgroundColor: 'rgba(77,163,255,0.18)',
  },
  rowBody: {
    flex: 1,
    backgroundColor: 'rgba(7,11,18,0.45)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    gap: 8,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  pos: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  result: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  fallback: {
    color: dash.text,
    fontFamily: fonts.bodySemi,
  },
  summary: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  tagPending: { color: dash.warning },
  share: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.9,
  },
});
