import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import type { CommunityPost } from '../../types/community';
import { getUser, ME_ID } from '../../data/mock/communityFeed';

type ThreadViewProps = {
  post: CommunityPost;
  onBack: () => void;
  onOpenProfile: (userId: string) => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, body: string) => void;
};

export function ThreadView({
  post,
  onBack,
  onOpenProfile,
  onToggleLike,
  onAddComment,
}: ThreadViewProps) {
  const [draft, setDraft] = useState('');
  const author = getUser(post.authorId);

  if (!author) return null;

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    onAddComment(post.id, body);
    setDraft('');
  };

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.back}>← Feed</Text>
        </Pressable>
        <Text style={styles.title}>Discussion</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PostCard
          post={post}
          author={author}
          onOpenProfile={onOpenProfile}
          onOpenThread={() => undefined}
          onToggleLike={onToggleLike}
        />

        <Text style={styles.section}>Comments</Text>
        {post.comments.length === 0 ? (
          <Text style={styles.empty}>Be the first — leave a take on this hand.</Text>
        ) : (
          post.comments.map((c) => {
            const u = getUser(c.authorId);
            if (!u) return null;
            return (
              <View key={c.id} style={styles.comment}>
                <Avatar
                  initials={u.initials}
                  tone={u.tone}
                  size={32}
                  onPress={() => onOpenProfile(u.id)}
                />
                <View style={styles.commentBody}>
                  <Text style={styles.commentName}>{u.displayName}</Text>
                  <Text style={styles.commentText}>{c.body}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="What’s your take on this spot?"
          placeholderTextColor={dash.textMuted}
          style={styles.input}
          multiline
        />
        <Pressable onPress={send} style={({ pressed }) => [styles.send, pressed && styles.pressed]}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
      <Text style={styles.asMe}>Posting as {getUser(ME_ID)?.displayName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dash.bg,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  back: {
    color: dash.accentSoft,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    width: 54,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 20,
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
  comment: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: dash.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dash.border,
    padding: 12,
  },
  commentBody: {
    flex: 1,
    gap: 3,
  },
  commentName: {
    color: dash.lilac,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
  commentText: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: dash.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: dash.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dash.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: dash.text,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  send: {
    backgroundColor: dash.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendText: {
    color: '#14061F',
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.88,
  },
  asMe: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },
});
