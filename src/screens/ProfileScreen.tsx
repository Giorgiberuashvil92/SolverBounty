import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';

type ProfileScreenProps = {
  onBack: () => void;
  onEditSetup: () => void;
};

const LABELS = {
  primaryGame: { cash: 'Cash games', mtt: 'Tournaments', mixed: 'Mixed games' },
  venueFocus: { online: 'Online', live: 'Live', both: 'Online + live' },
  stakesBand: { micro: 'Micro', low: 'Low stakes', mid: 'Mid stakes', high: 'High stakes' },
  experience: { recreational: 'Recreational', serious: 'Serious grinder', pro: 'Pro / aspiring pro' },
  goal: { track: 'Track results', improve: 'Fix leaks', coach: 'AI coach daily', move_up: 'Move up stakes' },
} as const;

export function ProfileScreen({ onBack, onEditSetup }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  if (!user) return null;

  const initials = user.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const profile = user.profile;

  const signOut = () => {
    Alert.alert('Sign out?', 'You can sign back in whenever you want.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={dash.opsSoft} />
          </Pressable>
          <Text style={styles.topTitle}>Profile</Text>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'P'}</Text>
          </View>
          <Text style={styles.name}>{user.displayName}</Text>
          <Text selectable style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>PLAYER SETUP</Text>
          <Pressable onPress={onEditSetup} hitSlop={8}>
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>
        </View>
        <View style={styles.settings}>
          <ProfileRow icon="game-controller-outline" label="Main game" value={profile?.primaryGame ? LABELS.primaryGame[profile.primaryGame] : 'Not set'} />
          <ProfileRow icon="globe-outline" label="Where you play" value={profile?.venueFocus ? LABELS.venueFocus[profile.venueFocus] : 'Not set'} />
          <ProfileRow icon="layers-outline" label="Stakes" value={profile?.stakesBand ? LABELS.stakesBand[profile.stakesBand] : 'Not set'} />
          <ProfileRow icon="flag-outline" label="Current goal" value={profile?.goal ? LABELS.goal[profile.goal] : 'Not set'} />
        </View>

        <Pressable onPress={onEditSetup} style={({ pressed }) => [styles.setupButton, pressed && styles.pressed]}>
          <Text style={styles.setupButtonText}>Edit player setup</Text>
        </Pressable>
        <Pressable onPress={signOut} style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={19} color={dash.opsSoft} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 16, gap: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: dash.surface,
    borderWidth: 1,
    borderColor: dash.border,
  },
  topTitle: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  topSpacer: { width: 38 },
  hero: { alignItems: 'center', paddingVertical: 14, gap: 4 },
  avatar: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: dash.opsDim,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.4)',
    marginBottom: 5,
  },
  avatarText: { color: dash.opsSoft, fontFamily: fonts.displayBold, fontSize: 27 },
  name: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 27 },
  email: { color: dash.textMuted, fontFamily: fonts.body, fontSize: 13 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { color: dash.textMuted, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4 },
  editLink: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 13 },
  settings: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: dash.border, backgroundColor: dash.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  rowLabel: { flex: 1, color: dash.textSecondary, fontFamily: fonts.body, fontSize: 14 },
  rowValue: { maxWidth: '42%', color: dash.text, fontFamily: fonts.bodySemi, fontSize: 13, textAlign: 'right' },
  setupButton: { alignItems: 'center', borderRadius: 12, backgroundColor: dash.ops, paddingVertical: 13 },
  setupButtonText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 14 },
  signOut: { alignItems: 'center', paddingVertical: 10 },
  signOutText: { color: dash.loss, fontFamily: fonts.bodyBold, fontSize: 13 },
  pressed: { opacity: 0.86 },
});
