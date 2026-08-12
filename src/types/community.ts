export type UserStatus = 'online' | 'in_session' | 'studying' | 'offline';

export type CommunityUser = {
  id: string;
  displayName: string;
  handle: string;
  initials: string;
  tone: string;
  bio: string;
  stakes: string;
  format: 'cash' | 'mtt' | 'spins' | 'mixed';
  status: UserStatus;
  streakDays: number;
  handsShared: number;
  followers: number;
  following: number;
};

export type PostKind = 'day_share' | 'hand' | 'discussion';

export type CommunityComment = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  kind: PostKind;
  createdAt: string;
  body: string;
  dayLabel?: string;
  sessionSummary?: {
    stakes: string;
    durationLabel: string;
    resultBb?: number;
    handsCount: number;
  };
  /** For hand posts */
  hand?: {
    heroPosition: string;
    holeCards: string[];
    board?: string[];
    tags: string[];
    resultBb?: number;
    aiSummary?: string;
  };
  likes: number;
  comments: CommunityComment[];
  likedByMe?: boolean;
};
