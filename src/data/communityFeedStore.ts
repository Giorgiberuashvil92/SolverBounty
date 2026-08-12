import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CommunityPost } from '../types/community';
import type { KeyHand } from '../types/session';
import { ME_ID } from './mock/communityFeed';

const STORAGE_KEY = 'poker.community.userPosts.v1';

function parseBriefVerdict(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as { v?: number; verdict?: string };
    if (parsed?.v === 1 && typeof parsed.verdict === 'string') {
      return parsed.verdict;
    }
  } catch {
    /* legacy */
  }
  return null;
}

export function handToCommunityPost(
  hand: KeyHand & { stakesLabel?: string },
  note?: string,
): CommunityPost {
  const verdict = parseBriefVerdict(hand.aiAnalysis);
  const body =
    note?.trim() ||
    verdict ||
    (hand.aiSummary && !/\d-max/i.test(hand.aiSummary)
      ? hand.aiSummary
      : `Shared ${hand.heroPosition ?? 'hero'} ${hand.holeCards?.join(' ') ?? ''} for review.`.trim());

  return {
    id: `post_hand_${hand.id}_${Date.now()}`,
    authorId: ME_ID,
    kind: 'hand',
    createdAt: new Date().toISOString(),
    body,
    hand: {
      heroPosition: hand.heroPosition ?? '?',
      holeCards: hand.holeCards ?? [],
      board: hand.board,
      tags: hand.tags ?? [],
      resultBb: hand.resultBb,
      aiSummary: verdict ?? hand.aiSummary,
    },
    likes: 0,
    comments: [],
  };
}

export function formatHandShareText(
  hand: KeyHand & { stakesLabel?: string },
): string {
  const verdict = parseBriefVerdict(hand.aiAnalysis);
  return [
    'PokerAICoach · hand share',
    `${hand.heroPosition ?? 'Hero'} ${hand.holeCards?.join(' ') ?? ''}`.trim(),
    hand.board?.length ? `Board: ${hand.board.join(' ')}` : null,
    hand.resultBb != null
      ? `Result: ${hand.resultBb >= 0 ? '+' : ''}${hand.resultBb} bb`
      : null,
    hand.stakesLabel || hand.stakes || null,
    hand.tags?.length ? `Tags: ${hand.tags.join(', ')}` : null,
    verdict ? `Takeaway: ${verdict}` : hand.aiSummary ? `Note: ${hand.aiSummary}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function loadUserCommunityPosts(): Promise<CommunityPost[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CommunityPost[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function prependUserCommunityPost(
  post: CommunityPost,
): Promise<CommunityPost[]> {
  const prev = await loadUserCommunityPosts();
  const next = [post, ...prev].slice(0, 80);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
