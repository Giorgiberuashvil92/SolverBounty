import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { COACH, COMMUNITY, type CommunityMember } from '../data/community';

type CommunityCircleProps = {
  size?: number;
};

export function CommunityCircle({ size }: CommunityCircleProps) {
  const { width } = useWindowDimensions();
  const diameter = size ?? Math.min(width * 0.88, 360);
  const orbit = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: 52000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 0.7,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.3,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    spin.start();
    breathe.start();
    shimmer.start();

    return () => {
      spin.stop();
      breathe.stop();
      shimmer.stop();
    };
  }, [glow, orbit, pulse]);

  const rotate = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });

  const coachScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const radius = diameter * 0.38;
  const coachSize = diameter * 0.34;
  const memberSize = diameter * 0.145;

  return (
    <View style={[styles.root, { width: diameter, height: diameter }]}>
      <Animated.View
        style={[
          styles.outerHalo,
          {
            opacity: glow,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      <View
        style={[
          styles.orbitTrack,
          {
            width: diameter * 0.76,
            height: diameter * 0.76,
            borderRadius: diameter * 0.38,
          },
        ]}
      />
      <View
        style={[
          styles.orbitTrackInner,
          {
            width: diameter * 0.55,
            height: diameter * 0.55,
            borderRadius: diameter * 0.275,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.orbitLayer,
          {
            width: diameter,
            height: diameter,
            transform: [{ rotate }],
          },
        ]}
      >
        {COMMUNITY.map((member, index) => (
          <OrbitMember
            key={member.id}
            member={member}
            index={index}
            total={COMMUNITY.length}
            radius={radius}
            size={memberSize}
            center={diameter / 2}
            counterRotate={orbit}
          />
        ))}
      </Animated.View>

      <Animated.View
        style={[
          styles.coachWrap,
          {
            width: coachSize,
            height: coachSize,
            borderRadius: coachSize / 2,
            transform: [{ scale: coachScale }],
          },
        ]}
      >
        <View style={styles.coachRing} />
        <View style={styles.coachCore}>
          <Text style={styles.coachInitials}>{COACH.initials}</Text>
          <Text style={styles.coachLabel}>COACH</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function OrbitMember({
  member,
  index,
  total,
  radius,
  size,
  center,
  counterRotate,
}: {
  member: CommunityMember;
  index: number;
  total: number;
  radius: number;
  size: number;
  center: number;
  counterRotate: Animated.Value;
}) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const x = center + radius * Math.cos(angle) - size / 2;
  const y = center + radius * Math.sin(angle) - size / 2;

  const unspin = counterRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.member,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: x,
          top: y,
          backgroundColor: member.tone,
          transform: [{ rotate: unspin }],
        },
      ]}
    >
      <Text style={[styles.memberInitials, { fontSize: size * 0.34 }]}>{member.initials}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerHalo: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neonSoft,
    backgroundColor: 'rgba(168, 85, 247, 0.14)',
  },
  orbitTrack: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  orbitTrackInner: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.18)',
  },
  orbitLayer: {
    position: 'absolute',
  },
  member: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(233, 213, 255, 0.45)',
    shadowColor: colors.neon,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  memberInitials: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
  },
  coachWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  coachRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.neonSoft,
    shadowColor: colors.neon,
    shadowOpacity: 0.75,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  coachCore: {
    width: '88%',
    height: '88%',
    borderRadius: 999,
    backgroundColor: colors.moss,
    borderWidth: 1,
    borderColor: colors.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInitials: {
    color: colors.champagneSoft,
    fontFamily: fonts.displayBold,
    fontSize: 34,
    letterSpacing: 1,
  },
  coachLabel: {
    marginTop: 2,
    color: colors.neonSoft,
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 2.4,
  },
});
