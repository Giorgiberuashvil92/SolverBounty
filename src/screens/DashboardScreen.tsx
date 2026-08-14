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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BankrollCard } from '../components/dashboard/BankrollCard';
import { BankrollHistoryModal } from '../components/dashboard/BankrollHistoryModal';
import { BankrollSetupCard } from '../components/dashboard/BankrollSetupCard';
import { SessionTracker } from '../components/dashboard/SessionTracker';
import { KeyHandsList } from '../components/dashboard/KeyHandsList';
import { AICoachPanel } from '../components/dashboard/AICoachPanel';
import { DailyFocusCard } from '../components/dashboard/DailyFocusCard';
import { TodaySnapshotCard } from '../components/dashboard/TodaySnapshotCard';
import { WeeklyProgressCard } from '../components/dashboard/WeeklyProgressCard';
import { MoneyFormModal } from '../components/dashboard/MoneyFormModal';
import { StartSessionModal } from '../components/dashboard/StartSessionModal';
import { EndSessionModal } from '../components/dashboard/EndSessionModal';
import { HandLoggerModal } from '../components/dashboard/HandLoggerModal';
import { QuickHandLogModal } from '../components/dashboard/QuickHandLogModal';
import { MarkHandModal } from '../components/dashboard/MarkHandModal';
import { NeedsDetailsModal } from '../components/dashboard/NeedsDetailsModal';
import { SessionCompleteModal } from '../components/dashboard/SessionCompleteModal';
import { dashboardApi, type DrillRecommendation, type WeeklyInsights } from '../api/dashboardApi';
import { prependUserCommunityPost, sessionToCommunityPost } from '../data/communityFeedStore';
import { API_BASE } from '../api/config';
import { useAuth } from '../auth/AuthContext';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';
import type {
  DashboardSnapshot,
  PokerSession,
  KeyHand,
  PreSessionChecklist as Checklist,
} from '../types/session';

type MoneyModal =
  | { kind: 'setup' }
  | { kind: 'deposit' }
  | { kind: 'withdraw' }
  | null;

type DashboardScreenProps = {
  onOpenCoachChat?: () => void;
  onOpenCoachTab?: () => void;
  onOpenProfile?: () => void;
  onOpenReviews?: () => void;
  onOpenDrills?: (context?: { recommendation?: DrillRecommendation; sessionId?: string }) => void;
  onOpenCommunity?: () => void;
};

export function DashboardScreen({
  onOpenCoachChat,
  onOpenProfile,
  onOpenCoachTab,
  onOpenReviews,
  onOpenDrills,
  onOpenCommunity,
}: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [session, setSession] = useState<PokerSession | null>(null);
  const [checklist, setChecklist] = useState<Checklist>({
    hydration: false,
    warmup: false,
    focusLevel: 5,
  });
  const [toReviewCount, setToReviewCount] = useState(0);
  const [weeklyInsights, setWeeklyInsights] = useState<WeeklyInsights | null>(null);
  const [lastSessionPreset, setLastSessionPreset] = useState<{
    stakes: string;
    buyInCents: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [moneyModal, setMoneyModal] = useState<MoneyModal>(null);
  const [bankrollHistoryOpen, setBankrollHistoryOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [handOpen, setHandOpen] = useState(false);
  const [quickHandOpen, setQuickHandOpen] = useState(false);
  const [quickHandSaving, setQuickHandSaving] = useState(false);
  const [markHandOpen, setMarkHandOpen] = useState(false);
  const [markHandSaving, setMarkHandSaving] = useState(false);
  const [needsDetailsHand, setNeedsDetailsHand] = useState<KeyHand | null>(null);
  const [editingHand, setEditingHand] = useState<KeyHand | null>(null);
  const [completed, setCompleted] = useState<{
    session: PokerSession;
    gameQuality: 'A' | 'B' | 'C';
    tiltScore: number;
    energyLevel: number;
    recommendation: DrillRecommendation | null;
  } | null>(null);

  const applySnapshot = useCallback((data: DashboardSnapshot) => {
    setSnapshot(data);
    setSession(data.activeSession);
    if (data.activeSession?.preSession) {
      setChecklist(data.activeSession.preSession);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [data, reviews, insights] = await Promise.all([
        dashboardApi.getSnapshot(),
        dashboardApi.getReviews().catch(() => null),
        dashboardApi.getWeeklyInsights().catch(() => null),
      ]);
      applySnapshot(data);
      setToReviewCount(reviews?.toReview?.length ?? 0);
      setWeeklyInsights(insights);
      const mostRecent = reviews?.sessions.find((current) => current.status === 'ended');
      setLastSessionPreset(
        mostRecent
          ? { stakes: mostRecent.stakesLabel, buyInCents: mostRecent.buyInCents }
          : null,
      );
    } catch (e) {
      setError((e as Error).message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    load();
  }, [load]);

  const live = session?.status === 'live';

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(new Date()),
    [],
  );

  const withBusy = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const bankrollReady = Boolean(snapshot?.bankrollInitialized && snapshot.bankroll);
  const lastSession = useMemo(() => {
    const ended = (snapshot?.todaysSessions ?? [])
      .filter((current) => current.status === 'ended')
      .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''));
    return ended[0] ?? null;
  }, [snapshot?.todaysSessions]);

  const sessionPreset = useMemo(() => {
    if (lastSessionPreset) {
      return lastSessionPreset;
    }
    switch (user?.profile?.stakesBand) {
      case 'high':
        return { stakes: 'NL200', buyInCents: 20_000 };
      case 'mid':
        return { stakes: 'NL100', buyInCents: 10_000 };
      case 'micro':
        return { stakes: 'NL25', buyInCents: 2_500 };
      default:
        return { stakes: 'NL50', buyInCents: 5_000 };
    }
  }, [lastSessionPreset, user?.profile?.stakesBand]);

  const sessionFormatLabel = useMemo(() => {
    const format =
      user?.profile?.venueFocus === 'live'
        ? 'Live'
        : user?.profile?.primaryGame === 'mtt'
          ? 'MTT'
          : 'Cash';
    return `${format} · ${sessionPreset.stakes}`;
  }, [sessionPreset.stakes, user?.profile?.primaryGame, user?.profile?.venueFocus]);

  const moneyCopy =
    moneyModal?.kind === 'setup'
      ? {
          title: 'Enter bankroll',
          subtitle: 'Your current effective roll — you can adjust with deposits later.',
          confirmLabel: 'Save bankroll',
          defaultDollars: '',
          quickAmounts: [500, 1000, 2500, 5000],
        }
      : moneyModal?.kind === 'deposit'
        ? {
            title: 'Deposit',
            subtitle: 'Add funds to your bankroll.',
            confirmLabel: 'Deposit',
            defaultDollars: '100',
            quickAmounts: [50, 100, 200, 500],
          }
        : {
            title: 'Withdraw',
            subtitle: 'Move cash out of the roll.',
            confirmLabel: 'Withdraw',
            defaultDollars: '50',
            quickAmounts: [50, 100, 200, 500],
          };

  const onMoneyConfirm = (cents: number) => {
    const kind = moneyModal?.kind;
    setMoneyModal(null);
    if (!kind) return;
    void withBusy(async () => {
      if (kind === 'setup') {
        applySnapshot(await dashboardApi.setupBankroll(cents));
        return;
      }
      if (kind === 'deposit') {
        applySnapshot(await dashboardApi.deposit(cents));
        return;
      }
      if (kind === 'withdraw') {
        applySnapshot(await dashboardApi.withdraw(cents));
      }
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={dash.ops} />
        <Text style={styles.centerText}>Loading dashboard…</Text>
      </View>
    );
  }

  if (error || !snapshot) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>API offline</Text>
        <Text style={styles.centerText}>{error}</Text>
        <Text style={styles.hint}>{API_BASE}</Text>
        <Pressable
          onPress={() => {
            setLoading(true);
            void load();
          }}
          style={styles.retry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: 10 }]}
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
        >
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{todayLabel.toUpperCase()}</Text>
            <Text style={styles.title}>Today</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={18} color={dash.brandSoft} />
              <Text style={styles.streakText}>{snapshot.streakDays} day</Text>
            </View>
            {onOpenProfile ? (
              <Pressable onPress={onOpenProfile} hitSlop={8} style={styles.profileButton}>
                <Ionicons name="person-outline" size={25} color={dash.brandSoft} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {!bankrollReady || !snapshot.bankroll ? (
          <BankrollSetupCard onSetup={() => setMoneyModal({ kind: 'setup' })} />
        ) : (
          <>
            <DailyFocusCard
              goal={user?.profile?.goal}
              stakesLabel={sessionPreset.stakes}
              onOpenReviews={onOpenReviews}
              onOpenDrills={onOpenDrills}
              onOpenCoach={onOpenCoachChat ?? onOpenCoachTab}
            />

            <SessionTracker
              session={session?.status === 'ended' ? null : session}
              onStart={() => setStartOpen(true)}
              onEnd={() => {
                if (!session) return;
                setEndOpen(true);
              }}
              onMarkHand={() => {
                if (!session || session.status !== 'live') return;
                setMarkHandOpen(true);
              }}
              onLogHand={() => {
                if (!session || session.status !== 'live') return;
                setQuickHandOpen(true);
              }}
              suggestedFormatLabel={sessionFormatLabel}
              suggestedBuyInCents={sessionPreset.buyInCents}
            />

            <MarkHandModal
              visible={markHandOpen}
              stakesLabel={session?.stakesLabel}
              saving={markHandSaving}
              onCancel={() => setMarkHandOpen(false)}
              onSave={({ note, street }) => {
                if (!session || markHandSaving) return;
                setMarkHandSaving(true);
                void dashboardApi.addKeyHand(session.id, {
                  source: 'manual',
                  tags: ['needs_details', street],
                  stakes: session.stakesLabel,
                  aiSummary: note,
                  rawInput: note,
                }).then((hand) => {
                  setSession((current) => current?.id === session.id
                    ? { ...current, keyHands: [hand, ...current.keyHands] }
                    : current);
                  setToReviewCount((count) => count + 1);
                  setMarkHandOpen(false);
                }).catch((error) => {
                  Alert.alert('Mark hand', (error as Error).message || 'Could not mark this hand.');
                }).finally(() => {
                  setMarkHandSaving(false);
                });
              }}
            />

            <TodaySnapshotCard
              toReviewCount={toReviewCount}
              lastSession={lastSession}
              onOpenReviews={onOpenReviews}
            />

            {weeklyInsights ? (
              <WeeklyProgressCard
                insights={weeklyInsights}
                onOpenReviews={onOpenReviews}
                onOpenDrills={() => onOpenDrills?.()}
              />
            ) : null}

            {live ? (
              <KeyHandsList
                hands={session?.keyHands ?? []}
                onAdd={() => setQuickHandOpen(true)}
                onOpen={(hand) => {
                  if (!session) return;
                  const readyForAnalysis = Boolean(
                    !hand.tags.includes('needs_details') &&
                    hand.heroPosition &&
                    hand.holeCards?.length === 2 &&
                    hand.actions?.length,
                  );
                  if (!readyForAnalysis) {
                    setNeedsDetailsHand(hand);
                    return;
                  }
                  void withBusy(async () => {
                    const analyzed = await dashboardApi.analyzeKeyHand(session.id, hand.id);
                    setSession({
                      ...session,
                      keyHands: session.keyHands.map((current) =>
                        current.id === analyzed.id ? analyzed : current,
                      ),
                    });
                    Alert.alert(
                      analyzed.holeCards?.join(' ') ?? 'AI analysis',
                      analyzed.aiAnalysis ?? analyzed.aiSummary ?? 'Done',
                    );
                  });
                }}
              />
            ) : null}

            <BankrollCard
              bankroll={snapshot.bankroll}
              todaysProfitCents={snapshot.todaysProfitCents}
              onDeposit={() => setMoneyModal({ kind: 'deposit' })}
              onWithdraw={() => setMoneyModal({ kind: 'withdraw' })}
              onOpenHistory={() => setBankrollHistoryOpen(true)}
            />

            <AICoachPanel
              mode={live ? 'live' : toReviewCount > 0 ? 'review' : 'plan'}
              onOpenChat={onOpenCoachChat ?? onOpenCoachTab}
            />
          </>
        )}
        </ScrollView>
      </SafeAreaView>

      <MoneyFormModal
        visible={moneyModal != null}
        title={moneyCopy.title}
        subtitle={moneyCopy.subtitle}
        confirmLabel={moneyCopy.confirmLabel}
        defaultDollars={moneyCopy.defaultDollars}
        quickAmounts={moneyCopy.quickAmounts}
        onCancel={() => setMoneyModal(null)}
        onConfirm={onMoneyConfirm}
      />

      <BankrollHistoryModal
        visible={bankrollHistoryOpen}
        bankroll={snapshot.bankroll}
        onClose={() => setBankrollHistoryOpen(false)}
      />

      <StartSessionModal
        visible={startOpen}
        initialChecklist={checklist}
        initialStakes={sessionPreset.stakes}
        initialBuyInCents={sessionPreset.buyInCents}
        initialVenue={user?.profile?.venueFocus === 'live' ? 'live' : 'online'}
        initialGameType={user?.profile?.primaryGame === 'mtt' ? 'mtt' : 'cash'}
        bankrollCents={snapshot?.bankroll?.currentCents}
        onCancel={() => setStartOpen(false)}
        onConfirm={(input) => {
          setStartOpen(false);
          setChecklist(input.preSession);
          void withBusy(async () => {
            const started = await dashboardApi.startSession(input);
            setSession(started);
            await load();
          });
        }}
      />

      <EndSessionModal
        visible={endOpen}
        session={session}
        onCancel={() => setEndOpen(false)}
        onConfirm={({ cashOutCents, tiltScore, energyLevel, gameQuality }) => {
          if (!session) return;
          setEndOpen(false);
          void withBusy(async () => {
            await dashboardApi.updateMental(session.id, {
              tiltScore,
              energyLevel,
              gameQuality,
            });
            const ended = await dashboardApi.endSession(session.id, cashOutCents);
            const fallbackRecommendation: DrillRecommendation = {
              packId: 'open',
              title: 'Your next drill',
              reason: ended.keyHands.length ? `Built from ${ended.keyHands.length} hands you logged this session.` : 'A focused preflop refresh for your next session.',
              difficulty: gameQuality === 'A' ? 'advanced' : gameQuality === 'C' ? 'foundation' : 'standard',
              source: 'rules',
            };
            setCompleted({ session: ended, gameQuality, tiltScore, energyLevel, recommendation: fallbackRecommendation });
            void dashboardApi.recommendDrill(ended.id).then((recommendation) => {
              setCompleted((current) => current?.session.id === ended.id ? { ...current, recommendation } : current);
            }).catch(() => undefined);
            await load();
          });
        }}
      />

      <SessionCompleteModal
        visible={completed != null}
        session={completed?.session ?? null}
        gameQuality={completed?.gameQuality ?? 'A'}
        tiltScore={completed?.tiltScore ?? 2}
        energyLevel={completed?.energyLevel ?? 6}
        recommendation={completed?.recommendation}
        onClose={() => setCompleted(null)}
        onOpenReviews={() => onOpenReviews?.()}
        onOpenDrills={() => onOpenDrills?.(completed ? { recommendation: completed.recommendation ?? undefined, sessionId: completed.session.id } : undefined)}
        onShareCommunity={() => {
          if (!completed) {
            onOpenCommunity?.();
            return;
          }
          void (async () => {
            await prependUserCommunityPost(sessionToCommunityPost(completed.session, completed.gameQuality));
            onOpenCommunity?.();
          })();
        }}
      />

      <HandLoggerModal
        visible={handOpen}
        stakesLabel={session?.stakesLabel}
        initialNote={editingHand?.rawInput ?? editingHand?.aiSummary}
        onCancel={() => setHandOpen(false)}
        onConfirm={(input) => {
          if (!session) return;
          setHandOpen(false);
          void withBusy(async () => {
            const handInput = {
              ...input,
              source: input.source === 'voice' ? ('voice' as const) : ('manual' as const),
              stakes: input.stakes ?? session.stakesLabel,
            };
            const hand = editingHand
              ? await dashboardApi.updateKeyHand(session.id, editingHand.id, handInput)
              : await dashboardApi.addKeyHand(session.id, handInput);
            setSession({
              ...session,
              keyHands: editingHand
                ? session.keyHands.map((item) => item.id === hand.id ? hand : item)
                : [hand, ...session.keyHands],
            });
            setEditingHand(null);
            Alert.alert('Hand logged', 'Open Reviews to study this spot.', [
              { text: 'Stay', style: 'cancel' },
              { text: 'Open Reviews', onPress: () => onOpenReviews?.() },
            ]);
          });
        }}
      />

      <NeedsDetailsModal
        visible={needsDetailsHand != null}
        onClose={() => setNeedsDetailsHand(null)}
        onFill={() => {
          setEditingHand(needsDetailsHand);
          setNeedsDetailsHand(null);
          setHandOpen(true);
        }}
      />

      <QuickHandLogModal
        visible={quickHandOpen}
        stakesLabel={session?.stakesLabel}
        saving={quickHandSaving}
        onCancel={() => setQuickHandOpen(false)}
        onOpenDetailed={() => {
          setQuickHandOpen(false);
          setHandOpen(true);
        }}
        onSave={({ rawInput, tags, parsed }) => {
          if (!session || quickHandSaving) return;
          setQuickHandSaving(true);
          const parsedPotType = parsed?.hand.potType;
          const potType = parsedPotType && ['srp', '3bet', '4bet', '5bet', '6bet', 'iso', 'limped'].includes(parsedPotType)
            ? parsedPotType as 'srp' | '3bet' | '4bet' | '5bet' | '6bet' | 'iso' | 'limped'
            : undefined;
          void dashboardApi.addKeyHand(session.id, {
            source: parsed ? 'voice' : 'manual',
            tags: [...new Set(['needs_details', ...tags])],
            rawInput,
            aiSummary: parsed?.hand.summary ?? rawInput,
            stakes: session.stakesLabel,
            heroPosition: parsed?.hand.heroPosition ?? undefined,
            villainPositions: parsed?.hand.villainPositions,
            holeCards: parsed?.hand.heroHoleCards,
            board: parsed?.hand.board,
            resultBb: parsed?.hand.resultBb ?? undefined,
            potType,
          }).then((hand) => {
            setSession((current) => current?.id === session.id
              ? { ...current, keyHands: [hand, ...current.keyHands] }
              : current);
            setQuickHandOpen(false);
            setToReviewCount((count) => count + 1);
          }).catch((error) => {
            Alert.alert('Quick log', (error as Error).message || 'Could not save this hand.');
          }).finally(() => {
            setQuickHandSaving(false);
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  centerText: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
  errorTitle: {
    color: dash.loss,
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  hint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  retry: {
    marginTop: 8,
    backgroundColor: dash.ops,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
  },
  content: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 2,
  },
  kicker: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 38,
    marginTop: 3,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(155,107,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(155,107,255,0.35)',
  },
  streakText: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  profileButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(196,164,255,0.3)',
  },
});
