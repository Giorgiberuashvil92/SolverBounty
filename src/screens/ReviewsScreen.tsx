import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dashboardApi, type ReviewsPayload } from '../api/dashboardApi';
import { MiniCards } from '../components/community/MiniCards';
import { HandDetailModal } from '../components/dashboard/HandDetailModal';
import { HandLoggerModal } from '../components/dashboard/HandLoggerModal';
import { TabIcon } from '../components/TabIcon';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';
import { formatDuration, formatSignedMoney } from '../utils/money';
import type { KeyHand } from '../types/session';

function takeawayLine(hand: KeyHand): string {
  if (hand.aiAnalysis) {
    try {
      const parsed = JSON.parse(hand.aiAnalysis) as { v?: number; verdict?: string };
      if (parsed?.v === 1 && parsed.verdict) return parsed.verdict;
    } catch {
      /* legacy */
    }
    const focus = hand.aiAnalysis.match(/Coach focus:\s*(.+)/i)?.[1]?.trim();
    if (focus) return focus;
  }
  const summary = hand.aiSummary?.trim();
  if (summary && !/\d-max/i.test(summary) && !/Hero\s+\w+/i.test(summary)) {
    return summary;
  }
  if (hand.board?.length) return `Board ${hand.board.join(' ')}`;
  return 'Open for full review';
}

type ReviewsScreenProps = {
  onOpenDaily?: () => void;
  onOpenCommunity?: () => void;
};

type TabKey = 'queue' | 'sessions' | 'done';
type ReviewHand = KeyHand & { stakesLabel?: string };

export function ReviewsScreen({ onOpenDaily, onOpenCommunity }: ReviewsScreenProps) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [liveSession, setLiveSession] = useState<{
    id: string;
    stakesLabel: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('queue');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReviewHand | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [bootedTab, setBootedTab] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [reviews, snap] = await Promise.all([
        dashboardApi.getReviews(),
        dashboardApi.getSnapshot().catch(() => null),
      ]);
      setData(reviews);
      const live =
        snap?.activeSession?.status === 'live' ? snap.activeSession : null;
      setLiveSession(
        live ? { id: live.id, stakesLabel: live.stakesLabel } : null,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toReview = (data?.toReview ?? []) as ReviewHand[];
  const sessions = data?.sessions ?? [];
  const allHands = (data?.keyHands ?? []) as ReviewHand[];
  const done = useMemo(
    () => allHands.filter((h) => h.reviewStatus === 'reviewed'),
    [allHands],
  );

  useEffect(() => {
    if (!data || bootedTab) return;
    if (toReview.length > 0) setTab('queue');
    else if (sessions.length > 0) setTab('sessions');
    else if (done.length > 0) setTab('done');
    setBootedTab(true);
  }, [data, bootedTab, toReview.length, sessions.length, done.length]);

  const openSession = useMemo(
    () => sessions.find((s) => s.id === openSessionId) ?? null,
    [sessions, openSessionId],
  );

  const sessionHands = useMemo(() => {
    if (!openSessionId) return [] as ReviewHand[];
    return allHands.filter((h) => h.sessionId === openSessionId);
  }, [allHands, openSessionId]);

  const stats = useMemo(() => {
    const live = sessions.filter((s) => s.status === 'live').length;
    return { queue: toReview.length, live, done: done.length };
  }, [sessions, toReview.length, done.length]);

  const openLog = () => {
    if (!liveSession) {
      Alert.alert('Start a session', 'Go to Daily and start a live session first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Daily', onPress: () => onOpenDaily?.() },
      ]);
      return;
    }
    setLogOpen(true);
  };

  const selectTab = (key: TabKey) => {
    setTab(key);
    if (key !== 'sessions') setOpenSessionId(null);
  };

  const analyze = async (sessionId: string, handId: string) => {
    setBusyId(handId);
    try {
      const updated = await dashboardApi.analyzeKeyHand(sessionId, handId);
      setSelected((prev) =>
        prev && prev.id === handId
          ? { ...prev, ...updated, stakesLabel: prev.stakesLabel }
          : prev,
      );
      await load();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const markDone = async (sessionId: string, handId: string) => {
    setBusyId(handId);
    try {
      await dashboardApi.markHandReviewed(sessionId, handId);
      setSelected(null);
      await load();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#151A32', '#0B1020']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color={dash.ops} />
        <Text style={styles.meta}>Loading reviews…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => void load()} style={styles.retry}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#171D36', '#0B1020', '#080C18']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orb} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: 36,
          paddingHorizontal: 16,
          gap: 14,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={dash.ops}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>HAND LAB</Text>
            <Text style={styles.title}>Reviews</Text>
            <Text style={styles.body}>
              Spots from the table — queue, study, mark done.
            </Text>
          </View>
          <Pressable
            onPress={openLog}
            style={({ pressed }) => [styles.logBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.logBtnText}>+ Log</Text>
          </Pressable>
        </View>

        {liveSession ? (
          <LinearGradient
            colors={['rgba(46,230,106,0.18)', 'rgba(20,26,44,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.liveBanner}
          >
            <View style={styles.liveDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.liveEyebrow}>LIVE SESSION</Text>
              <Text style={styles.liveTitle}>{liveSession.stakesLabel}</Text>
            </View>
            <Pressable onPress={openLog} style={styles.liveCta}>
              <Text style={styles.liveCtaText}>Log</Text>
            </Pressable>
          </LinearGradient>
        ) : (
          <Pressable
            onPress={onOpenDaily}
            style={({ pressed }) => [styles.idleBanner, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.idleTitle}>No live session</Text>
            <Text style={styles.idleBody}>Start on Daily to log hands into the queue.</Text>
            <Text style={styles.idleLink}>Open Daily →</Text>
          </Pressable>
        )}

        <View style={styles.stats}>
          <Stat
            label="Queue"
            value={String(stats.queue)}
            highlight={stats.queue > 0}
            tone="mint"
          />
          <Stat label="Live" value={String(stats.live)} tone="sky" />
          <Stat label="Done" value={String(stats.done)} tone="lilac" />
        </View>

        <View style={styles.segmentTrack}>
          {(
            [
              { key: 'queue' as const, label: 'Queue', count: stats.queue },
              { key: 'sessions' as const, label: 'Sessions', count: sessions.length },
              { key: 'done' as const, label: 'Done', count: stats.done },
            ]
          ).map((t) => {
            const on = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => selectTab(t.key)}
                style={[styles.segment, on && styles.segmentOn]}
              >
                <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                  {t.label}
                </Text>
                <Text style={[styles.segmentCount, on && styles.segmentCountOn]}>
                  {t.count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'queue' ? (
          toReview.length === 0 ? (
            <EmptyState
              icon="reviews"
              title="Queue is clear"
              body="Log a key hand from a live session — seats, actions, then cards."
              cta={liveSession ? 'Log hand' : 'Go to Daily'}
              onPress={liveSession ? openLog : onOpenDaily}
            />
          ) : (
            <>
              <Text style={styles.listHint}>
                {toReview.length} spot{toReview.length === 1 ? '' : 's'} waiting for a second look
              </Text>
              {toReview.map((hand) => (
                <HandCard key={hand.id} hand={hand} onPress={() => setSelected(hand)} />
              ))}
            </>
          )
        ) : null}

        {tab === 'sessions' ? (
          sessions.length === 0 ? (
            <EmptyState
              icon="daily"
              title="No sessions yet"
              body="Start a session on Daily, then log hands into the review queue."
              cta="Start on Daily"
              onPress={onOpenDaily}
            />
          ) : openSession ? (
            <SessionFolder
              session={openSession}
              hands={sessionHands}
              isLive={openSession.status === 'live'}
              canLog={liveSession?.id === openSession.id}
              onBack={() => setOpenSessionId(null)}
              onOpenHand={(hand) => setSelected(hand)}
              onLog={openLog}
              onOpenDaily={onOpenDaily}
            />
          ) : (
            <>
              <Text style={styles.listHint}>Tap a folder to open its hands</Text>
              {sessions.map((s) => {
                const live = s.status === 'live';
                const pl = s.profitLossCents;
                const total = s.keyHandsCount || 0;
                const left = s.toReviewCount || 0;
                const cleared = total > 0 ? Math.max(0, total - left) : 0;
                const pct = total > 0 ? cleared / total : 0;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setOpenSessionId(s.id)}
                    style={({ pressed }) => [pressed && { opacity: 0.92 }]}
                  >
                    <LinearGradient
                      colors={
                        live
                          ? ['rgba(46,230,106,0.16)', 'rgba(20,26,44,0.98)']
                          : ['rgba(77,163,255,0.12)', 'rgba(20,26,44,0.98)']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.sessionCard, live && styles.sessionCardLive]}
                    >
                      <View style={styles.sessionTop}>
                        <Text style={styles.sessionTitle}>{s.stakesLabel}</Text>
                        <View
                          style={[styles.pill, live ? styles.pillLive : styles.pillEnded]}
                        >
                          <Text style={[styles.pillText, live && styles.pillTextLive]}>
                            {live ? 'LIVE' : 'ENDED'}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.pl,
                          pl != null && pl > 0 && styles.plUp,
                          pl != null && pl < 0 && styles.plDown,
                        ]}
                      >
                        {pl != null ? formatSignedMoney(pl, 'USD') : 'In progress'}
                      </Text>
                      <Text style={styles.sessionMeta}>
                        {formatDuration(s.durationSeconds)} · {total} hands
                        {left ? ` · ${left} left` : total ? ' · all reviewed' : ''}
                      </Text>
                      {total > 0 ? (
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { flex: Math.max(pct, 0.04) }]} />
                          <View style={{ flex: Math.max(1 - pct, 0.01) }} />
                        </View>
                      ) : null}
                      <Text style={styles.sessionOpen}>Open session →</Text>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </>
          )
        ) : null}

        {tab === 'done' ? (
          done.length === 0 ? (
            <EmptyState
              icon="coach"
              title="Nothing marked done"
              body="Open a hand, run AI, then mark reviewed when you have one takeaway."
            />
          ) : (
            <>
              <Text style={styles.listHint}>{done.length} reviewed</Text>
              {done.map((hand) => (
                <HandCard
                  key={hand.id}
                  hand={hand}
                  done
                  onPress={() => setSelected(hand)}
                />
              ))}
            </>
          )
        ) : null}
      </ScrollView>

      <HandDetailModal
        visible={selected != null}
        hand={selected}
        busy={selected ? busyId === selected.id : false}
        onClose={() => setSelected(null)}
        onAnalyze={() =>
          selected && void analyze(selected.sessionId, selected.id)
        }
        onMarkReviewed={() =>
          selected && void markDone(selected.sessionId, selected.id)
        }
        onSharedToCommunity={onOpenCommunity}
      />

      <HandLoggerModal
        visible={logOpen}
        stakesLabel={liveSession?.stakesLabel}
        onCancel={() => setLogOpen(false)}
        onConfirm={(input) => {
          if (!liveSession) return;
          setLogOpen(false);
          void (async () => {
            try {
              const hand = await dashboardApi.addKeyHand(liveSession.id, {
                ...input,
                source: input.source === 'voice' ? 'voice' : 'manual',
                stakes: input.stakes ?? liveSession.stakesLabel,
              });
              if (openSessionId === liveSession.id) {
                setTab('sessions');
                setOpenSessionId(liveSession.id);
              } else {
                setTab('queue');
              }
              await load();
              setSelected({ ...hand, stakesLabel: liveSession.stakesLabel });
            } catch (e) {
              Alert.alert('Error', (e as Error).message);
            }
          })();
        }}
      />
    </View>
  );
}

function SessionFolder({
  session,
  hands,
  isLive,
  canLog,
  onBack,
  onOpenHand,
  onLog,
  onOpenDaily,
}: {
  session: ReviewsPayload['sessions'][number];
  hands: ReviewHand[];
  isLive: boolean;
  canLog: boolean;
  onBack: () => void;
  onOpenHand: (hand: ReviewHand) => void;
  onLog: () => void;
  onOpenDaily?: () => void;
}) {
  const pl = session.profitLossCents;
  const openCount = hands.filter((h) => h.reviewStatus !== 'reviewed').length;
  const doneCount = hands.length - openCount;

  return (
    <View style={{ gap: 12 }}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.backRow}>
        <Text style={styles.backText}>← All sessions</Text>
      </Pressable>

      <LinearGradient
        colors={
          isLive
            ? ['rgba(46,230,106,0.18)', 'rgba(20,26,44,0.98)']
            : ['rgba(77,163,255,0.12)', 'rgba(20,26,44,0.98)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.sessionCard, isLive && styles.sessionCardLive]}
      >
        <View style={styles.sessionTop}>
          <Text style={styles.sessionTitle}>{session.stakesLabel}</Text>
          <View style={[styles.pill, isLive ? styles.pillLive : styles.pillEnded]}>
            <Text style={[styles.pillText, isLive && styles.pillTextLive]}>
              {isLive ? 'LIVE' : 'ENDED'}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.pl,
            pl != null && pl > 0 && styles.plUp,
            pl != null && pl < 0 && styles.plDown,
          ]}
        >
          {pl != null ? formatSignedMoney(pl, 'USD') : 'In progress'}
        </Text>
        <Text style={styles.sessionMeta}>
          {formatDuration(session.durationSeconds)} · {hands.length} hands
          {openCount ? ` · ${openCount} to review` : ''}
          {doneCount ? ` · ${doneCount} done` : ''}
        </Text>

        <View style={styles.sessionActions}>
          {canLog ? (
            <Pressable onPress={onLog} style={styles.sessionPrimary}>
              <Text style={styles.sessionPrimaryText}>+ Log hand</Text>
            </Pressable>
          ) : null}
          {isLive ? (
            <Pressable onPress={onOpenDaily} style={styles.sessionGhost}>
              <Text style={styles.sessionGhostText}>Open Daily</Text>
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>

      {hands.length === 0 ? (
        <EmptyState
          icon="reviews"
          title="No hands in this session"
          body={
            canLog
              ? 'Log a spot from the table — seats, actions, then cards.'
              : 'This session has no key hands yet.'
          }
          cta={canLog ? 'Log hand' : undefined}
          onPress={canLog ? onLog : undefined}
        />
      ) : (
        hands.map((hand) => (
          <HandCard
            key={hand.id}
            hand={hand}
            done={hand.reviewStatus === 'reviewed'}
            onPress={() => onOpenHand(hand)}
          />
        ))
      )}
    </View>
  );
}

function Stat({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone: 'mint' | 'sky' | 'lilac';
}) {
  const colors =
    tone === 'mint'
      ? { value: dash.cta, border: 'rgba(46,230,106,0.35)', bg: 'rgba(46,230,106,0.08)' }
      : tone === 'sky'
        ? { value: dash.opsSoft, border: 'rgba(77,163,255,0.3)', bg: 'rgba(77,163,255,0.08)' }
        : { value: dash.brandSoft, border: 'rgba(155,107,255,0.3)', bg: 'rgba(155,107,255,0.08)' };

  return (
    <View
      style={[
        styles.stat,
        highlight && { borderColor: colors.border, backgroundColor: colors.bg },
      ]}
    >
      <Text style={[styles.statValue, { color: highlight ? colors.value : dash.text }]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  body,
  cta,
  onPress,
}: {
  icon: 'reviews' | 'daily' | 'coach';
  title: string;
  body: string;
  cta?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <TabIcon name={icon} color={dash.opsSoft} size={26} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {cta && onPress ? (
        <Pressable onPress={onPress} style={styles.emptyCta}>
          <Text style={styles.emptyCtaText}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function HandCard({
  hand,
  done,
  onPress,
}: {
  hand: ReviewHand;
  done?: boolean;
  onPress: () => void;
}) {
  const meta = [
    hand.stakesLabel ?? hand.stakes,
    hand.tableSize ? `${hand.tableSize}-max` : null,
    hand.potType?.toUpperCase(),
  ]
    .filter(Boolean)
    .join(' · ');
  const tag = hand.tags?.[0];
  const takeaway = takeawayLine(hand);
  const up = (hand.resultBb ?? 0) > 0;
  const down = (hand.resultBb ?? 0) < 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.92 }]}
    >
      <LinearGradient
        colors={
          done
            ? ['rgba(26,34,56,0.95)', 'rgba(14,20,34,0.98)']
            : ['rgba(26,92,58,0.28)', 'rgba(20,26,44,0.98)', 'rgba(14,20,34,1)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.handCard, done && styles.handCardDone]}
      >
        <View style={styles.handTop}>
          <View style={styles.meChip}>
            <Text style={styles.meChipText}>Me</Text>
          </View>
          <Text style={styles.handPos}>{hand.heroPosition ?? '?'}</Text>
          <View style={{ flex: 1 }} />
          {hand.resultBb != null ? (
            <View
              style={[
                styles.resultPill,
                up && styles.resultPillUp,
                down && styles.resultPillDown,
              ]}
            >
              <Text
                style={[
                  styles.resultBb,
                  up && styles.plUp,
                  down && styles.plDown,
                ]}
              >
                {hand.resultBb >= 0 ? '+' : ''}
                {hand.resultBb} bb
              </Text>
            </View>
          ) : null}
          {done ? (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>DONE</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.handStage}>
          <MiniCards
            cards={hand.holeCards?.length ? hand.holeCards : ['?', '?']}
            size="md"
          />
          {hand.board?.length ? (
            <View style={styles.boardWrap}>
              <Text style={styles.boardLabel}>Board</Text>
              <MiniCards cards={hand.board} size="sm" />
            </View>
          ) : (
            <Text style={styles.preflopHint}>Preflop</Text>
          )}
        </View>

        {meta ? <Text style={styles.handSub}>{meta}</Text> : null}

        <View style={styles.takeawayBox}>
          <Text style={styles.takeawayLabel}>TAKEAWAY</Text>
          <Text style={styles.handBody} numberOfLines={2}>
            {takeaway}
          </Text>
        </View>

        <View style={styles.handFoot}>
          {tag ? (
            <View style={styles.tagPill}>
              <Text style={styles.tagPillText}>{tag.replace(/_/g, ' ')}</Text>
            </View>
          ) : (
            <View />
          )}
          <Text style={styles.openHint}>{done ? 'Open again →' : 'Open hand →'}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dash.bg },
  orb: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(77,163,255,0.07)',
  },
  center: {
    flex: 1,
    backgroundColor: dash.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
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
  },
  body: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 260,
    marginTop: 2,
  },
  logBtn: {
    marginTop: 6,
    backgroundColor: dash.cta,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  logBtnText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.35)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: dash.cta,
  },
  liveEyebrow: {
    color: dash.cta,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  liveTitle: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    marginTop: 1,
  },
  liveCta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: dash.cta,
  },
  liveCtaText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  idleBanner: {
    borderRadius: 16,
    padding: 14,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  idleTitle: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  idleBody: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  idleLink: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    marginTop: 4,
  },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(20,26,44,0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  statLabel: {
    color: dash.textMuted,
    fontFamily: fonts.bodySemi,
    fontSize: 11,
  },
  segmentTrack: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 11,
    gap: 1,
  },
  segmentOn: {
    backgroundColor: 'rgba(77,163,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.35)',
  },
  segmentText: {
    color: 'rgba(255,255,255,0.42)',
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
  segmentTextOn: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
  },
  segmentCount: {
    color: 'rgba(255,255,255,0.28)',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  segmentCountOn: { color: dash.opsSoft },
  listHint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: -2,
  },
  empty: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(20,26,44,0.92)',
    padding: 22,
    gap: 8,
    alignItems: 'flex-start',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(77,163,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.28)',
    marginBottom: 4,
  },
  emptyTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  emptyBody: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCta: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: dash.cta,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyCtaText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  handCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.22)',
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  handCardDone: {
    borderColor: 'rgba(255,255,255,0.1)',
    opacity: 0.95,
  },
  handTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(46,230,106,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.4)',
  },
  meChipText: {
    color: dash.cta,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  handPos: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 20,
  },
  doneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(46,230,106,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.35)',
  },
  doneBadgeText: {
    color: dash.cta,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  handStage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  boardWrap: { gap: 4, alignItems: 'flex-end' },
  boardLabel: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  preflopHint: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  handSub: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  takeawayBox: {
    borderRadius: 12,
    padding: 10,
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  takeawayLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  handBody: {
    color: dash.text,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    lineHeight: 20,
  },
  handFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(77,163,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.35)',
  },
  tagPillText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  openHint: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  resultPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  resultPillUp: {
    backgroundColor: 'rgba(46,230,106,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.35)',
  },
  resultPillDown: {
    backgroundColor: 'rgba(255,77,94,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,94,0.35)',
  },
  resultBb: { fontFamily: fonts.bodyBold, fontSize: 13, color: dash.text },
  sessionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    gap: 8,
    overflow: 'hidden',
  },
  sessionCardLive: {
    borderColor: 'rgba(46,230,106,0.4)',
  },
  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  sessionOpen: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    marginTop: 2,
  },
  progressTrack: {
    height: 5,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 2,
  },
  progressFill: {
    backgroundColor: dash.cta,
    borderRadius: 4,
  },
  backRow: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  backText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  sessionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  sessionPrimary: {
    backgroundColor: dash.cta,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sessionPrimaryText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  sessionGhost: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sessionGhostText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillLive: {
    backgroundColor: 'rgba(46,230,106,0.12)',
    borderColor: 'rgba(46,230,106,0.45)',
  },
  pillEnded: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pillText: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  pillTextLive: { color: dash.cta },
  pl: {
    color: dash.textSecondary,
    fontFamily: fonts.displayBold,
    fontSize: 24,
  },
  plUp: { color: dash.profit },
  plDown: { color: dash.loss },
  sessionMeta: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  meta: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  error: { color: dash.loss, fontFamily: fonts.body, textAlign: 'center' },
  retry: {
    backgroundColor: dash.ops,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: { color: '#fff', fontFamily: fonts.bodyBold },
});
