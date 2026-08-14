import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { arenaApi, type ArenaSeason } from '../api/arenaApi';
import { useAuth } from '../auth/AuthContext';
import { DrillLeaderboardModal } from '../components/drills/DrillLeaderboardModal';
import {
  DrillPlaySession,
  type PlayMode,
  type SessionResult,
} from '../components/drills/DrillPlaySession';
import { MiniCards } from '../components/community/MiniCards';
import { RangeTabIcon } from '../components/TabIcon';
import { accuracyPct, prizeForRank } from '../data/drillLeaderboard';
import {
  DRILL_PACKS,
  drillsForPack,
  packToneColors,
  rankedDeckForDay,
  type DrillPackId,
} from '../data/drillPacks';
import { todayKey } from '../data/drills';
import { StudyScreen } from './StudyScreen';
import { HuTableScreen } from './HuTableScreen';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';
import { formatMoney } from '../utils/money';
import { dashboardApi, type DrillRecommendation } from '../api/dashboardApi';
import type { GeneratedDrillPlan } from '../api/dashboardApi';

const SCORE_KEY = '@pokeraicoach/drills_week_v1';

type WeekScore = {
  week: string;
  day: string;
  answered: number;
  best: number;
  ok: number;
  leak: number;
  huWins: number;
  huLosses: number;
  huPlayed: number;
  lp: number;
  rankedDoneDay: string | null;
};

function weekKeyFromDay(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  const dayIdx = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayIdx);
  return d.toISOString().slice(0, 10);
}

function emptyScore(day: string): WeekScore {
  return {
    week: weekKeyFromDay(day),
    day,
    answered: 0,
    best: 0,
    ok: 0,
    leak: 0,
    huWins: 0,
    huLosses: 0,
    huPlayed: 0,
    lp: 0,
    rankedDoneDay: null,
  };
}

function scoreFromSeason(season: ArenaSeason, day: string): WeekScore {
  return {
    week: season.weekKey,
    day,
    answered: season.you.answered,
    best: season.you.best,
    ok: season.you.ok,
    leak: season.you.leak,
    huWins: season.you.huWins,
    huLosses: season.you.huLosses,
    huPlayed: season.you.huPlayed,
    lp: season.you.lp,
    rankedDoneDay: season.you.rankedDoneDay,
  };
}

type Session =
  | { kind: 'ranked' }
  | { kind: 'practice'; packId: DrillPackId }
  | { kind: 'ai'; plan: GeneratedDrillPlan }
  | { kind: 'hu' }
  | null;

type DrillsProps = {
  onImmersiveChange?: (immersive: boolean) => void;
  recommendation?: DrillRecommendation | null;
  recommendationSessionId?: string | null;
  generatedPlan?: GeneratedDrillPlan | null;
  onGeneratedPlanConsumed?: () => void;
};

export function DrillsScreen({
  onImmersiveChange,
  recommendation,
  recommendationSessionId,
  generatedPlan,
  onGeneratedPlanConsumed,
}: DrillsProps = {}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const day = todayKey();
  const [score, setScore] = useState<WeekScore>(() => emptyScore(day));
  const [season, setSeason] = useState<ArenaSeason | null>(null);
  const [ready, setReady] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [rangesOpen, setRangesOpen] = useState(false);
  const [session, setSession] = useState<Session>(null);
  const [generatingAiDrill, setGeneratingAiDrill] = useState(false);
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const deal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onImmersiveChange?.(session != null);
    return () => onImmersiveChange?.(false);
  }, [session, onImmersiveChange]);

  useEffect(() => {
    if (!generatedPlan) return;
    setSession({ kind: 'ai', plan: generatedPlan });
    onGeneratedPlanConsumed?.();
  }, [generatedPlan, onGeneratedPlanConsumed]);

  useEffect(() => {
    if (session != null) return;
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const dealLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(deal, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(deal, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    floatLoop.start();
    pulseLoop.start();
    dealLoop.start();
    return () => {
      floatLoop.stop();
      pulseLoop.stop();
      dealLoop.stop();
    };
  }, [session, float, pulse, deal]);

  const [submitting, setSubmitting] = useState(false);

  const persistLocal = useCallback(async (next: WeekScore) => {
    setScore(next);
    try {
      await AsyncStorage.setItem(SCORE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const applySeason = useCallback(
    async (next: ArenaSeason) => {
      setSeason(next);
      await persistLocal(scoreFromSeason(next, day));
    },
    [day, persistLocal],
  );

  const loadSeason = useCallback(async () => {
    try {
      const remote = await arenaApi.getSeason(day);
      await applySeason(remote);
    } catch {
      try {
        const raw = await AsyncStorage.getItem(SCORE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as WeekScore;
          const week = weekKeyFromDay(day);
          if (parsed.week === week) {
            setScore({
              ...emptyScore(day),
              ...parsed,
              week,
              day,
              lp: parsed.lp ?? (parsed.best ?? 0) * 100 + (parsed.ok ?? 0) * 40,
            });
          } else {
            setScore(emptyScore(day));
          }
        }
      } catch {
        /* ignore */
      }
    } finally {
      setReady(true);
    }
  }, [applySeason, day]);

  useEffect(() => {
    void loadSeason();
  }, [loadSeason]);

  const boardRows = useMemo(() => {
    if (season?.rows?.length) {
      return season.rows.map((r) => ({
        ...r,
        isYou: r.isYou || r.id === user?.id,
      }));
    }
    return [
      {
        id: 'you',
        name: user?.displayName ?? 'You',
        lp: score.lp,
        accuracy: accuracyPct(score.best, score.ok, score.answered),
        answered: score.answered,
        huWins: score.huWins,
        huLosses: score.huLosses,
        huPlayed: score.huPlayed,
        isYou: true,
      },
    ];
  }, [season, user?.id, user?.displayName, score]);

  const youRank =
    season?.you.rank ??
    (boardRows.findIndex((r) => r.isYou) >= 0
      ? boardRows.findIndex((r) => r.isYou) + 1
      : 0);
  const youAccuracy =
    season?.you.accuracy ?? accuracyPct(score.best, score.ok, score.answered);
  const chasePrize = prizeForRank(youRank || 999);
  const rankedDoneToday = score.rankedDoneDay === day;
  const rankedDeck = useMemo(() => rankedDeckForDay(day, 10), [day]);
  const poolLabel = season
    ? formatMoney(season.prizePoolCents)
    : formatMoney(50_000);

  const onSessionFinished = async (mode: PlayMode, result: SessionResult) => {
    if (mode !== 'ranked') return;
    setSubmitting(true);
    try {
      const remote = await arenaApi.submitRanked({
        day,
        answered: result.answered,
        best: result.best,
        ok: result.ok,
        leak: result.leak,
        lpGained: result.lpGained,
      });
      await applySeason(remote);
    } catch (e) {
      const local: WeekScore = {
        ...score,
        answered: score.answered + result.answered,
        best: score.best + result.best,
        ok: score.ok + result.ok,
        leak: score.leak + result.leak,
        huWins: score.huWins,
        huLosses: score.huLosses,
        huPlayed: score.huPlayed,
        lp: score.lp + result.lpGained,
        rankedDoneDay: day,
        day,
        week: weekKeyFromDay(day),
      };
      await persistLocal(local);
      Alert.alert(
        'Arena',
        (e as Error).message ||
          'Saved locally — will sync when the server is back.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ActivityIndicator color={dash.cta} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (session?.kind === 'ranked') {
    return (
      <DrillPlaySession
        mode="ranked"
        title="Arena · Daily 10"
        subtitle="LP counts toward the weekly bankroll board"
        deck={rankedDeck}
        currentLp={score.lp}
        onExit={() => setSession(null)}
        onFinished={(result) => {
          void onSessionFinished('ranked', result);
        }}
      />
    );
  }

  if (session?.kind === 'hu') {
    return (
      <HuTableScreen
        onClose={() => {
          setSession(null);
          void loadSeason();
        }}
        onPlayAgain={() => {
          setSession(null);
          void loadSeason();
          setTimeout(() => setSession({ kind: 'hu' }), 40);
        }}
      />
    );
  }

  if (session?.kind === 'practice') {
    const pack = DRILL_PACKS.find((p) => p.id === session.packId)!;
    return (
      <DrillPlaySession
        mode="practice"
        title={pack.title}
        subtitle="Practice · no Arena LP"
        deck={drillsForPack(session.packId)}
        onExit={() => setSession(null)}
        onFinished={() => undefined}
      />
    );
  }

  if (session?.kind === 'ai') {
    return (
      <DrillPlaySession
        mode="practice"
        title={session.plan.title}
        subtitle={`${session.plan.subtitle} · AI generated`}
        deck={session.plan.drills}
        onExit={() => setSession(null)}
        onFinished={() => undefined}
      />
    );
  }

  const startAiDrill = async () => {
    if (!recommendationSessionId || generatingAiDrill) return;
    setGeneratingAiDrill(true);
    try {
      setSession({ kind: 'ai', plan: await dashboardApi.generateDrill(recommendationSessionId) });
    } catch (error) {
      Alert.alert('AI drill', (error as Error).message || 'Could not create this drill yet.');
    } finally {
      setGeneratingAiDrill(false);
    }
  };

  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const floatY2 = float.interpolate({ inputRange: [0, 1], outputRange: [0, 9] });
  const cardTilt = deal.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '6deg'] });
  const cardTilt2 = deal.interpolate({ inputRange: [0, 1], outputRange: ['10deg', '-4deg'] });
  const liveScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const liveOp = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] });

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 6, paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brand}>ARENA</Text>
            <Text style={styles.title}>Drills</Text>
          </View>
          <Pressable
            onPress={() => setRangesOpen(true)}
            style={({ pressed }) => [styles.rangesChip, pressed && { opacity: 0.85 }]}
          >
            <RangeTabIcon color={dash.opsSoft} size={13} />
            <Text style={styles.rangesChipText}>Ranges</Text>
          </Pressable>
        </View>

        {recommendation ? (
          <View style={styles.aiRecommendation}>
            <View style={styles.aiRecommendationIcon}>
              <Ionicons name="sparkles" size={18} color={dash.brandSoft} />
            </View>
            <View style={styles.aiRecommendationCopy}>
              <Text style={styles.aiRecommendationEyebrow}>AI SESSION DRILL · {recommendation.difficulty.toUpperCase()}</Text>
              <Text numberOfLines={1} style={styles.aiRecommendationTitle}>{recommendation.title}</Text>
              <Text numberOfLines={2} style={styles.aiRecommendationBody}>{recommendation.reason}</Text>
            </View>
            <Pressable
              disabled={!recommendationSessionId || generatingAiDrill}
              onPress={() => void startAiDrill()}
              style={[styles.aiRecommendationButton, (!recommendationSessionId || generatingAiDrill) && styles.aiRecommendationButtonDisabled]}
            >
              <Text style={styles.aiRecommendationButtonText}>{generatingAiDrill ? 'Making...' : 'Create'}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* HU stage — bankroll palette + floating cards */}
        <Pressable
          onPress={() => setSession({ kind: 'hu' })}
          style={({ pressed }) => [pressed && { transform: [{ scale: 0.985 }] }]}
        >
          <LinearGradient
            colors={['rgba(77,163,255,0.18)', dash.surfaceRaised, dash.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.stage}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.floatCards,
                {
                  transform: [{ translateY: floatY }, { rotate: cardTilt }],
                },
              ]}
            >
              <MiniCards cards={['As', 'Kd']} size="md" overlap={4} fan />
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.floatCardsB,
                {
                  opacity: 0.85,
                  transform: [{ translateY: floatY2 }, { rotate: cardTilt2 }],
                },
              ]}
            >
              <MiniCards cards={['Qh', 'Jc']} size="sm" overlap={3} fan />
            </Animated.View>

            <View style={styles.livePill}>
              <Animated.View
                style={[styles.liveDot, { transform: [{ scale: liveScale }], opacity: liveOp }]}
              />
              <View style={styles.liveDotCore} />
              <Text style={styles.liveText}>LIVE MATCHMAKING</Text>
            </View>
            <Text style={styles.stageTitle}>Heads-Up{'\n'}Online</Text>
            <Text style={styles.stageBody}>
              Find a table · blinds climb · bust them to win
            </Text>
            <View style={styles.stageCta}>
              <Text style={styles.stageCtaText}>Sit down</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Prize pot — same shell as BankrollCard */}
        <Pressable
          onPress={() => {
            void loadSeason();
            setBoardOpen(true);
          }}
          style={({ pressed }) => [pressed && { opacity: 0.94 }]}
        >
          <LinearGradient
            colors={['rgba(77,163,255,0.12)', dash.surfaceRaised, dash.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.potCard}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.potEyebrow}>WEEKLY PRIZE POT</Text>
              <Text style={styles.potAmount}>{poolLabel}</Text>
              <Text style={styles.potMeta}>
                Rank #{youRank || '—'} · {score.lp} LP
                {season ? ` · ${season.entrants} players` : ''}
                {chasePrize ? ` · ${chasePrize.place}` : ''}
              </Text>
            </View>
            <View style={styles.potBtn}>
              <Text style={styles.potBtnText}>Board →</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.statsStrip}>
          <View style={styles.statCell}>
            <Text style={[styles.statNum, { color: dash.cta }]}>{score.lp}</Text>
            <Text style={styles.statLab}>LP</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statCell}>
            <Text style={[styles.statNum, { color: dash.opsSoft }]}>{youAccuracy}%</Text>
            <Text style={styles.statLab}>acc</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{score.answered}</Text>
            <Text style={styles.statLab}>spots</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statCell}>
            <Text style={[styles.statNum, { color: dash.loss }]}>{score.leak}</Text>
            <Text style={styles.statLab}>leaks</Text>
          </View>
        </View>

        <Text style={styles.laneLabel}>MODES</Text>
        <View style={styles.modeRow}>
          <Pressable
            disabled={rankedDoneToday || submitting}
            onPress={() => setSession({ kind: 'ranked' })}
            style={({ pressed }) => [
              { flex: 1 },
              pressed && !rankedDoneToday && { opacity: 0.9 },
            ]}
          >
            <LinearGradient
              colors={
                rankedDoneToday
                  ? [dash.surface, dash.surface]
                  : ['rgba(46,230,106,0.16)', dash.surfaceRaised]
              }
              style={[styles.modeTile, rankedDoneToday && styles.modeDone]}
            >
              <Animated.View style={{ transform: [{ translateY: floatY2 }] }}>
                <MiniCards cards={['Ah', 'Ad']} size="sm" overlap={2} fan={false} />
              </Animated.View>
              <Text style={[styles.modeEyebrow, { color: dash.cta }]}>
                {rankedDoneToday ? 'CLEARED' : 'RANKED'}
              </Text>
              <Text style={styles.modeTitle}>Daily 10</Text>
              <Text style={styles.modeHint}>
                {rankedDoneToday
                  ? 'Tomorrow reset'
                  : `${rankedDeck.length} spots · LP`}
              </Text>
              <Text style={[styles.modeGo, { color: dash.cta }]}>
                {submitting ? '…' : rankedDoneToday ? 'Done' : 'Play →'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => setRangesOpen(true)}
            style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={['rgba(77,163,255,0.16)', dash.surfaceRaised]}
              style={styles.modeTile}
            >
              <Animated.View style={{ transform: [{ translateY: floatY }] }}>
                <MiniCards cards={['Ts', '9s']} size="sm" overlap={2} fan={false} />
              </Animated.View>
              <Text style={[styles.modeEyebrow, { color: dash.opsSoft }]}>STUDY</Text>
              <Text style={styles.modeTitle}>Ranges</Text>
              <Text style={styles.modeHint}>Charts · positions</Text>
              <Text style={[styles.modeGo, { color: dash.opsSoft }]}>Open →</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.laneHead}>
          <Text style={styles.laneLabel}>TRAINING DECKS</Text>
          <Text style={styles.laneHint}>no LP</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.deckScroll}
        >
          {DRILL_PACKS.map((pack, i) => {
            const count = drillsForPack(pack.id).length;
            const tone = packToneColors(pack.tone);
            const sample =
              i === 0
                ? (['Ks', 'Qs'] as [string, string])
                : i === 1
                  ? (['Ah', 'Kd'] as [string, string])
                  : i === 2
                    ? (['Jc', 'Td'] as [string, string])
                    : (['9h', '8h'] as [string, string]);
            return (
              <Pressable
                key={pack.id}
                onPress={() => setSession({ kind: 'practice', packId: pack.id })}
                style={({ pressed }) => [
                  styles.deckCard,
                  { borderColor: tone.border, backgroundColor: tone.bg },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Animated.View
                  style={{
                    transform: [{ translateY: i % 2 === 0 ? floatY : floatY2 }],
                    marginBottom: 8,
                  }}
                >
                  <MiniCards cards={sample} size="sm" overlap={4} fan />
                </Animated.View>
                <Text style={[styles.deckCount, { color: tone.text }]}>{count} SPOTS</Text>
                <Text style={styles.deckTitle}>{pack.title}</Text>
                <Text style={styles.deckBlurb} numberOfLines={2}>
                  {pack.blurb}
                </Text>
                <View style={[styles.deckPlay, { borderColor: tone.border }]}>
                  <Text style={[styles.deckPlayText, { color: tone.text }]}>Deal</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScrollView>

      <Modal visible={rangesOpen} animationType="slide" onRequestClose={() => setRangesOpen(false)}>
        <StudyScreen embedded onClose={() => setRangesOpen(false)} />
      </Modal>

      <DrillLeaderboardModal
        visible={boardOpen}
        onClose={() => setBoardOpen(false)}
        rows={boardRows}
        youRank={youRank || 0}
        youLp={score.lp}
        youAccuracy={youAccuracy}
        youHuWins={score.huWins}
        youHuLosses={score.huLosses}
        youHuPlayed={score.huPlayed}
        prizePoolCents={season?.prizePoolCents}
        entrants={season?.entrants}
        prizes={season?.prizes}
        endsAt={season?.endsAt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  aiRecommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(155,107,255,0.38)',
    backgroundColor: 'rgba(65,41,111,0.48)',
    padding: 11,
  },
  aiRecommendationIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(155,107,255,0.2)',
  },
  aiRecommendationCopy: { flex: 1, minWidth: 0, gap: 2 },
  aiRecommendationEyebrow: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  aiRecommendationTitle: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  aiRecommendationBody: { color: dash.textSecondary, fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
  aiRecommendationButton: {
    borderWidth: 1,
    borderColor: dash.ops,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  aiRecommendationButtonText: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 11 },
  aiRecommendationButtonDisabled: { opacity: 0.55 },
  brand: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 36,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  rangesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: dash.opsDim,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
  },
  rangesChipText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },

  stage: {
    minHeight: 268,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'flex-end',
  },
  floatCards: {
    position: 'absolute',
    top: 28,
    right: 22,
  },
  floatCardsB: {
    position: 'absolute',
    top: 78,
    right: 78,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.35)',
    marginBottom: 10,
  },
  liveDot: {
    position: 'absolute',
    left: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: dash.cta,
  },
  liveDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: dash.cta,
  },
  liveText: {
    color: dash.cta,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  stageTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 34,
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  stageBody: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
    maxWidth: '70%',
  },
  stageCta: {
    alignSelf: 'flex-start',
    backgroundColor: dash.cta,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
  },
  stageCtaText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },

  potCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  potEyebrow: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.3,
  },
  potAmount: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 32,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  potMeta: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  potBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: dash.opsDim,
  },
  potBtnText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },

  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: dash.surface,
    borderWidth: 1,
    borderColor: dash.border,
    paddingVertical: 12,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  statLab: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 10,
  },
  statDiv: {
    width: 1,
    height: 28,
    backgroundColor: dash.border,
  },

  laneLabel: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  laneHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  laneHint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
  },

  modeRow: { flexDirection: 'row', gap: 12, marginTop: -2 },
  modeTile: {
    minHeight: 168,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 4,
    overflow: 'hidden',
  },
  modeDone: { opacity: 0.55 },
  modeEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    marginTop: 8,
  },
  modeTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 20,
  },
  modeHint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    flex: 1,
  },
  modeGo: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    marginTop: 4,
  },

  deckScroll: { gap: 12, paddingRight: 8, paddingBottom: 4 },
  deckCard: {
    width: 172,
    minHeight: 200,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  deckCount: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  deckTitle: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    marginTop: 6,
  },
  deckBlurb: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    flex: 1,
  },
  deckPlay: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  deckPlayText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
});
