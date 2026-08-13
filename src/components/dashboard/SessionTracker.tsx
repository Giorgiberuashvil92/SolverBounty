import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { formatDuration, formatMoney, hourlyRateCents, MIN_HOURLY_DURATION_SECONDS } from '../../utils/money';
import type { PokerSession } from '../../types/session';

type SessionTrackerProps = {
  session: PokerSession | null;
  onStart: () => void;
  onEnd: () => void;
  onLogHand?: () => void;
  suggestedFormatLabel: string;
  suggestedBuyInCents: number;
};

export function SessionTracker({
  session,
  onStart,
  onEnd,
  onLogHand,
  suggestedFormatLabel,
  suggestedBuyInCents,
}: SessionTrackerProps) {
  const live = session?.status === 'live';
  const [tick, setTick] = useState(session?.durationSeconds ?? 0);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!live || !session?.startedAt) {
      setTick(session?.durationSeconds ?? 0);
      return;
    }
    const startedMs = Date.parse(session.startedAt);
    const sync = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
      setTick(Number.isFinite(startedMs) ? elapsed : session.durationSeconds);
    };
    sync();
    const id = setInterval(sync, 1000);
    return () => clearInterval(id);
  }, [live, session]);

  useEffect(() => {
    if (!live) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [live, pulse]);

  const buyIn = session?.buyInCents ?? suggestedBuyInCents;
  const estimatedPl = session?.profitLossCents;
  const rate =
    estimatedPl != null && tick >= MIN_HOURLY_DURATION_SECONDS
      ? hourlyRateCents(estimatedPl, tick)
      : null;

  const dotOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.35],
  });

  return (
    <View style={[styles.shell, !live && styles.idleShell]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>{live ? 'LIVE SESSION' : 'NEXT SESSION'}</Text>
          <Text style={styles.title}>
            {live ? `${session?.stakesLabel} on the clock` : 'Ready when you are'}
          </Text>
        </View>
        <View style={[styles.badge, live ? styles.badgeLive : styles.badgeIdle]}>
          {live ? <Animated.View style={[styles.dotLive, { opacity: dotOpacity }]} /> : (
            <View style={styles.dotIdle} />
          )}
          <Text style={styles.badgeText}>{live ? 'LIVE' : 'IDLE'}</Text>
        </View>
      </View>

      {live ? (
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          numberOfLines={1}
          style={styles.timer}
        >
          {formatDuration(tick)}
        </Text>
      ) : (
        <Text style={styles.ready}>Ready to play</Text>
      )}

      {live ? (
        <View style={styles.stats}>
          <Stat label="Logged" value={String(session?.keyHands.length ?? 0)} />
          <Stat label="Buy-in" value={formatMoney(buyIn, session?.currency)} />
          <Stat
            label="$/hr"
            value={rate != null && session ? formatMoney(rate, session.currency) : '—'}
            accent
          />
        </View>
      ) : (
        <View style={styles.presetRow}>
          <Pressable onPress={onStart} style={styles.preset}>
            <Ionicons name="layers-outline" size={21} color={dash.opsSoft} />
            <Text style={styles.presetValue}>{suggestedFormatLabel}</Text>
            <Ionicons name="create-outline" size={16} color={dash.opsSoft} />
          </Pressable>
          <Pressable onPress={onStart} style={styles.preset}>
            <Ionicons name="cash-outline" size={21} color={dash.opsSoft} />
            <Text style={styles.presetValue}>
              Buy-in {formatMoney(suggestedBuyInCents)}
            </Text>
            <Ionicons name="create-outline" size={16} color={dash.opsSoft} />
          </Pressable>
        </View>
      )}

      {live ? (
        <View style={styles.liveActions}>
          <Pressable
            onPress={onLogHand}
            style={({ pressed }) => [styles.ctaLog, pressed && styles.pressed]}
          >
            <Ionicons name="flash-outline" size={17} color={dash.ctaText} />
            <Text style={styles.ctaLogText}>Quick log</Text>
          </Pressable>
          <Pressable
            onPress={onEnd}
            style={({ pressed }) => [styles.ctaEnd, pressed && styles.pressed]}
          >
            <Text style={styles.ctaEndText}>End</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={onStart} style={({ pressed }) => [pressed && styles.pressed]}>
          <LinearGradient
            colors={[dash.cta, '#22C95A']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.ctaStart}
          >
            <Text style={styles.ctaStartText}>Start session</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: dash.opsSoft }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 16,
    backgroundColor: dash.surface,
    borderWidth: 1,
    borderColor: dash.border,
    padding: 12,
    gap: 8,
  },
  idleShell: { minHeight: 194, justifyContent: 'space-between' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.display,
    fontSize: 19,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeLive: {
    backgroundColor: 'rgba(0,255,136,0.1)',
    borderColor: 'rgba(0,255,136,0.4)',
  },
  badgeIdle: {
    backgroundColor: dash.surfaceRaised,
    borderColor: dash.borderStrong,
  },
  dotLive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: dash.profit,
  },
  dotIdle: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: dash.textMuted,
  },
  badgeText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  timer: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 38,
    letterSpacing: 0,
    lineHeight: 44,
  },
  ready: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 27,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  presetRow: { flexDirection: 'row', gap: 8 },
  preset: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: dash.borderStrong,
    borderRadius: 10,
    backgroundColor: 'rgba(8,4,18,0.35)',
  },
  presetValue: { flex: 1, color: dash.textSecondary, fontFamily: fonts.bodySemi, fontSize: 13 },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(8,4,18,0.45)',
    borderRadius: 14,
    padding: 9,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  statValue: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  ctaStart: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaStartText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  liveActions: { flexDirection: 'row', gap: 8 },
  ctaLog: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    backgroundColor: dash.cta,
    borderRadius: 10,
    paddingVertical: 10,
  },
  ctaLogText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  ctaEnd: {
    minWidth: 84,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  ctaEndText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.9,
  },
});
