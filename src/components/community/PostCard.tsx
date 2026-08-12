import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from './Avatar';
import { MiniCards } from './MiniCards';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import type { CommunityPost, CommunityUser } from '../../types/community';

type PostCardProps = {
  post: CommunityPost;
  author: CommunityUser;
  onOpenProfile: (userId: string) => void;
  onOpenThread: (postId: string) => void;
  onToggleLike: (postId: string) => void;
};

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function PostCard({
  post,
  author,
  onOpenProfile,
  onOpenThread,
  onToggleLike,
}: PostCardProps) {
  if (post.kind === 'day_share') {
    return (
      <DayMoment
        post={post}
        author={author}
        onOpenProfile={onOpenProfile}
        onOpenThread={onOpenThread}
        onToggleLike={onToggleLike}
      />
    );
  }
  if (post.kind === 'hand') {
    return (
      <HandMoment
        post={post}
        author={author}
        onOpenProfile={onOpenProfile}
        onOpenThread={onOpenThread}
        onToggleLike={onToggleLike}
      />
    );
  }
  return (
    <TalkMoment
      post={post}
      author={author}
      onOpenProfile={onOpenProfile}
      onOpenThread={onOpenThread}
      onToggleLike={onToggleLike}
    />
  );
}

function AuthorLine({
  author,
  createdAt,
  label,
  onOpenProfile,
}: {
  author: CommunityUser;
  createdAt: string;
  label: string;
  onOpenProfile: (id: string) => void;
}) {
  return (
    <View style={styles.authorLine}>
      <Avatar
        initials={author.initials}
        tone={author.tone}
        size={34}
        status={author.status}
        onPress={() => onOpenProfile(author.id)}
      />
      <View style={{ flex: 1 }}>
        <Pressable onPress={() => onOpenProfile(author.id)}>
          <Text style={styles.authorName}>{author.displayName}</Text>
        </Pressable>
        <Text style={styles.authorMeta}>
          {label} · {timeAgo(createdAt)}
        </Text>
      </View>
    </View>
  );
}

function ActionRow({
  post,
  onToggleLike,
  onOpenThread,
}: {
  post: CommunityPost;
  onToggleLike: (id: string) => void;
  onOpenThread: (id: string) => void;
}) {
  return (
    <View style={styles.actions}>
      <Pressable onPress={() => onToggleLike(post.id)} hitSlop={8}>
        <Text style={[styles.action, post.likedByMe && styles.liked]}>
          {post.likedByMe ? '♥' : '♡'} {post.likes}
        </Text>
      </Pressable>
      <Pressable onPress={() => onOpenThread(post.id)} hitSlop={8}>
        <Text style={styles.action}>↺ {post.comments.length}</Text>
      </Pressable>
      <Pressable onPress={() => onOpenThread(post.id)} style={styles.discussBtn}>
        <Text style={styles.discuss}>Open table</Text>
      </Pressable>
    </View>
  );
}

function DayMoment({
  post,
  author,
  onOpenProfile,
  onOpenThread,
  onToggleLike,
}: PostCardProps) {
  const result = post.sessionSummary?.resultBb;
  const positive = (result ?? 0) >= 0;

  return (
    <Pressable onPress={() => onOpenThread(post.id)} style={styles.momentWrap}>
      <View style={styles.spine} />
      <LinearGradient
        colors={
          positive
            ? ['rgba(34,197,94,0.14)', 'rgba(255,255,255,0.05)', 'rgba(7,11,20,0.95)']
            : ['rgba(239,68,68,0.14)', 'rgba(168,85,247,0.08)', 'rgba(7,11,20,0.95)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.dayShell}
      >
        <AuthorLine
          author={author}
          createdAt={post.createdAt}
          label="Day share"
          onOpenProfile={onOpenProfile}
        />
        <Text style={styles.dayHeadline}>{post.body}</Text>
        <View style={styles.dayHero}>
          <Text style={[styles.dayResult, { color: positive ? dash.profit : dash.loss }]}>
            {result != null ? `${result > 0 ? '+' : ''}${result}` : '—'}
            <Text style={styles.dayUnit}> bb</Text>
          </Text>
          <View style={styles.dayMetaCol}>
            <Text style={styles.dayMetaTop}>{post.sessionSummary?.stakes}</Text>
            <Text style={styles.dayMetaSub}>{post.sessionSummary?.durationLabel}</Text>
            <Text style={styles.dayMetaSub}>
              {post.sessionSummary?.handsCount ?? 0} key hands
            </Text>
          </View>
        </View>
        <ActionRow post={post} onToggleLike={onToggleLike} onOpenThread={onOpenThread} />
      </LinearGradient>
    </Pressable>
  );
}

function HandMoment({
  post,
  author,
  onOpenProfile,
  onOpenThread,
  onToggleLike,
}: PostCardProps) {
  const hand = post.hand!;
  const result = hand.resultBb;
  const resultColor =
    result == null ? dash.textSecondary : result >= 0 ? dash.profit : dash.loss;

  return (
    <Pressable onPress={() => onOpenThread(post.id)} style={styles.momentWrap}>
      <View style={styles.spine} />
      <View style={styles.handShell}>
        <AuthorLine
          author={author}
          createdAt={post.createdAt}
          label="Hand review"
          onOpenProfile={onOpenProfile}
        />
        <View style={styles.handStage}>
          <MiniCards cards={hand.holeCards} />
          <View style={styles.handInfo}>
            <Text style={styles.handPos}>{hand.heroPosition}</Text>
            {result != null ? (
              <Text style={[styles.handResult, { color: resultColor }]}>
                {result > 0 ? '+' : ''}
                {result}bb
              </Text>
            ) : null}
          </View>
        </View>
        {hand.board?.length ? (
          <Text style={styles.boardLine}>Board  {hand.board.join('   ')}</Text>
        ) : null}
        <Text style={styles.body}>{post.body}</Text>
        {hand.aiSummary ? (
          <View style={styles.aiWhisper}>
            <Text style={styles.aiLabel}>COACH NOTE</Text>
            <Text style={styles.aiText} numberOfLines={2}>
              {hand.aiSummary}
            </Text>
          </View>
        ) : null}
        <View style={styles.tags}>
          {hand.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              #{tag}
            </Text>
          ))}
        </View>
        <ActionRow post={post} onToggleLike={onToggleLike} onOpenThread={onOpenThread} />
      </View>
    </Pressable>
  );
}

function TalkMoment({
  post,
  author,
  onOpenProfile,
  onOpenThread,
  onToggleLike,
}: PostCardProps) {
  return (
    <Pressable onPress={() => onOpenThread(post.id)} style={styles.momentWrap}>
      <View style={styles.spine} />
      <View style={styles.talkShell}>
        <AuthorLine
          author={author}
          createdAt={post.createdAt}
          label="Circle talk"
          onOpenProfile={onOpenProfile}
        />
        <Text style={styles.quote}>“{post.body}”</Text>
        <ActionRow post={post} onToggleLike={onToggleLike} onOpenThread={onOpenThread} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  momentWrap: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 4,
  },
  spine: {
    width: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(168,85,247,0.35)',
    marginLeft: 8,
  },
  authorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorName: {
    color: dash.text,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  authorMeta: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 1,
  },
  dayShell: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.28)',
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  dayHeadline: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  dayHero: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  dayResult: {
    fontFamily: fonts.displayBold,
    fontSize: 52,
    letterSpacing: -2,
    lineHeight: 54,
  },
  dayUnit: {
    fontFamily: fonts.bodySemi,
    fontSize: 18,
  },
  dayMetaCol: {
    flex: 1,
    gap: 2,
    paddingBottom: 6,
  },
  dayMetaTop: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  dayMetaSub: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  handShell: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: dash.surface,
    borderWidth: 1,
    borderColor: dash.border,
    padding: 16,
    gap: 10,
  },
  handStage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(8,4,18,0.55)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.18)',
  },
  handInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  handPos: {
    color: dash.accentSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
  },
  handResult: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  boardLine: {
    color: dash.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  body: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  aiWhisper: {
    borderLeftWidth: 2,
    borderLeftColor: dash.lilac,
    paddingLeft: 10,
    gap: 2,
  },
  aiLabel: {
    color: dash.lilac,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  aiText: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    color: dash.accentSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  talkShell: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.2)',
    padding: 16,
    gap: 12,
  },
  quote: {
    color: dash.text,
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 2,
  },
  action: {
    color: dash.textMuted,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  liked: {
    color: dash.accentSoft,
  },
  discussBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: dash.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
  },
  discuss: {
    color: dash.accentSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
});
