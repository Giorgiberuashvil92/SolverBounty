import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { HuClientAction, HuLegalAction, HuView } from '../../api/huSocket';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

type Props = {
  view: HuView;
  disabled?: boolean;
  onAction: (action: HuClientAction) => void;
};

function findLegal(actions: HuLegalAction[], type: HuLegalAction['type']) {
  return actions.find((a) => a.type === type);
}

export function HuActionBar({ view, disabled, onAction }: Props) {
  const legal = view.legalActions;
  const isHeroTurn = view.actorUserId === view.heroUserId && legal.length > 0;
  const betSpec = findLegal(legal, 'bet') as
    | Extract<HuLegalAction, { type: 'bet' }>
    | undefined;
  const raiseSpec = findLegal(legal, 'raise') as
    | Extract<HuLegalAction, { type: 'raise' }>
    | undefined;
  const sizeSpec = betSpec ?? raiseSpec;
  const callSpec = findLegal(legal, 'call') as
    | Extract<HuLegalAction, { type: 'call' }>
    | undefined;
  const allInSpec = findLegal(legal, 'all_in') as
    | Extract<HuLegalAction, { type: 'all_in' }>
    | undefined;

  const presets = sizeSpec
    ? [
        { label: '3 BB', value: Math.min(sizeSpec.max, view.bb * 3) },
        {
          label: '½ pot',
          value: Math.min(
            sizeSpec.max,
            Math.max(sizeSpec.min, Math.round((view.pot || view.bb * 2) / 2)),
          ),
        },
        {
          label: 'Pot',
          value: Math.min(sizeSpec.max, Math.max(sizeSpec.min, view.pot || view.bb * 2)),
        },
      ].filter((p) => p.value >= sizeSpec.min && p.value <= sizeSpec.max)
    : [];

  const defaultSize = sizeSpec
    ? Math.min(sizeSpec.max, Math.max(sizeSpec.min, Math.round(view.bb * 3)))
    : 0;
  const [amount, setAmount] = useState(defaultSize);

  useEffect(() => {
    if (sizeSpec) setAmount(defaultSize);
  }, [view.handNumber, view.street, view.actorUserId, defaultSize, sizeSpec?.min, sizeSpec?.max]);

  if (view.status === 'match_over') {
    return (
      <View style={styles.wait}>
        <View style={[styles.waitPill, styles.matchOverPill]}>
          <Text style={styles.waitText}>Match over — results loading…</Text>
        </View>
      </View>
    );
  }

  if (!isHeroTurn) {
    return (
      <View style={styles.wait}>
        <View style={styles.waitPill}>
          <Text style={styles.waitText}>
            {view.status === 'hand_over'
              ? 'Next hand dealing…'
              : 'Opponent to act'}
          </Text>
        </View>
      </View>
    );
  }

  const fireSize = () => {
    if (!sizeSpec || disabled) return;
    const clamped = Math.min(sizeSpec.max, Math.max(sizeSpec.min, amount));
    onAction({ type: sizeSpec.type, amount: clamped });
  };

  return (
    <View style={styles.root}>
      {sizeSpec ? (
        <View style={styles.sizeRow}>
          {presets.map((p) => {
            const on = amount === p.value;
            return (
              <Pressable
                key={p.label}
                onPress={() => setAmount(p.value)}
                style={[styles.preset, on && styles.presetOn]}
              >
                <Text style={[styles.presetText, on && styles.presetTextOn]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
          {allInSpec ? (
            <Pressable
              onPress={() => setAmount(allInSpec.amount)}
              style={[styles.preset, styles.presetAllIn]}
            >
              <Text style={styles.presetAllInText}>ALL-IN</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        {findLegal(legal, 'fold') ? (
          <Pressable
            disabled={disabled}
            onPress={() => onAction({ type: 'fold' })}
            style={({ pressed }) => [styles.btnWrap, pressed && { opacity: 0.9 }]}
          >
            <View style={[styles.btn, styles.btnFold]}>
              <Text style={styles.btnFoldLabel}>Fold</Text>
            </View>
          </Pressable>
        ) : null}

        {findLegal(legal, 'check') ? (
          <Pressable
            disabled={disabled}
            onPress={() => onAction({ type: 'check' })}
            style={({ pressed }) => [styles.btnWrap, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={['rgba(77,163,255,0.95)', '#2B7FE0']}
              style={styles.btn}
            >
              <Text style={styles.btnLabelLight}>Check</Text>
            </LinearGradient>
          </Pressable>
        ) : null}

        {callSpec ? (
          <Pressable
            disabled={disabled}
            onPress={() => onAction({ type: 'call' })}
            style={({ pressed }) => [styles.btnWrap, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={['rgba(77,163,255,0.95)', '#2B7FE0']}
              style={styles.btn}
            >
              <Text style={styles.btnLabelLight}>Call {callSpec.amount}</Text>
            </LinearGradient>
          </Pressable>
        ) : null}

        {sizeSpec ? (
          <Pressable
            disabled={disabled}
            onPress={fireSize}
            style={({ pressed }) => [styles.btnWrap, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={[dash.brandSoft, dash.brand]}
              style={styles.btn}
            >
              <Text style={styles.btnLabelLight}>
                {sizeSpec.type === 'bet' ? 'Bet' : 'Raise'} {amount}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : null}

        {allInSpec && !sizeSpec ? (
          <Pressable
            disabled={disabled}
            onPress={() => onAction({ type: 'all_in' })}
            style={({ pressed }) => [styles.btnWrap, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={[dash.brandSoft, dash.brand]}
              style={styles.btn}
            >
              <Text style={styles.btnLabelLight}>All-in</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  wait: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  waitPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: dash.opsDim,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.25)',
  },
  matchOverPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: dash.borderStrong,
  },
  waitText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  presetOn: {
    backgroundColor: dash.opsDim,
    borderColor: 'rgba(77,163,255,0.45)',
  },
  presetAllIn: {
    borderColor: 'rgba(155,107,255,0.45)',
    backgroundColor: dash.brandDim,
  },
  presetText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  presetTextOn: {
    color: dash.opsSoft,
  },
  presetAllInText: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  btnFold: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  btnFoldLabel: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  btnLabelLight: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
});
