import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MiniCards } from '../community/MiniCards';
import {
  handToCommunityPost,
  prependUserCommunityPost,
} from '../../data/communityFeedStore';
import { getUser, ME_ID } from '../../data/mock/communityFeed';
import { dash } from '../../theme/dashboard';
import {
  FELT_THEMES,
  getFeltTheme,
  loadFeltThemeId,
  saveFeltThemeId,
  type FeltThemeId,
} from '../../theme/felt';
import { fonts } from '../../theme/typography';
import type { KeyHand } from '../../types/session';

type HandDetailModalProps = {
  visible: boolean;
  hand: (KeyHand & { stakesLabel?: string }) | null;
  busy?: boolean;
  onClose: () => void;
  onAnalyze?: () => void;
  onMarkReviewed?: () => void;
  /** After posting to the in-app Community feed */
  onSharedToCommunity?: () => void;
};

type HandAiBrief = {
  v: 1;
  verdict: string;
  severity: 'ok' | 'soft' | 'leak' | 'study';
  keyMistake: string | null;
  betterLine: string;
  why: string;
  drill: string;
  focusStreet: 'preflop' | 'flop' | 'turn' | 'river' | null;
  source?: 'llm' | 'heuristic';
};

const SUITS: Record<string, { glyph: string; color: string }> = {
  s: { glyph: '♠', color: '#111827' },
  h: { glyph: '♥', color: '#B91C1C' },
  d: { glyph: '♦', color: '#1D4ED8' },
  c: { glyph: '♣', color: '#166534' },
};

const POS_LABEL: Record<string, string> = {
  UTG: 'Under the gun',
  'UTG+1': 'UTG+1',
  LJ: 'Lojack',
  HJ: 'Hijack',
  CO: 'Cutoff',
  BTN: 'Button',
  SB: 'Small blind',
  BB: 'Big blind',
  MP: 'Middle',
};

const TAG_TONE: Record<string, { bg: string; border: string; text: string }> = {
  missed_value: {
    bg: 'rgba(251,191,36,0.16)',
    border: 'rgba(251,191,36,0.45)',
    text: '#FBBF24',
  },
  value: {
    bg: 'rgba(46,230,106,0.14)',
    border: 'rgba(46,230,106,0.4)',
    text: '#2EE66A',
  },
  bluff: {
    bg: 'rgba(77,163,255,0.16)',
    border: 'rgba(77,163,255,0.45)',
    text: '#8FC4FF',
  },
  bad_fold: {
    bg: 'rgba(255,77,94,0.14)',
    border: 'rgba(255,77,94,0.4)',
    text: '#FF8A96',
  },
  cooler: {
    bg: 'rgba(196,164,255,0.14)',
    border: 'rgba(196,164,255,0.4)',
    text: '#C4A4FF',
  },
  tilt: {
    bg: 'rgba(255,77,94,0.16)',
    border: 'rgba(255,77,94,0.45)',
    text: '#FF4D5E',
  },
  study: {
    bg: 'rgba(77,163,255,0.14)',
    border: 'rgba(77,163,255,0.4)',
    text: '#8FC4FF',
  },
};

function actionTone(action: string, isMe: boolean) {
  if (isMe) {
    return {
      bg: 'rgba(46,230,106,0.16)',
      border: 'rgba(46,230,106,0.45)',
      text: '#A7F3C4',
      verb: '#2EE66A',
    };
  }
  if (action === 'fold') {
    return {
      bg: 'rgba(255,255,255,0.04)',
      border: 'rgba(255,255,255,0.1)',
      text: 'rgba(255,255,255,0.45)',
      verb: 'rgba(255,255,255,0.4)',
    };
  }
  if (action === 'raise' || action === 'allin' || action === 'bet') {
    return {
      bg: 'rgba(255,77,94,0.14)',
      border: 'rgba(255,77,94,0.4)',
      text: '#FFB0B8',
      verb: '#FF4D5E',
    };
  }
  return {
    bg: 'rgba(77,163,255,0.14)',
    border: 'rgba(77,163,255,0.4)',
    text: '#B8D9FF',
    verb: '#4DA3FF',
  };
}

function parseBrief(raw?: string | null): HandAiBrief | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<HandAiBrief>;
    if (parsed && typeof parsed.verdict === 'string' && parsed.v === 1) {
      return {
        v: 1,
        verdict: parsed.verdict,
        severity: parsed.severity ?? 'study',
        keyMistake: parsed.keyMistake ?? null,
        betterLine: parsed.betterLine ?? '',
        why: parsed.why ?? '',
        drill: parsed.drill ?? '',
        focusStreet: parsed.focusStreet ?? null,
        source: parsed.source,
      };
    }
  } catch {
    /* legacy */
  }
  return null;
}

/** Pull the useful line out of old wall-of-text analyses. */
function legacyTakeaway(raw: string): string {
  const focus = raw.match(/Coach focus:\s*(.+)/i)?.[1]?.trim();
  if (focus) return focus;
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter(
      (l) =>
        !/^Spot:/i.test(l) &&
        !/^Board:/i.test(l) &&
        !/^Tags:/i.test(l) &&
        !/^Note:/i.test(l) &&
        !/^Next study:/i.test(l),
    );
  return lines[0] ?? raw.split('\n')[0] ?? raw;
}

function looksLikeMetaSummary(text?: string) {
  if (!text) return true;
  return (
    /\d-max/i.test(text) ||
    /Hero\s+\w+/i.test(text) ||
    (text.includes(' · ') && text.length < 160)
  );
}

function cardParts(code: string) {
  const suit = code.slice(-1).toLowerCase();
  const rank = code.slice(0, -1).toUpperCase() || '?';
  const meta = SUITS[suit] ?? { glyph: '?', color: '#111827' };
  return { rank, ...meta };
}

export function HandDetailModal({
  visible,
  hand,
  busy,
  onClose,
  onAnalyze,
  onMarkReviewed,
  onSharedToCommunity,
}: HandDetailModalProps) {
  const [feltId, setFeltId] = useState<FeltThemeId>('green');
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBody, setShareBody] = useState('');

  useEffect(() => {
    if (!visible) return;
    void loadFeltThemeId().then(setFeltId);
    setSharing(false);
    setShared(false);
    setShareOpen(false);
    setShareBody('');
  }, [visible]);

  if (!hand) return null;
  const felt = getFeltTheme(feltId);
  const reviewed = hand.reviewStatus === 'reviewed';
  const brief = parseBrief(hand.aiAnalysis);
  const legacyLine =
    !brief && hand.aiAnalysis ? legacyTakeaway(hand.aiAnalysis) : null;
  const showNote = hand.aiSummary && !looksLikeMetaSummary(hand.aiSummary);

  const seat = hand.heroPosition ?? '';
  const seatLong = POS_LABEL[seat] ?? (seat || 'Hero');
  const result =
    hand.resultBb == null
      ? null
      : `${hand.resultBb >= 0 ? '+' : ''}${hand.resultBb}`;
  const resultTone =
    hand.resultBb == null ? 'flat' : hand.resultBb > 0 ? 'up' : hand.resultBb < 0 ? 'down' : 'flat';

  const subtitle = [
    hand.stakesLabel ?? hand.stakes ?? null,
    hand.potType ? hand.potType.toUpperCase() : null,
    hand.tableSize ? `${hand.tableSize}-max` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const primary =
    (hand.tags ?? []).find((t) =>
      ['missed_value', 'bad_fold', 'bluff', 'value', 'cooler', 'tilt', 'study'].includes(t),
    ) ?? null;

  const pickFelt = (id: FeltThemeId) => {
    setFeltId(id);
    void saveFeltThemeId(id);
  };

  const me = getUser(ME_ID);
  const previewResult = hand.resultBb;
  const previewResultColor =
    previewResult == null
      ? dash.textSecondary
      : previewResult >= 0
        ? dash.profit
        : dash.loss;

  const openSharePreview = () => {
    if (shared) {
      setShareOpen(true);
      return;
    }
    const draft = handToCommunityPost(hand).body;
    setShareBody(draft);
    setShareOpen(true);
  };

  const shareToCommunity = async () => {
    if (!hand || sharing || shared) return;
    const body = shareBody.trim();
    if (!body) {
      Alert.alert('Share', 'Write a short note for the post.');
      return;
    }
    setSharing(true);
    try {
      await prependUserCommunityPost(handToCommunityPost(hand, body));
      setShared(true);
    } catch (e) {
      Alert.alert('Share', (e as Error).message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>Second look</Text>
              <View style={styles.titleRow}>
                <View style={styles.mePill}>
                  <Text style={styles.mePillText}>Me</Text>
                </View>
                <Text style={styles.title}>{seatLong}</Text>
              </View>
              {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
            </View>
            <View style={styles.headRight}>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
              <Pressable
                onPress={openSharePreview}
                hitSlop={8}
                style={[styles.shareBtn, shareOpen && styles.shareBtnOn]}
              >
                <Text style={[styles.shareBtnText, shareOpen && styles.shareBtnTextOn]}>
                  {shared ? 'Shared ✓' : 'Share'}
                </Text>
              </Pressable>
            </View>
          </View>

          {shareOpen ? (
            <View style={styles.communityPreview}>
              <View style={styles.previewTop}>
                <Text style={styles.previewEyebrow}>Community preview</Text>
                {shared ? (
                  <Pressable
                    onPress={() => {
                      onClose();
                      onSharedToCommunity?.();
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.previewLive}>Live · open →</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => setShareOpen(false)} hitSlop={8}>
                    <Text style={styles.previewHint}>Hide</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.previewCard}>
                <View style={styles.previewAuthor}>
                  <View
                    style={[styles.previewAvatar, { backgroundColor: me?.tone ?? dash.brand }]}
                  >
                    <Text style={styles.previewAvatarText}>{me?.initials ?? 'Me'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewName}>{me?.displayName ?? 'You'}</Text>
                    <Text style={styles.previewMeta}>Hand review · just now</Text>
                  </View>
                </View>

                <View style={styles.previewStage}>
                  <MiniCards cards={hand.holeCards?.length ? hand.holeCards : ['?', '?']} />
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewPos}>
                      Me · {hand.heroPosition ?? '?'}
                    </Text>
                    {previewResult != null ? (
                      <Text style={[styles.previewResult, { color: previewResultColor }]}>
                        {previewResult > 0 ? '+' : ''}
                        {previewResult}bb
                      </Text>
                    ) : null}
                  </View>
                </View>

                {hand.board?.length ? (
                  <Text style={styles.previewBoard}>
                    Board  {hand.board.join('   ')}
                  </Text>
                ) : null}

                <Text style={styles.editLabel}>Your text</Text>
                <TextInput
                  value={shareBody}
                  onChangeText={setShareBody}
                  editable={!shared}
                  multiline
                  placeholder="What should the table see?"
                  placeholderTextColor={dash.textMuted}
                  style={[styles.previewInput, shared && styles.previewInputLocked]}
                />

                {hand.tags?.length ? (
                  <View style={styles.previewTags}>
                    {hand.tags.slice(0, 3).map((tag) => (
                      <Text key={tag} style={styles.previewTag}>
                        #{tag}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <Pressable
                  disabled={sharing || shared || !shareBody.trim()}
                  onPress={() => void shareToCommunity()}
                  style={[
                    styles.postBtn,
                    shared && styles.postBtnDone,
                    (sharing || shared || !shareBody.trim()) && styles.disabled,
                  ]}
                >
                  {sharing ? (
                    <ActivityIndicator color={dash.ctaText} />
                  ) : (
                    <Text style={[styles.postBtnText, shared && styles.postBtnTextDone]}>
                      {shared ? 'Posted to Community ✓' : 'Post this to Community'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <View style={[styles.feltWrap, { borderColor: felt.border }]}>
              <LinearGradient
                colors={felt.colors}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.felt}
              >
                <View style={styles.feltTop}>
                  <View style={styles.feltSwatches}>
                    {FELT_THEMES.map((t) => {
                      const on = t.id === feltId;
                      return (
                        <Pressable
                          key={t.id}
                          onPress={() => pickFelt(t.id)}
                          hitSlop={6}
                          style={[
                            styles.feltSwatch,
                            { backgroundColor: t.swatch },
                            on && styles.feltSwatchOn,
                          ]}
                          accessibilityLabel={`Felt ${t.label}`}
                        />
                      );
                    })}
                  </View>
                  <View
                    style={[
                      styles.resultBadge,
                      resultTone === 'up' && styles.resultBadgeUp,
                      resultTone === 'down' && styles.resultBadgeDown,
                    ]}
                  >
                    {result != null ? (
                      <>
                        <Text
                          style={[
                            styles.resultNum,
                            resultTone === 'up' && styles.plUp,
                            resultTone === 'down' && styles.plDown,
                          ]}
                        >
                          {result}
                        </Text>
                        <Text style={styles.resultUnit}>bb</Text>
                      </>
                    ) : (
                      <Text style={styles.resultUnit}>—</Text>
                    )}
                  </View>
                </View>

                <View style={styles.cardStage}>
                  <View style={styles.holeCluster}>
                    {(hand.holeCards?.length ? hand.holeCards : ['?', '?']).map((c, i) => (
                      <PlayingCard key={`h-${i}`} code={c} tilt={i === 0 ? -6 : 6} />
                    ))}
                  </View>
                  {hand.board?.length ? (
                    <View style={styles.boardCluster}>
                      {hand.board.map((c, i) => (
                        <PlayingCard key={`b-${i}`} code={c} small />
                      ))}
                    </View>
                  ) : null}
                </View>
              </LinearGradient>
            </View>

            {hand.actions?.length ? (
              <View style={styles.actionRow}>
                {hand.actions.map((a, i) => {
                  const isMe = a.actor === hand.heroPosition;
                  const tone = actionTone(a.action, isMe);
                  return (
                    <View
                      key={`${a.actor}-${i}`}
                      style={[
                        styles.actionChip,
                        { backgroundColor: tone.bg, borderColor: tone.border },
                      ]}
                    >
                      <Text style={[styles.actionText, { color: tone.text }]}>
                        {(a.street ? `${a.street[0].toUpperCase()}·` : '') +
                          (isMe ? 'Me' : a.actor)}{' '}
                        <Text style={{ color: tone.verb, fontFamily: fonts.bodyBold }}>
                          {a.action}
                        </Text>
                        {a.sizeBb != null ? ` ${a.sizeBb}bb` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {primary ? (
              <View
                style={[
                  styles.tagPill,
                  {
                    backgroundColor: (TAG_TONE[primary] ?? TAG_TONE.study).bg,
                    borderColor: (TAG_TONE[primary] ?? TAG_TONE.study).border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagPillText,
                    { color: (TAG_TONE[primary] ?? TAG_TONE.study).text },
                  ]}
                >
                  {primary.replace(/_/g, ' ')}
                </Text>
              </View>
            ) : null}

            {showNote ? (
              <Text style={styles.note}>{hand.aiSummary}</Text>
            ) : null}

            <View style={styles.takeaway}>
              <Text style={styles.takeLabel}>Takeaway</Text>
              {brief ? (
                <>
                  <Text style={styles.takeQuote}>{brief.verdict}</Text>
                  {brief.keyMistake ? (
                    <View style={styles.missCard}>
                      <Text style={styles.missKicker}>Missed</Text>
                      <Text style={styles.missBody}>{brief.keyMistake}</Text>
                    </View>
                  ) : null}
                  {brief.betterLine ? (
                    <View style={styles.tryCard}>
                      <Text style={styles.tryKicker}>Try</Text>
                      <Text style={styles.tryBody}>{brief.betterLine}</Text>
                    </View>
                  ) : null}
                  {brief.drill ? (
                    <View style={styles.drillCard}>
                      <Text style={styles.drillKicker}>Drill</Text>
                      <Text style={styles.drill}>{brief.drill}</Text>
                    </View>
                  ) : null}
                </>
              ) : legacyLine ? (
                <>
                  <Text style={styles.takeQuote}>{legacyLine}</Text>
                  <Pressable onPress={onAnalyze} disabled={busy} hitSlop={8}>
                    <Text style={styles.refreshLink}>Refresh takeaway</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.takeEmpty}>
                    No takeaway yet. Run a quick second look when you’re ready.
                  </Text>
                  <Pressable
                    onPress={onAnalyze}
                    disabled={busy}
                    style={[styles.softBtn, busy && styles.disabled]}
                  >
                    {busy ? (
                      <ActivityIndicator color={dash.text} />
                    ) : (
                      <Text style={styles.softBtnText}>Get takeaway</Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>

          {!reviewed ? (
            <View style={styles.actions}>
              {brief || legacyLine ? (
                <Pressable
                  disabled={busy}
                  onPress={onAnalyze}
                  style={[styles.ghost, busy && styles.disabled]}
                >
                  {busy ? (
                    <ActivityIndicator color={dash.textSecondary} />
                  ) : (
                    <Text style={styles.ghostText}>Refresh</Text>
                  )}
                </Pressable>
              ) : null}
              <Pressable
                disabled={busy}
                onPress={onMarkReviewed}
                style={[styles.primary, busy && styles.disabled]}
              >
                <Text style={styles.primaryText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actions}>
              <View style={styles.doneBanner}>
                <Text style={styles.doneText}>Saved to reviewed</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function PlayingCard({
  code,
  small,
  tilt = 0,
}: {
  code: string;
  small?: boolean;
  tilt?: number;
}) {
  if (!code || code === '?') {
    return (
      <View
        style={[
          styles.card,
          small && styles.cardSm,
          styles.cardBack,
          { transform: [{ rotate: `${tilt}deg` }] },
        ]}
      />
    );
  }
  const { rank, glyph, color } = cardParts(code);
  return (
    <View
      style={[styles.card, small && styles.cardSm, { transform: [{ rotate: `${tilt}deg` }] }]}
    >
      <Text style={[styles.cardRank, small && styles.cardRankSm, { color }]}>{rank}</Text>
      <Text style={[styles.cardSuit, small && styles.cardSuitSm, { color }]}>{glyph}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 8, 16, 0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '94%',
    backgroundColor: '#0E1422',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  head: { flexDirection: 'row', gap: 12, marginBottom: 2 },
  kicker: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  mePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(46,230,106,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.5)',
  },
  mePillText: {
    color: '#2EE66A',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 32,
    letterSpacing: -0.5,
  },
  sub: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 6,
  },
  headRight: { alignItems: 'flex-end', gap: 10 },
  close: { color: dash.opsSoft, fontFamily: fonts.bodySemi, fontSize: 15 },
  shareBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(46,230,106,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.4)',
  },
  shareBtnOn: {
    backgroundColor: 'rgba(155,107,255,0.18)',
    borderColor: 'rgba(196,164,255,0.45)',
  },
  shareBtnText: {
    color: dash.cta,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  shareBtnTextOn: {
    color: dash.brandSoft,
  },
  communityPreview: {
    marginTop: 10,
    marginBottom: 4,
    gap: 8,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewEyebrow: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  previewHint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  previewLive: {
    color: dash.cta,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(196,164,255,0.28)',
    backgroundColor: 'rgba(155,107,255,0.08)',
    padding: 12,
    gap: 10,
  },
  previewAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  previewName: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  previewMeta: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 1,
  },
  previewStage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewInfo: { gap: 2 },
  previewPos: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  previewResult: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
  },
  previewBoard: {
    color: dash.textSecondary,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
  editLabel: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  previewInput: {
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    color: dash.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  previewInputLocked: {
    opacity: 0.7,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewTag: {
    color: dash.brandSoft,
    fontFamily: fonts.bodySemi,
    fontSize: 11,
  },
  postBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: dash.cta,
  },
  postBtnDone: {
    backgroundColor: 'rgba(46,230,106,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.4)',
  },
  postBtnText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  postBtnTextDone: {
    color: dash.cta,
  },
  body: { gap: 14, paddingBottom: 12, paddingTop: 8 },

  feltWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  felt: {
    paddingTop: 14,
    paddingBottom: 22,
    paddingHorizontal: 16,
    minHeight: 200,
  },
  feltTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  feltSwatches: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  feltSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  feltSwatchOn: {
    borderColor: '#fff',
    borderWidth: 2.5,
    transform: [{ scale: 1.08 }],
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  resultBadgeUp: {
    backgroundColor: 'rgba(46,230,106,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.4)',
  },
  resultBadgeDown: {
    backgroundColor: 'rgba(255,77,94,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,94,0.4)',
  },
  resultNum: {
    color: '#fff',
    fontFamily: fonts.displayBold,
    fontSize: 26,
    lineHeight: 28,
  },
  resultUnit: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    marginBottom: 2,
  },
  plUp: { color: '#2EE66A' },
  plDown: { color: '#FF4D5E' },
  cardStage: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 4,
  },
  holeCluster: {
    flexDirection: 'row',
    gap: 12,
  },
  boardCluster: {
    flexDirection: 'row',
    gap: 7,
  },
  card: {
    width: 62,
    height: 88,
    borderRadius: 11,
    backgroundColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardSm: {
    width: 42,
    height: 58,
    borderRadius: 8,
  },
  cardBack: {
    backgroundColor: '#243044',
  },
  cardRank: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
  },
  cardRankSm: { fontSize: 16 },
  cardSuit: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    marginTop: -2,
  },
  cardSuitSm: { fontSize: 14 },

  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },

  tagPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: 'capitalize',
  },

  note: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
  },

  takeaway: {
    marginTop: 2,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(77,163,255,0.25)',
    gap: 10,
  },
  takeLabel: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  takeQuote: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  missCard: {
    borderRadius: 14,
    padding: 12,
    gap: 4,
    backgroundColor: 'rgba(255,77,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,94,0.35)',
  },
  missKicker: {
    color: '#FF4D5E',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  missBody: {
    color: '#FFD0D4',
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  tryCard: {
    borderRadius: 14,
    padding: 12,
    gap: 4,
    backgroundColor: 'rgba(46,230,106,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.35)',
  },
  tryKicker: {
    color: '#2EE66A',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tryBody: {
    color: '#C8F7D8',
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  drillCard: {
    borderRadius: 14,
    padding: 12,
    gap: 4,
    backgroundColor: 'rgba(77,163,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.35)',
  },
  drillKicker: {
    color: '#8FC4FF',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  drill: {
    color: '#D6E9FF',
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  takeEmpty: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  refreshLink: {
    color: dash.opsSoft,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    marginTop: 2,
  },
  softBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(77,163,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.4)',
  },
  softBtnText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },

  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  ghost: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ghostText: { color: dash.textSecondary, fontFamily: fonts.bodyBold },
  primary: {
    flex: 1.4,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: dash.cta,
  },
  primaryText: { color: dash.ctaText, fontFamily: fonts.bodyBold, fontSize: 16 },
  disabled: { opacity: 0.5 },
  doneBanner: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  doneText: { color: dash.textSecondary, fontFamily: fonts.bodySemi },
});
