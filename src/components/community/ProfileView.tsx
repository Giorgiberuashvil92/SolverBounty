import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import type { CommunityPost, CommunityUser } from '../../types/community';
import { getUser } from '../../data/mock/communityFeed';

type ProfileViewProps = {
  user: CommunityUser;
  posts: CommunityPost[];
  onBack: () => void;
  onOpenThread: (postId: string) => void;
  onToggleLike: (postId: string) => void;
  onOpenProfile: (userId: string) => void;
};

const STATUS_LABEL = {
  online: 'Online',
  in_session: 'In session',
  studying: 'Studying',
  offline: 'Offline',
} as const;

export function ProfileView({
  user,
  posts,
  onBack,
  onOpenThread,
  onToggleLike,
  onOpenProfile,
}: ProfileViewProps) {
  const userPosts = posts.filter((p) => p.authorId === user.id);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.back}>← Feed</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Avatar initials={user.initials} tone={user.tone} size={72} status={user.status} />
          <Text style={styles.name}>{user.displayName}</Text>
          <Text style={styles.handle}>
            {user.handle} · {STATUS_LABEL[user.status]}
          </Text>
          <Text style={styles.bio}>{user.bio}</Text>

          <View style={styles.stats}>
            <Stat label="Streak" value={`${user.streakDays}d`} />
            <Stat label="Hands" value={String(user.handsShared)} />
            <Stat label="Followers" value={String(user.followers)} />
            <Stat label="Following" value={String(user.following)} />
          </View>

          <View style={styles.chips}>
            <Chip text={user.stakes} />
            <Chip text={user.format.toUpperCase()} />
          </View>
        </View>

        <Text style={styles.section}>Posts & hands</Text>
        {userPosts.length === 0 ? (
          <Text style={styles.empty}>Nothing shared yet.</Text>
        ) : (
          userPosts.map((post) => {
            const author = getUser(post.authorId);
            if (!author) return null;
            return (
              <PostCard
                key={post.id}
                post={post}
                author={author}
                onOpenProfile={onOpenProfile}
                onOpenThread={onOpenThread}
                onToggleLike={onToggleLike}
              />
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dash.bg,
  },
  top: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  back: {
    color: dash.accentSoft,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: dash.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dash.border,
    padding: 18,
  },
  name: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 26,
    marginTop: 6,
  },
  handle: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  bio: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
  },
  stat: {
    alignItems: 'center',
    minWidth: 58,
  },
  statValue: {
    color: dash.accentSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  statLabel: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: dash.accentDim,
    borderWidth: 1,
    borderColor: dash.borderStrong,
  },
  chipText: {
    color: dash.lilac,
    fontFamily: fonts.bodySemi,
    fontSize: 11,
  },
  section: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: 4,
  },
  empty: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
});
