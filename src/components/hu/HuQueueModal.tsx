import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../community/Avatar';
import { MiniCards } from '../community/MiniCards';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

function toneFrom(name: string) {
  const tones = ['#243B66', '#2A4A7A', '#4A2F55', '#3A3560', '#1F4A5A', '#5A3828'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % 997;
  return tones[h % tones.length]!;
}

type Props = {
  visible: boolean;
  searching: boolean;
  heroName: string;
  opponent?: string | null;
  error?: string | null;
  onCancel: () => void;
};

export function HuQueueModal({
  visible,
  searching,
  heroName,
  opponent,
  error,
  onCancel,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  const hero = useMemo(
    () => ({
      name: heroName || 'You',
      initials: initialsFrom(heroName || 'You'),
      tone: toneFrom(heroName || 'You'),
    }),
    [heroName],
  );

  const scanning = searching && !opponent && !error;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    floatLoop.start();
    return () => {
      loop.stop();
      floatLoop.stop();
    };
  }, [visible, pulse, float]);

  useEffect(() => {
    if (!visible || !scanning) {
      ring.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, scanning, ring]);

  useEffect(() => {
    if (!visible || !scanning) return;
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      shimmer.setValue(0);
    };
  }, [visible, scanning, shimmer]);

  if (!visible) return null;

  const vsScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.55],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });
  const barX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 220],
  });
  const floatY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const rightFace = opponent
    ? {
        name: opponent,
        initials: initialsFrom(opponent),
        tone: toneFrom(opponent),
      }
    : {
        name: 'Waiting',
        initials: '...',
        tone: '#243B66',
      };

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(77,163,255,0.14)', dash.surfaceRaised, dash.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.orb} pointerEvents="none" />
        <Animated.View
          pointerEvents="none"
          style={[styles.floatCards, { transform: [{ translateY: floatY }] }]}
        >
          <MiniCards cards={['As', 'Kh']} size="sm" overlap={4} fan />
        </Animated.View>

        {error ? (
          <>
            <Text style={styles.eyebrow}>HU ARENA</Text>
            <Text style={styles.title}>Couldn’t connect</Text>
            <Text style={styles.body}>{error}</Text>
          </>
        ) : (
          <>
            <View style={styles.head}>
              <View
                style={[styles.livePill, opponent ? styles.livePillFound : null]}
              >
                <View
                  style={[styles.liveDot, opponent ? styles.liveDotFound : null]}
                />
                <Text
                  style={[styles.liveText, opponent ? styles.liveTextFound : null]}
                >
                  {opponent ? 'MATCHED' : 'LIVE QUEUE'}
                </Text>
              </View>
              <Text style={styles.title}>
                {opponent ? 'Opponent found' : 'Finding opponent'}
              </Text>
              <Text style={styles.body}>
                {opponent
                  ? `${hero.name}  vs  ${opponent}`
                  : 'Heads-up · same stack · blinds climb'}
              </Text>
            </View>

            <View style={styles.stage}>
              <LinearGradient
                colors={[
                  'rgba(77,163,255,0.16)',
                  'rgba(20,26,44,0.9)',
                  'rgba(11,16,32,0.55)',
                ]}
                style={styles.felt}
              />

              <View style={styles.arenaRow}>
                <View style={styles.side}>
                  <View style={styles.youRing} />
                  <Avatar
                    initials={hero.initials}
                    tone={hero.tone}
                    size={78}
                    status="online"
                  />
                  <Text style={styles.sideName} numberOfLines={1}>
                    {hero.name}
                  </Text>
                  <View style={styles.youChip}>
                    <Text style={styles.youChipText}>You</Text>
                  </View>
                </View>

                <View style={styles.mid}>
                  <View style={styles.bridge} />
                  <Animated.View
                    style={[styles.vsWrap, { transform: [{ scale: vsScale }] }]}
                  >
                    <LinearGradient
                      colors={['rgba(77,163,255,0.35)', '#1A2238']}
                      style={styles.vsGrad}
                    >
                      <Text style={styles.vs}>VS</Text>
                    </LinearGradient>
                  </Animated.View>
                </View>

                <View style={styles.side}>
                  {scanning ? (
                    <>
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.scanRing,
                          {
                            opacity: ringOpacity,
                            transform: [{ scale: ringScale }],
                          },
                        ]}
                      />
                      <View style={styles.scanRingStatic} />
                    </>
                  ) : opponent ? (
                    <View style={styles.lockRing} />
                  ) : null}
                  <Animated.View
                    style={{
                      opacity: scanning ? 0.7 : 1,
                    }}
                  >
                    <Avatar
                      initials={rightFace.initials}
                      tone={rightFace.tone}
                      size={78}
                      status={opponent ? 'online' : undefined}
                    />
                  </Animated.View>
                  <Text style={styles.sideName} numberOfLines={1}>
                    {rightFace.name}
                  </Text>
                  <View style={[styles.oppChip, opponent && styles.oppChipOn]}>
                    <Text
                      style={[
                        styles.oppChipText,
                        opponent && styles.oppChipTextOn,
                      ]}
                    >
                      {opponent ? 'Opponent' : 'Scanning'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {scanning ? (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressShine,
                      { transform: [{ translateX: barX }] },
                    ]}
                  />
                </View>
                <Text style={styles.progressHint}>Looking across the lobby…</Text>
              </View>
            ) : opponent ? (
              <Text style={styles.dealHint}>Dealing in a moment</Text>
            ) : null}
          </>
        )}

        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.88 }]}
        >
          <Text style={styles.cancelText}>
            {opponent ? 'Continue' : 'Cancel'}
          </Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(6, 8, 16, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    zIndex: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: dash.glowBlue,
  },
  floatCards: {
    position: 'absolute',
    top: 18,
    right: 18,
    opacity: 0.9,
  },
  head: {
    gap: 6,
    marginBottom: 16,
    paddingRight: 70,
  },
  livePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: dash.opsDim,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.35)',
  },
  livePillFound: {
    backgroundColor: 'rgba(46,230,106,0.12)',
    borderColor: 'rgba(46,230,106,0.35)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: dash.ops,
  },
  liveDotFound: {
    backgroundColor: dash.cta,
  },
  liveText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  liveTextFound: {
    color: dash.cta,
  },
  eyebrow: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  body: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  stage: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 14,
  },
  felt: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  arenaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 22,
  },
  side: {
    width: 112,
    alignItems: 'center',
    gap: 8,
  },
  mid: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bridge: {
    position: 'absolute',
    width: 54,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(77,163,255,0.25)',
  },
  youRing: {
    position: 'absolute',
    top: -4,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(77,163,255,0.45)',
  },
  scanRing: {
    position: 'absolute',
    top: -6,
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 2,
    borderColor: 'rgba(77,163,255,0.55)',
  },
  scanRingStatic: {
    position: 'absolute',
    top: -4,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.25)',
  },
  lockRing: {
    position: 'absolute',
    top: -4,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(46,230,106,0.45)',
  },
  sideName: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    maxWidth: 108,
    textAlign: 'center',
  },
  youChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: dash.opsDim,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.4)',
  },
  youChipText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  oppChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  oppChipOn: {
    backgroundColor: dash.opsDim,
    borderColor: 'rgba(77,163,255,0.4)',
  },
  oppChipText: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  oppChipTextOn: {
    color: dash.opsSoft,
  },
  vsWrap: {
    zIndex: 2,
  },
  vsGrad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.4)',
  },
  vs: {
    color: dash.opsSoft,
    fontFamily: fonts.displayBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  progressWrap: {
    gap: 8,
    marginBottom: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressShine: {
    width: 72,
    height: 4,
    borderRadius: 2,
    backgroundColor: dash.opsSoft,
    opacity: 0.9,
  },
  progressHint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
  },
  dealHint: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  cancel: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
});
