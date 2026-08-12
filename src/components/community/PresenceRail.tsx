import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from './Avatar';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import type { CommunityUser } from '../../types/community';

type PresenceRailProps = {
  users: CommunityUser[];
  onOpenProfile: (userId: string) => void;
};

export function PresenceRail({ users, onOpenProfile }: PresenceRailProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.captionRow}>
        <Text style={styles.caption}>LIVE TABLE</Text>
        <Text style={styles.count}>{users.length} active</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {users.map((u) => (
          <PresenceSeat key={u.id} user={u} onPress={() => onOpenProfile(u.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function PresenceSeat({
  user,
  onPress,
}: {
  user: CommunityUser;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const live = user.status === 'in_session' || user.status === 'online';

  useEffect(() => {
    if (!live) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [live, pulse]);

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0.15],
  });

  return (
    <Pressable onPress={onPress} style={styles.seat}>
      <View style={styles.avatarStage}>
        {live ? (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
                borderColor:
                  user.status === 'in_session' ? dash.accentSoft : dash.profit,
              },
            ]}
          />
        ) : null}
        <Avatar
          initials={user.initials}
          tone={user.tone}
          size={54}
          status={user.status}
        />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {user.displayName}
      </Text>
      <Text style={styles.status} numberOfLines={1}>
        {statusCopy(user)}
      </Text>
    </Pressable>
  );
}

function statusCopy(user: CommunityUser): string {
  if (user.status === 'in_session') return 'At the felt';
  if (user.status === 'studying') return 'On drills';
  if (user.status === 'online') return 'Around';
  return 'Away';
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  caption: {
    color: dash.accentSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.8,
  },
  count: {
    color: dash.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  row: {
    paddingHorizontal: 20,
    gap: 16,
  },
  seat: {
    width: 72,
    alignItems: 'center',
    gap: 5,
  },
  avatarStage: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
  },
  name: {
    color: dash.text,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
  status: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 10,
  },
});
