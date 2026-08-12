import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BankrollCard } from '../components/dashboard/BankrollCard';
import { BankrollSetupCard } from '../components/dashboard/BankrollSetupCard';
import { SessionTracker } from '../components/dashboard/SessionTracker';
import { KeyHandsList } from '../components/dashboard/KeyHandsList';
import { AICoachPanel } from '../components/dashboard/AICoachPanel';
import { DailyFocusCard } from '../components/dashboard/DailyFocusCard';
import { MoneyFormModal } from '../components/dashboard/MoneyFormModal';
import { StartSessionModal } from '../components/dashboard/StartSessionModal';
import { EndSessionModal } from '../components/dashboard/EndSessionModal';
import { HandLoggerModal } from '../components/dashboard/HandLoggerModal';
import { dashboardApi } from '../api/dashboardApi';
import { API_BASE } from '../api/config';
import { useAuth } from '../auth/AuthContext';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';
import type {
  DashboardSnapshot,
  PokerSession,
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
  onOpenOnboarding?: () => void;
  onOpenReviews?: () => void;
};

export function DashboardScreen({
  onOpenCoachChat,
  onOpenOnboarding,
  onOpenCoachTab,
  onOpenReviews,
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [moneyModal, setMoneyModal] = useState<MoneyModal>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [handOpen, setHandOpen] = useState(false);
  const glow = useRef(new Animated.Value(0.3)).current;

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
      const [data, reviews] = await Promise.all([
        dashboardApi.getSnapshot(),
        dashboardApi.getReviews().catch(() => null),
      ]);
      applySnapshot(data);
      setToReviewCount(reviews?.toReview?.length ?? 0);
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

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 0.65,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.28,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const live = session?.status === 'live';

  const lastSession = useMemo(() => {
    const ended = (snapshot?.todaysSessions ?? [])
      .filter((s) => s.status === 'ended')
      .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''));
    return ended[0] ?? null;
  }, [snapshot?.todaysSessions]);

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
      <LinearGradient
        colors={['#151A32', '#0B1020', '#080C18']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.orb, { opacity: glow }]} />
      <Animated.View style={[styles.orbBrand, { opacity: glow }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
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
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>DAILY</Text>
            <Text style={styles.title}>Command center</Text>
            <Text style={styles.sub}>
              {greeting}.{' '}
              {bankrollReady
                ? live
                  ? 'Session live — log key hands.'
                  : 'Bankroll, session, hands.'
                : 'First step: enter your bankroll.'}
            </Text>
            {onOpenOnboarding ? (
              <Pressable onPress={onOpenOnboarding} hitSlop={8}>
                <Text style={styles.profileLink}>Edit player setup</Text>
              </Pressable>
            ) : null}
          </View>
          {bankrollReady ? (
            <View style={styles.streakPill}>
              <Text style={styles.streakText}>{snapshot.streakDays}d</Text>
              <Text style={styles.streakLabel}>streak</Text>
            </View>
          ) : null}
        </View>

        {!bankrollReady || !snapshot.bankroll ? (
          <BankrollSetupCard onSetup={() => setMoneyModal({ kind: 'setup' })} />
        ) : (
          <>
            <BankrollCard
              bankroll={snapshot.bankroll}
              todaysProfitCents={snapshot.todaysProfitCents}
              onDeposit={() => setMoneyModal({ kind: 'deposit' })}
              onWithdraw={() => setMoneyModal({ kind: 'withdraw' })}
            />

            <DailyFocusCard
              toReviewCount={toReviewCount}
              lastSession={lastSession}
              goal={user?.profile?.goal}
              currency={snapshot.bankroll.currency}
              onOpenReviews={onOpenReviews}
              onOpenCoach={onOpenCoachChat ?? onOpenCoachTab}
            />

            <SessionTracker
              session={session?.status === 'ended' ? null : session}
              onStart={() => setStartOpen(true)}
              onEnd={() => {
                if (!session) return;
                setEndOpen(true);
              }}
            />

            <AICoachPanel
              onVoiceLog={onOpenCoachTab}
              onOpenChat={onOpenCoachChat ?? onOpenCoachTab}
            />

            <KeyHandsList
              hands={session?.keyHands ?? []}
              onAdd={() => {
                if (!session || session.status !== 'live') {
                  Alert.alert('Start a session first');
                  return;
                }
                setHandOpen(true);
              }}
              onOpen={(hand) => {
                if (!session) return;
                void withBusy(async () => {
                  const analyzed = await dashboardApi.analyzeKeyHand(
                    session.id,
                    hand.id,
                  );
                  setSession({
                    ...session,
                    keyHands: session.keyHands.map((h) =>
                      h.id === analyzed.id ? analyzed : h,
                    ),
                  });
                  Alert.alert(
                    analyzed.holeCards?.join(' ') ?? 'AI analysis',
                    analyzed.aiAnalysis ?? analyzed.aiSummary ?? 'Done',
                  );
                });
              }}
            />
          </>
        )}
      </ScrollView>

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

      <StartSessionModal
        visible={startOpen}
        initialChecklist={checklist}
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
        buyInCents={session?.buyInCents}
        onCancel={() => setEndOpen(false)}
        onConfirm={({ cashOutCents, tiltScore, energyLevel }) => {
          if (!session) return;
          setEndOpen(false);
          void withBusy(async () => {
            await dashboardApi.updateMental(session.id, {
              tiltScore,
              energyLevel,
            });
            await dashboardApi.endSession(session.id, cashOutCents);
            await load();
          });
        }}
      />

      <HandLoggerModal
        visible={handOpen}
        stakesLabel={session?.stakesLabel}
        onCancel={() => setHandOpen(false)}
        onConfirm={(input) => {
          if (!session) return;
          setHandOpen(false);
          void withBusy(async () => {
            const hand = await dashboardApi.addKeyHand(session.id, {
              ...input,
              source: input.source === 'voice' ? 'voice' : 'manual',
              stakes: input.stakes ?? session.stakesLabel,
            });
            setSession({
              ...session,
              keyHands: [hand, ...session.keyHands],
            });
            Alert.alert('Hand logged', 'Open Reviews to study this spot.', [
              { text: 'Stay', style: 'cancel' },
              { text: 'Open Reviews', onPress: () => onOpenReviews?.() },
            ]);
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dash.bg,
  },
  center: {
    flex: 1,
    backgroundColor: dash.bg,
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
  orb: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(155, 107, 255, 0.1)',
  },
  orbBrand: {
    position: 'absolute',
    bottom: 120,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(77, 163, 255, 0.08)',
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  kicker: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 34,
    letterSpacing: -0.8,
    marginTop: 4,
  },
  sub: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 260,
  },
  profileLink: {
    marginTop: 8,
    color: dash.opsSoft,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  streakPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(155,107,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(155,107,255,0.35)',
    minWidth: 64,
    marginTop: 4,
  },
  streakText: {
    color: dash.brandSoft,
    fontFamily: fonts.displayBold,
    fontSize: 18,
  },
  streakLabel: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 10,
    letterSpacing: 0.4,
  },
});
