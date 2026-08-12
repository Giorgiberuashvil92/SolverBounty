import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import type { UserStatus } from '../../types/community';

type AvatarProps = {
  initials: string;
  tone: string;
  size?: number;
  status?: UserStatus;
  onPress?: () => void;
};

const STATUS_COLOR: Record<UserStatus, string> = {
  online: dash.profit,
  in_session: dash.accentSoft,
  studying: dash.lilac,
  offline: dash.textMuted,
};

export function Avatar({ initials, tone, size = 40, status, onPress }: AvatarProps) {
  const content = (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: tone,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
      </View>
      {status ? (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: STATUS_COLOR[status],
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
            },
          ]}
        />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={6}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(245,240,255,0.35)',
  },
  initials: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
  },
  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    borderWidth: 2,
    borderColor: dash.bg,
  },
});
