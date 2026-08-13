import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { dashboardApi, type ReviewsPayload } from '../api/dashboardApi';
import { MiniCards } from '../components/community/MiniCards';
import { HandDetailModal } from '../components/dashboard/HandDetailModal';
import { HandLoggerModal } from '../components/dashboard/HandLoggerModal';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';
import { formatSignedMoney } from '../utils/money';
import type { KeyHand, Street } from '../types/session';

type ReviewsScreenProps = {
  onOpenDaily?: () => void;
  onOpenCommunity?: () => void;
  onOpenDrills?: () => void;
};

type ReviewTab = 'queue' | 'calendar';
type ReviewHand = KeyHand & { stakesLabel?: string; sessionStartedAt?: string };
type ReviewSession = ReviewsPayload['sessions'][number];
type CalendarDay = { key: string; day: number; inMonth: boolean };

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function dateKey(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarDays(month: Date): CalendarDay[] {
  const first = monthStart(month);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      key: dateKey(day.toISOString())!,
      day: day.getDate(),
      inMonth: day.getMonth() === month.getMonth(),
    };
  });
}

function shortDuration(seconds: number): string {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function relativeTime(value: string): string {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'Now';
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';
  return `${Math.floor(hours / 24)}d ago`;
}

function handDecision(hand: ReviewHand): string {
  const lastStreet = hand.actions?.[hand.actions.length - 1]?.street;
  const streetNames: Record<Street, string> = {
    preflop: 'Preflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',
  };
  const tag = hand.tags?.[0]?.replace(/_/g, ' ');
  if (lastStreet) return `${streetNames[lastStreet]} decision`;
  if (hand.board?.length === 5) return 'River decision';
  if (hand.board?.length === 4) return 'Turn sizing';
  if (hand.board?.length) return 'Flop decision';
  return tag ? `${tag[0]?.toUpperCase()}${tag.slice(1)}` : 'Key decision';
}

function handSpot(hand: ReviewHand): string {
  const villain = hand.villainPositions?.[0];
  return [hand.stakesLabel ?? hand.stakes, hand.heroPosition && villain ? `${hand.heroPosition} vs ${villain}` : hand.potType?.toUpperCase()]
    .filter(Boolean)
    .join(' · ');
}

export function ReviewsScreen({
  onOpenDaily,
  onOpenCommunity,
  onOpenDrills,
}: ReviewsScreenProps) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [liveSession, setLiveSession] = useState<{ id: string; stakesLabel: string } | null>(null);
  const [tab, setTab] = useState<ReviewTab>('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReviewHand | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => monthStart(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date().toISOString())!);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [reviews, snapshot] = await Promise.all([
        dashboardApi.getReviews(),
        dashboardApi.getSnapshot().catch(() => null),
      ]);
      setData(reviews);
      const live = snapshot?.activeSession?.status === 'live' ? snapshot.activeSession : null;
      setLiveSession(live ? { id: live.id, stakesLabel: live.stakesLabel } : null);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sessions = data?.sessions ?? [];
  const allHands = (data?.keyHands ?? []) as ReviewHand[];
  const toReview = (data?.toReview ?? []) as ReviewHand[];

  const sessionsByDay = useMemo(() => {
    const grouped = new Map<string, ReviewSession[]>();
    sessions.forEach((session) => {
      const key = dateKey(session.startedAt ?? session.endedAt);
      if (!key) return;
      grouped.set(key, [...(grouped.get(key) ?? []), session]);
    });
    return grouped;
  }, [sessions]);

  const handsByDay = useMemo(() => {
    const grouped = new Map<string, ReviewHand[]>();
    allHands.forEach((hand) => {
      const key = dateKey(hand.sessionStartedAt ?? hand.createdAt);
      if (!key) return;
      grouped.set(key, [...(grouped.get(key) ?? []), hand]);
    });
    return grouped;
  }, [allHands]);

  const weeklyProgress = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const thisWeek = allHands.filter((hand) => new Date(hand.createdAt) >= start);
    const reviewed = thisWeek.filter((hand) => hand.reviewStatus === 'reviewed').length;
    return { reviewed, total: thisWeek.length };
  }, [allHands]);

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const dayTotals = useMemo(() => {
    const totals = new Map<string, { profit: number; pending: number; sessions: number }>();
    sessionsByDay.forEach((daySessions, key) => {
      const hands = handsByDay.get(key) ?? [];
      totals.set(key, {
        profit: daySessions.reduce((sum, session) => sum + (session.profitLossCents ?? 0), 0),
        pending: hands.filter((hand) => hand.reviewStatus !== 'reviewed').length,
        sessions: daySessions.length,
      });
    });
    return totals;
  }, [handsByDay, sessionsByDay]);

  const monthSummary = useMemo(() => {
    const monthSessions = sessions.filter((session) => {
      const date = session.startedAt ?? session.endedAt;
      if (!date) return false;
      const parsed = new Date(date);
      return parsed.getFullYear() === calendarMonth.getFullYear() && parsed.getMonth() === calendarMonth.getMonth();
    });
    const profit = monthSessions.reduce((sum, session) => sum + (session.profitLossCents ?? 0), 0);
    return {
      profit,
      sessions: monthSessions.length,
      duration: monthSessions.reduce((sum, session) => sum + session.durationSeconds, 0),
      wins: monthSessions.filter((session) => (session.profitLossCents ?? 0) > 0).length,
      losses: monthSessions.filter((session) => (session.profitLossCents ?? 0) < 0).length,
    };
  }, [calendarMonth, sessions]);

  const selectedSessions = sessionsByDay.get(selectedDay) ?? [];
  const selectedHands = handsByDay.get(selectedDay) ?? [];

  const openLog = () => {
    if (!liveSession) {
      Alert.alert('Start a session', 'Start a live session on Today before adding a hand.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Today', onPress: () => onOpenDaily?.() },
      ]);
      return;
    }
    setLogOpen(true);
  };

  const analyze = async (sessionId: string, handId: string) => {
    setBusyId(handId);
    try {
      const updated = await dashboardApi.analyzeKeyHand(sessionId, handId);
      setSelected((current) => current?.id === handId ? { ...current, ...updated } : current);
      await load();
    } catch (requestError) {
      Alert.alert('Review', (requestError as Error).message);
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
    } catch (requestError) {
      Alert.alert('Review', (requestError as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) {
    return <LoadingState top={insets.top} />;
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
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.topControls}>
            <View style={styles.tabs}>
              <ReviewTabButton icon="clipboard-outline" label="Queue" active={tab === 'queue'} onPress={() => setTab('queue')} />
              <ReviewTabButton icon="calendar-outline" label="Calendar" active={tab === 'calendar'} onPress={() => setTab('calendar')} />
            </View>
            <Pressable
              onPress={openLog}
              accessibilityRole="button"
              accessibilityLabel="Add hand"
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={20} color={dash.ctaText} />
            </Pressable>
          </View>

          {tab === 'queue' ? (
            <QueueView
              hands={toReview}
              weeklyProgress={weeklyProgress}
              onContinue={() => toReview[0] && setSelected(toReview[0])}
              onOpenHand={setSelected}
              onOpenDrills={onOpenDrills}
            />
          ) : (
            <CalendarView
              month={calendarMonth}
              days={calendarDays}
              dayTotals={dayTotals}
              selectedDay={selectedDay}
              summary={monthSummary}
              sessions={selectedSessions}
              hands={selectedHands}
              onPrevious={() => setCalendarMonth((current) => shiftMonth(current, -1))}
              onNext={() => setCalendarMonth((current) => shiftMonth(current, 1))}
              onSelectDay={(key) => {
                setSelectedDay(key);
                setCalendarMonth(monthStart(new Date(`${key}T12:00:00`)));
              }}
              onOpenHand={setSelected}
            />
          )}
        </View>
      </SafeAreaView>

      <HandDetailModal
        visible={selected != null}
        hand={selected}
        busy={selected ? busyId === selected.id : false}
        onClose={() => setSelected(null)}
        onAnalyze={() => selected && void analyze(selected.sessionId, selected.id)}
        onMarkReviewed={() => selected && void markDone(selected.sessionId, selected.id)}
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
              setSelected({ ...hand, stakesLabel: liveSession.stakesLabel });
              await load();
            } catch (requestError) {
              Alert.alert('Add hand', (requestError as Error).message);
            }
          })();
        }}
      />
    </View>
  );
}

function QueueView({
  hands,
  weeklyProgress,
  onContinue,
  onOpenHand,
  onOpenDrills,
}: {
  hands: ReviewHand[];
  weeklyProgress: { reviewed: number; total: number };
  onContinue: () => void;
  onOpenHand: (hand: ReviewHand) => void;
  onOpenDrills?: () => void;
}) {
  const sessionCount = new Set(hands.map((hand) => hand.sessionId)).size;
  const ratio = weeklyProgress.total ? weeklyProgress.reviewed / weeklyProgress.total : 0;
  const focus = hands[0] ? handDecision(hands[0]).replace(' decision', ' decisions') : 'Review habits';

  return (
    <View style={styles.sectionStack}>
      <View style={styles.queueCard}>
        <Text style={styles.queueEyebrow}>REVIEW QUEUE</Text>
        <Text style={styles.queueTitle}>
          {hands.length ? `${hands.length} hand${hands.length === 1 ? '' : 's'} ready` : 'Queue is clear'}
        </Text>
        <View style={styles.queueMetaRow}>
          <Text style={styles.queueMeta} numberOfLines={1}>
            {hands.length ? `Last ${sessionCount || 1} session${sessionCount === 1 ? '' : 's'}` : 'Log a hand while live'}
          </Text>
          <Text style={styles.queueMeta}>{weeklyProgress.reviewed}/{weeklyProgress.total || 0} this week</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(ratio * 100, hands.length ? 8 : 0)}%` }]} />
        </View>
        {hands.length ? (
          <Pressable onPress={onContinue} style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}>
            <Text style={styles.continueButtonText}>Continue review</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.listHeading}>
        <View>
          <Text style={styles.listTitle}>NEXT HAND</Text>
          <Text style={styles.listMeta}>{hands.length ? `${hands.length} in queue` : 'All caught up'}</Text>
        </View>
      </View>

      {hands[0] ? (
        <QueueHandRow hand={hands[0]} onPress={() => onOpenHand(hands[0])} />
      ) : (
        <EmptyQueue />
      )}

      {hands.length >= 2 ? (
        <Pressable onPress={onOpenDrills} style={({ pressed }) => [styles.patternCard, pressed && styles.pressed]}>
          <View style={styles.patternIcon}>
            <Ionicons name="sparkles" size={18} color={dash.brandSoft} />
          </View>
          <View style={styles.patternCopy}>
            <Text style={styles.patternEyebrow}>DRILL READY</Text>
            <Text numberOfLines={1} style={styles.patternTitle}>{focus}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={dash.opsSoft} />
        </Pressable>
      ) : null}
    </View>
  );
}

function QueueHandRow({ hand, onPress }: { hand: ReviewHand; onPress: () => void }) {
  const tag = hand.tags?.[0]?.replace(/_/g, ' ') ?? hand.potType?.toUpperCase() ?? 'Hand review';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.queueHand, pressed && styles.pressed]}>
      <View style={styles.queueHandMain}>
        <MiniCards cards={hand.holeCards?.length ? hand.holeCards : ['?', '?']} size="sm" />
        <View style={styles.handCopy}>
          <Text style={styles.handDecision} numberOfLines={1}>{handDecision(hand)}</Text>
          <Text numberOfLines={1} style={styles.handMeta}>{handSpot(hand)} · {tag}</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={dash.opsSoft} />
      </View>
    </Pressable>
  );
}

function CalendarView({
  month,
  days,
  dayTotals,
  selectedDay,
  summary,
  sessions,
  hands,
  onPrevious,
  onNext,
  onSelectDay,
  onOpenHand,
}: {
  month: Date;
  days: CalendarDay[];
  dayTotals: Map<string, { profit: number; pending: number; sessions: number }>;
  selectedDay: string;
  summary: { profit: number; sessions: number; duration: number; wins: number; losses: number };
  sessions: ReviewSession[];
  hands: ReviewHand[];
  onPrevious: () => void;
  onNext: () => void;
  onSelectDay: (key: string) => void;
  onOpenHand: (hand: ReviewHand) => void;
}) {
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedLabel = new Date(`${selectedDay}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const selectedProfit = sessions.reduce((sum, session) => sum + (session.profitLossCents ?? 0), 0);

  return (
    <View style={styles.sectionStack}>
      <View style={styles.monthSummary}>
        <Text style={styles.monthSummaryTitle}>{monthLabel.toUpperCase()}</Text>
        <View style={styles.monthMetrics}>
          <MonthMetric label="Net" value={formatSignedMoney(summary.profit, 'USD')} tone={summary.profit} />
          <View style={styles.metricDivider} />
          <MonthMetric label="Sessions" value={String(summary.sessions)} />
          <View style={styles.metricDivider} />
          <MonthMetric label="Time" value={shortDuration(summary.duration)} />
        </View>
        <Text style={styles.monthRecord}>
          <Text style={styles.recordWin}>{summary.wins} winning</Text>
          {' · '}
          <Text style={styles.recordLoss}>{summary.losses} losing</Text>
        </Text>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Pressable onPress={onPrevious} style={styles.monthButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={21} color={dash.opsSoft} />
          </Pressable>
          <Text style={styles.calendarTitle}>{monthLabel}</Text>
          <Pressable onPress={onNext} style={styles.monthButton} hitSlop={8}>
            <Ionicons name="chevron-forward" size={21} color={dash.opsSoft} />
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {WEEK_DAYS.map((label, index) => <Text key={`${label}-${index}`} style={styles.weekDay}>{label}</Text>)}
        </View>
        <View style={styles.calendarGrid}>
          {days.map((day) => {
            const total = dayTotals.get(day.key);
            const selected = day.key === selectedDay;
            const win = (total?.profit ?? 0) > 0;
            const loss = (total?.profit ?? 0) < 0;
            return (
              <Pressable
                key={day.key}
                onPress={() => onSelectDay(day.key)}
                style={[styles.calendarDay, selected && styles.calendarDaySelected]}
              >
                <Text style={[styles.calendarDate, !day.inMonth && styles.calendarDateMuted]}>{day.day}</Text>
                {total ? <View style={[styles.dayDot, win && styles.dayDotWin, loss && styles.dayDotLoss, total.pending > 0 && styles.dayDotPending]} /> : <View style={styles.dayDotSlot} />}
                <Text style={[styles.dayResult, win && styles.plUp, loss && styles.plDown]}>
                  {total ? formatSignedMoney(total.profit, 'USD') : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.legend}>
          <Legend color={dash.profit} label="Win" />
          <Legend color={dash.loss} label="Loss" />
          <Legend color={dash.warning} label="Needs review" outlined />
        </View>
      </View>

      <Pressable
        disabled={!hands[0]}
        onPress={() => hands[0] && onOpenHand(hands[0])}
        style={({ pressed }) => [styles.dayCard, hands[0] && pressed && styles.pressed]}
      >
        <View style={styles.dayHeader}>
          <View>
            <Text style={styles.dayLabel}>{selectedLabel.toUpperCase()}</Text>
            <Text numberOfLines={1} style={styles.dayMeta}>
              {sessions.length} session{sessions.length === 1 ? '' : 's'} · {hands.length} hand{hands.length === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.dayTotalWrap}>
            {sessions.length ? <Text style={[styles.dayResultTotal, selectedProfit > 0 && styles.plUp, selectedProfit < 0 && styles.plDown]}>{formatSignedMoney(selectedProfit, 'USD')}</Text> : null}
            {hands[0] ? <Ionicons name="chevron-forward" size={18} color={dash.opsSoft} /> : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function ReviewTabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Ionicons name={icon} size={22} color={active ? dash.opsSoft : dash.textMuted} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MonthMetric({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <View style={styles.monthMetric}>
      <Text style={styles.monthMetricLabel}>{label}</Text>
      <Text
        style={[
          styles.monthMetricValue,
          tone != null && tone > 0 ? styles.plUp : null,
          tone != null && tone < 0 ? styles.plDown : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Legend({ color, label, outlined }: { color: string; label: string; outlined?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: outlined ? 'transparent' : color, borderColor: color }, outlined && styles.legendOutline]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function EmptyQueue() {
  return (
    <View style={styles.emptyQueue}>
      <Ionicons name="checkmark-circle-outline" size={25} color={dash.cta} />
      <Text style={styles.emptyQueueTitle}>Nothing waiting</Text>
      <Text style={styles.emptyQueueBody}>Your review queue is clear for now.</Text>
    </View>
  );
}

function LoadingState({ top }: { top: number }) {
  return (
    <View style={[styles.center, { paddingTop: top }]}>
      <ActivityIndicator color={dash.ops} />
      <Text style={styles.meta}>Loading reviews...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingTop: 8, paddingHorizontal: 14, paddingBottom: 6, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  topControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: dash.cta, borderRadius: 12 },
  tabs: { flex: 1, flexDirection: 'row', padding: 3, borderRadius: 13, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(20,26,44,0.88)', gap: 3 },
  tabButton: { flex: 1, minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10 },
  tabButtonActive: { backgroundColor: 'rgba(48,110,204,0.55)', borderWidth: 1, borderColor: 'rgba(77,163,255,0.4)' },
  tabText: { color: dash.textMuted, fontFamily: fonts.bodyBold, fontSize: 13 },
  tabTextActive: { color: dash.text },
  sectionStack: { gap: 10 },
  queueCard: { borderRadius: 16, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(18,32,58,0.9)', padding: 13, gap: 6 },
  queueEyebrow: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.4 },
  queueTitle: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 24 },
  queueMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  queueMeta: { flex: 1, color: dash.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 11 },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: 4, backgroundColor: 'rgba(77,163,255,0.16)' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: dash.opsSoft },
  continueButton: { alignItems: 'center', borderRadius: 10, backgroundColor: dash.ops, paddingVertical: 10, marginTop: 2 },
  continueButtonText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13 },
  listHeading: { marginTop: 1 },
  listTitle: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1 },
  listMeta: { color: dash.textMuted, fontFamily: fonts.body, fontSize: 11, marginTop: 1 },
  queueHand: { borderRadius: 13, borderWidth: 1, borderColor: dash.border, backgroundColor: 'rgba(20,26,44,0.92)', padding: 11 },
  queueHandMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  handCopy: { flex: 1, minWidth: 0, gap: 2 },
  handDecision: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 15 },
  handMeta: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 11, textTransform: 'capitalize' },
  patternCard: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(155,107,255,0.35)', backgroundColor: 'rgba(65,41,111,0.55)', padding: 10 },
  patternCopy: { flex: 1, gap: 2 },
  patternEyebrow: { color: dash.brandSoft, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.2 },
  patternTitle: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  patternIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: 'rgba(155,107,255,0.18)' },
  emptyQueue: { alignItems: 'center', borderRadius: 13, borderWidth: 1, borderColor: dash.border, backgroundColor: dash.surface, padding: 15, gap: 3 },
  emptyQueueTitle: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 15 },
  emptyQueueBody: { color: dash.textMuted, fontFamily: fonts.body, fontSize: 11 },
  monthSummary: { borderRadius: 14, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(20,26,44,0.92)', padding: 11, gap: 6 },
  monthSummaryTitle: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 12 },
  monthMetrics: { flexDirection: 'row', alignItems: 'center' },
  monthMetric: { flex: 1, alignItems: 'center', gap: 2 },
  monthMetricLabel: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 10 },
  monthMetricValue: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 18 },
  metricDivider: { width: 1, height: 31, backgroundColor: 'rgba(255,255,255,0.15)' },
  monthRecord: { textAlign: 'center', color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 11 },
  recordWin: { color: dash.profit },
  recordLoss: { color: dash.loss },
  calendarCard: { borderRadius: 14, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(20,26,44,0.92)', padding: 10, gap: 5 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.06)' },
  calendarTitle: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 18 },
  weekRow: { flexDirection: 'row' },
  weekDay: { width: '14.2857%', textAlign: 'center', color: dash.textMuted, fontFamily: fonts.bodyBold, fontSize: 9 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 },
  calendarDay: { width: '14.2857%', aspectRatio: 1.12, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  calendarDaySelected: { borderWidth: 1, borderColor: dash.ops, backgroundColor: 'rgba(77,163,255,0.13)' },
  calendarDate: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 13 },
  calendarDateMuted: { color: 'rgba(255,255,255,0.25)' },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1, backgroundColor: dash.textMuted },
  dayDotWin: { backgroundColor: dash.profit },
  dayDotLoss: { backgroundColor: dash.loss },
  dayDotPending: { borderWidth: 1.5, borderColor: dash.warning },
  dayDotSlot: { height: 6 },
  dayResult: { height: 11, color: dash.textMuted, fontFamily: fonts.bodyBold, fontSize: 8, marginTop: 0 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 13, marginTop: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1 },
  legendOutline: { borderWidth: 1.5 },
  legendText: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 10 },
  dayCard: { borderRadius: 13, borderWidth: 1, borderColor: dash.borderStrong, backgroundColor: 'rgba(20,26,44,0.92)', paddingHorizontal: 11, paddingVertical: 9 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  dayLabel: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 13 },
  dayMeta: { color: dash.textSecondary, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  dayTotalWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dayResultTotal: { color: dash.textSecondary, fontFamily: fonts.displayBold, fontSize: 18 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.13)', padding: 10 },
  sessionIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'rgba(77,163,255,0.12)' },
  sessionCopy: { flex: 1, minWidth: 0 },
  sessionName: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  sessionSub: { color: dash.textMuted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  pendingText: { color: dash.warning },
  reviewedText: { color: dash.opsSoft },
  sessionDuration: { color: dash.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 11 },
  sessionProfit: { color: dash.textSecondary, fontFamily: fonts.bodyBold, fontSize: 12 },
  openButton: { borderRadius: 8, borderWidth: 1, borderColor: dash.ops, paddingHorizontal: 9, paddingVertical: 7 },
  openButtonText: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 12 },
  dayHands: { gap: 8, marginTop: 4 },
  noSessions: { color: dash.textMuted, fontFamily: fonts.body, fontSize: 13, paddingVertical: 8 },
  plUp: { color: dash.profit },
  plDown: { color: dash.loss },
  meta: { color: dash.textMuted, fontFamily: fonts.body, fontSize: 13 },
  error: { color: dash.loss, fontFamily: fonts.body, textAlign: 'center' },
  retry: { borderRadius: 10, backgroundColor: dash.ops, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 14 },
  pressed: { opacity: 0.86 },
});
