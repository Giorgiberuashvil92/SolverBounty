import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/community/Avatar';
import { PostCard } from '../components/community/PostCard';
import { PresenceRail } from '../components/community/PresenceRail';
import { ProfileView } from '../components/community/ProfileView';
import { ThreadView } from '../components/community/ThreadView';
import { ShareSettingsCard } from '../components/dashboard/ShareSettingsCard';
import {
  COMMUNITY_POSTS,
  COMMUNITY_USERS,
  ME_ID,
  getUser,
} from '../data/mock/communityFeed';
import { loadUserCommunityPosts } from '../data/communityFeedStore';
import { shareApi, type ShareChannel } from '../api/shareApi';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';
import type { CommunityPost, PostKind } from '../types/community';

type ViewState =
  | { mode: 'feed' }
  | { mode: 'profile'; userId: string }
  | { mode: 'thread'; postId: string };

type FeedFilter = 'all' | PostKind;

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hand', label: 'Hands' },
  { key: 'day_share', label: 'Sessions' },
  { key: 'discussion', label: 'Talk' },
];

export function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<ViewState>({ mode: 'feed' });
  const [posts, setPosts] = useState<CommunityPost[]>(COMMUNITY_POSTS);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [destOpen, setDestOpen] = useState(false);
  const me = getUser(ME_ID)!;
  const glow = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    void loadUserCommunityPosts().then((mine) => {
      setPosts([...mine, ...COMMUNITY_POSTS]);
    });
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 0.55,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.25,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  const activeUsers = useMemo(
    () => COMMUNITY_USERS.filter((u) => u.status !== 'offline'),
    [],
  );

  const visiblePosts = useMemo(() => {
    if (filter === 'all') return posts;
    return posts.filter((p) => p.kind === filter);
  }, [posts, filter]);

  const openProfile = (userId: string) => setView({ mode: 'profile', userId });
  const openThread = (postId: string) => setView({ mode: 'thread', postId });
  const backToFeed = () => setView({ mode: 'feed' });

  const toggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = !p.likedByMe;
        return {
          ...p,
          likedByMe: liked,
          likes: p.likes + (liked ? 1 : -1),
        };
      }),
    );
  };

  const addComment = (postId: string, body: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: [
            ...p.comments,
            {
              id: `c_${Date.now()}`,
              authorId: ME_ID,
              body,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }),
    );
  };

  const shareToday = () => {
    const id = `post_${Date.now()}`;
    const post: CommunityPost = {
      id,
      authorId: ME_ID,
      kind: 'day_share',
      createdAt: new Date().toISOString(),
      body: 'Shared today’s session — key hands below, let’s review together.',
      dayLabel: 'Today',
      sessionSummary: {
        stakes: 'NL50',
        durationLabel: '1h 27m',
        resultBb: 17,
        handsCount: 2,
      },
      likes: 0,
      comments: [],
    };
    setPosts((prev) => [post, ...prev]);
    setFilter('all');
    Alert.alert('On the felt', 'Your session is live in the feed.');
  };

  const shareExternal = async (channel: ShareChannel) => {
    const text = [
      channel === 'study_group' ? 'Study group' : channel === 'discord' ? 'Discord' : 'Telegram',
      'PokerAICoach day share',
      'Review spots with me — key hands in the app.',
    ].join('\n');
    try {
      const result = await shareApi.send(channel, text);
      await Share.share({ message: result.text || text });
    } catch (e) {
      try {
        await Share.share({ message: text });
      } catch {
        Alert.alert('Share', (e as Error).message);
      }
    }
  };

  if (view.mode === 'profile') {
    const user = getUser(view.userId);
    if (!user) return null;
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <ProfileView
          user={user}
          posts={posts}
          onBack={backToFeed}
          onOpenProfile={openProfile}
          onOpenThread={openThread}
          onToggleLike={toggleLike}
        />
      </View>
    );
  }

  if (view.mode === 'thread') {
    const post = posts.find((p) => p.id === view.postId);
    if (!post) return null;
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <ThreadView
          post={post}
          onBack={backToFeed}
          onOpenProfile={openProfile}
          onToggleLike={toggleLike}
          onAddComment={addComment}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#171D36', '#0B1020', '#080C18']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.orb, { opacity: glow }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>THE FELT</Text>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.sub}>People at the table. Hands in the open.</Text>
          </View>
          <Pressable onPress={() => openProfile(ME_ID)} style={styles.meOrb}>
            <Avatar initials={me.initials} tone={me.tone} size={44} status={me.status} />
          </Pressable>
        </View>

        <PresenceRail users={activeUsers} onOpenProfile={openProfile} />

        <Pressable
          onPress={shareToday}
          style={({ pressed }) => [styles.shareStrip, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={['rgba(46,230,106,0.16)', 'rgba(20,26,44,0.96)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareGrad}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.shareEyebrow}>SHARE SESSION</Text>
              <Text style={styles.shareTitle}>Drop today on the felt</Text>
            </View>
            <View style={styles.shareCta}>
              <Text style={styles.shareCtaText}>Share</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.quickRow}>
          <Pressable
            onPress={() => void shareExternal('study_group')}
            style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
          >
            <Text style={styles.quickChipText}>Study group</Text>
          </Pressable>
          <Pressable
            onPress={() => void shareExternal('discord')}
            style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
          >
            <Text style={styles.quickChipText}>Discord</Text>
          </Pressable>
          <Pressable
            onPress={() => void shareExternal('telegram')}
            style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
          >
            <Text style={styles.quickChipText}>Telegram</Text>
          </Pressable>
          <Pressable
            onPress={() => setDestOpen(true)}
            style={({ pressed }) => [styles.quickChipMuted, pressed && styles.pressed]}
          >
            <Text style={styles.quickChipMutedText}>Setup</Text>
          </Pressable>
        </View>

        <View style={styles.feedHead}>
          <View>
            <Text style={styles.feedLabel}>ON THE FELT</Text>
            <Text style={styles.feedHint}>{visiblePosts.length} moments</Text>
          </View>
        </View>

        <View style={styles.filterTrack}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, on && styles.filterChipOn]}
              >
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.feed}>
          {visiblePosts.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyBody}>
                Share a session or open a hand from Reviews to seed the table.
              </Text>
              <Pressable onPress={shareToday} style={styles.emptyCta}>
                <Text style={styles.emptyCtaText}>Share today</Text>
              </Pressable>
            </View>
          ) : (
            visiblePosts.map((post) => {
              const author = getUser(post.authorId);
              if (!author) return null;
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  author={author}
                  onOpenProfile={openProfile}
                  onOpenThread={openThread}
                  onToggleLike={toggleLike}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={destOpen}
        animationType="slide"
        onRequestClose={() => setDestOpen(false)}
      >
        <View style={[styles.destModal, { paddingTop: insets.top + 12 }]}>
          <View style={styles.destHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.destKicker}>DESTINATIONS</Text>
              <Text style={styles.destTitle}>Share setup</Text>
              <Text style={styles.destSub}>Discord & Telegram — optional, off the main table.</Text>
            </View>
            <Pressable onPress={() => setDestOpen(false)} style={styles.destDone}>
              <Text style={styles.destDoneText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <ShareSettingsCard />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dash.bg,
  },
  orb: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(77,163,255,0.1)',
  },
  scroll: {
    paddingBottom: 36,
    gap: 16,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  kicker: {
    color: 'rgba(255,255,255,0.38)',
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 32,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  sub: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    maxWidth: 260,
  },
  meOrb: {
    marginTop: 6,
  },
  shareStrip: {
    marginHorizontal: 20,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.28)',
  },
  shareGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  shareEyebrow: {
    color: dash.cta,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  shareTitle: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  shareCta: {
    backgroundColor: dash.cta,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  shareCtaText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(155,107,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(155,107,255,0.28)',
  },
  quickChipText: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  quickChipMuted: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickChipMutedText: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  feedHead: {
    paddingHorizontal: 20,
    marginTop: 4,
  },
  feedLabel: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.4,
  },
  feedHint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  filterTrack: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterChipOn: {
    backgroundColor: 'rgba(77,163,255,0.16)',
    borderColor: 'rgba(77,163,255,0.4)',
  },
  filterText: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
  filterTextOn: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
  },
  feed: {
    paddingHorizontal: 12,
    gap: 14,
  },
  emptyFeed: {
    marginHorizontal: 8,
    borderRadius: 20,
    padding: 20,
    gap: 8,
    backgroundColor: 'rgba(20,26,44,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 20,
  },
  emptyBody: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyCta: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: dash.cta,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyCtaText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.9,
  },
  destModal: {
    flex: 1,
    backgroundColor: dash.bg,
  },
  destHead: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  destKicker: {
    color: 'rgba(255,255,255,0.38)',
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  destTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 26,
  },
  destSub: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  destDone: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(77,163,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
    alignSelf: 'flex-start',
  },
  destDoneText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
});
