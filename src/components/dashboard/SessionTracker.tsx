import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { formatDuration, formatMoney, hourlyRateCents } from '../../utils/money';
import type { PokerSession } from '../../types/session';

type SessionTrackerProps = {
  session: PokerSession | null;
  onStart: () => void;
  onEnd: () => void;
};

export function SessionTracker({ session, onStart, onEnd }: SessionTrackerProps) {
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

  const buyIn = session?.buyInCents ?? 0;
  const estimatedPl = session?.profitLossCents;
  const rate =
    estimatedPl != null ? hourlyRateCents(estimatedPl, Math.max(tick, 1)) : null;

  const dotOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.35],
  });

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>SESSION</Text>
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

      <Text style={styles.timer}>{formatDuration(tick)}</Text>

      <View style={styles.stats}>
        <Stat label="Buy-in" value={session ? formatMoney(buyIn, session.currency) : '—'} />
        <Stat
          label="Cash-out"
          value={
            session?.cashOutCents != null
              ? formatMoney(session.cashOutCents, session.currency)
              : '—'
          }
        />
        <Stat
          label="$/hr"
          value={rate != null && session ? formatMoney(rate, session.currency) : '—'}
          accent
        />
      </View>

      {live ? (
        <Pressable
          onPress={onEnd}
          style={({ pressed }) => [styles.ctaEnd, pressed && styles.pressed]}
        >
          <Text style={styles.ctaEndText}>End session</Text>
        </Pressable>
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
    fontSize: 20,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    fontSize: 11,
    letterSpacing: 0.8,
  },
  timer: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 48,
    letterSpacing: 1,
    lineHeight: 52,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(8,4,18,0.45)',
    borderRadius: 14,
    padding: 12,
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
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: dash.ops,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  ctaStartText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  ctaEnd: {
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255,77,77,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,77,0.4)',
  },
  ctaEndText: {
    color: dash.loss,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.9,
  },
});
