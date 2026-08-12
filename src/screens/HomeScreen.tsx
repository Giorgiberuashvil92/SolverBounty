import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommunityCircle } from '../components/CommunityCircle';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

type HomeScreenProps = {
  onEnterStudy: () => void;
};

export function HomeScreen({ onEnterStudy }: HomeScreenProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const intro = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [ctaPulse, intro]);

  const brandOpacity = intro;
  const brandY = intro.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });
  const circleOpacity = intro.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.4, 1],
  });
  const circleScale = intro.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const copyOpacity = intro.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
  });
  const copyY = intro.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });
  const ctaScale = ctaPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#151A32', '#0B1020', '#080C18']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(155,107,255,0.14)', 'transparent', 'rgba(77,163,255,0.08)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.vignette, { height: height * 0.28 }]} />

      <View style={[styles.content, { paddingTop: insets.top + 12 }]}>
        <Animated.View style={{ opacity: brandOpacity, transform: [{ translateY: brandY }] }}>
          <Text style={styles.brand}>PokerAICoach</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.circleStage,
            {
              opacity: circleOpacity,
              transform: [{ scale: circleScale }],
            },
          ]}
        >
          <CommunityCircle />
        </Animated.View>

        <Animated.View
          style={[
            styles.copyBlock,
            {
              opacity: copyOpacity,
              transform: [{ translateY: copyY }],
            },
          ]}
        >
          <Text style={styles.headline}>Coach in your circle</Text>
          <Text style={styles.support}>
            You’re not grinding alone — AI coach and community at one table.
          </Text>

          <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
            <Pressable
              onPress={onEnterStudy}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <Text style={styles.ctaText}>Daily Dashboard</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  vignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    // soft floor glow via nested gradient substitute
    shadowColor: colors.feltGlow,
    shadowOpacity: 0.25,
    shadowRadius: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  brand: {
    color: colors.neonSoft,
    fontFamily: fonts.displayBold,
    fontSize: 34,
    letterSpacing: -0.5,
    textAlign: 'center',
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  circleStage: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  copyBlock: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  headline: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  support: {
    color: colors.creamMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  cta: {
    marginTop: 8,
    backgroundColor: colors.neon,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: colors.neon,
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
