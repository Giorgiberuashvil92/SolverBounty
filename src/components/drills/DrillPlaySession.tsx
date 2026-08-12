import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrillTableSim } from './DrillTableSim';
import {
  explanationFor,
  qualityLabel,
  type Drill,
  type DrillChoice,
  type DrillChoiceQuality,
} from '../../data/drills';
import { lpForQuality } from '../../data/drillLeaderboard';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

export type PlayMode = 'ranked' | 'practice';

export type SessionResult = {
  answered: number;
  best: number;
  ok: number;
  leak: number;
  lpGained: number;
};

type DrillPlaySessionProps = {
  mode: PlayMode;
  title: string;
  subtitle?: string;
  deck: Drill[];
  /** Starting LP shown in chrome (ranked). */
  currentLp?: number;
  onExit: () => void;
  onFinished: (result: SessionResult) => void;
};

function choiceTone(q: DrillChoiceQuality) {
  if (q === 'best') return { bg: 'rgba(46,230,106,0.16)', border: 'rgba(46,230,106,0.45)', text: dash.cta };
  if (q === 'ok') return { bg: 'rgba(77,163,255,0.14)', border: 'rgba(77,163,255,0.4)', text: dash.opsSoft };
  return { bg: 'rgba(255,77,94,0.14)', border: 'rgba(255,77,94,0.4)', text: dash.loss };
}

function actionButtonStyle(label: string) {
  const low = label.toLowerCase();
  if (low.includes('fold')) {
    return { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)', text: dash.textSecondary };
  }
  if (low.includes('check') || low.includes('call') || low.includes('limp')) {
    return { bg: 'rgba(77,163,255,0.14)', border: 'rgba(77,163,255,0.35)', text: dash.opsSoft };
  }
  return { bg: 'rgba(46,230,106,0.16)', border: 'rgba(46,230,106,0.4)', text: dash.cta };
}

export function DrillPlaySession({
  mode,
  title,
  subtitle,
  deck,
  currentLp = 0,
  onExit,
  onFinished,
}: DrillPlaySessionProps) {
  const insets = useSafeAreaInsets();
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<DrillChoice | null>(null);
  const [lastLpGain, setLastLpGain] = useState(0);
  const [stats, setStats] = useState({ answered: 0, best: 0, ok: 0, leak: 0, lpGained: 0 });
  const [snapshot, setSnapshot] = useState<SessionResult | null>(null);

  const drill = deck[Math.min(cursor, Math.max(0, deck.length - 1))];
  const done = cursor >= deck.length;
  const countsLp = mode === 'ranked';

  const progressLabel = useMemo(() => {
    if (done) return `${deck.length}/${deck.length}`;
    return `${Math.min(cursor + (picked ? 1 : 0), deck.length)}/${deck.length}`;
  }, [cursor, picked, deck.length, done]);

  const onChoose = (choice: DrillChoice) => {
    if (picked || !drill) return;
    const gain = countsLp ? lpForQuality(choice.quality) : 0;
    const next: SessionResult = {
      answered: stats.answered + 1,
      best: stats.best + (choice.quality === 'best' ? 1 : 0),
      ok: stats.ok + (choice.quality === 'ok' ? 1 : 0),
      leak: stats.leak + (choice.quality === 'leak' ? 1 : 0),
      lpGained: stats.lpGained + gain,
    };
    setLastLpGain(gain);
    setPicked(choice);
    setStats(next);
    setSnapshot(next);
  };

  const onNext = () => {
    if (!picked || !snapshot) return;
    const next = cursor + 1;
    setPicked(null);
    setLastLpGain(0);
    setCursor(next);
    if (next >= deck.length) {
      onFinished(snapshot);
    }
  };

  if (!deck.length) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.empty}>No spots in this pack yet.</Text>
        <Pressable onPress={onExit} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <LinearGradient colors={['#171D36', '#0B1020']} style={StyleSheet.absoluteFill} />
        <View style={styles.doneWrap}>
          <Text style={styles.kicker}>{mode === 'ranked' ? 'RANKED' : 'PRACTICE'}</Text>
          <Text style={styles.doneTitle}>Session done</Text>
          <Text style={styles.doneBody}>
            {stats.best} best · {stats.ok} playable · {stats.leak} leaks
            {countsLp ? ` · +${stats.lpGained} LP` : ' · practice (no LP)'}
          </Text>
          <Pressable onPress={onExit} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Back to Drills</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const tone = picked ? choiceTone(picked.quality) : null;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#171D36', '#0B1020', '#080C18']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={onExit} hitSlop={10} style={styles.exitChip}>
            <Text style={styles.exitText}>← Exit</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.sessionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.sessionSub}>{subtitle}</Text> : null}
          </View>
          <View style={styles.progressChip}>
            <Text style={styles.progressText}>{progressLabel}</Text>
          </View>
        </View>

        {countsLp ? (
          <Text style={styles.lpLine}>
            Run +{stats.lpGained} LP · total {currentLp + stats.lpGained} LP
          </Text>
        ) : (
          <Text style={styles.lpLine}>Practice mode · scores don’t hit the board</Text>
        )}

        <LinearGradient
          colors={['rgba(20,26,44,0.98)', 'rgba(12,16,28,0.98)']}
          style={styles.spotCard}
        >
          <View style={styles.spotTop}>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{drill.tag.toUpperCase()}</Text>
            </View>
            <Text style={styles.stakes}>
              {drill.stakesLabel} · {drill.stackBb}bb
            </Text>
          </View>
          <DrillTableSim drill={drill} />
          <Text style={styles.prompt}>{drill.prompt}</Text>
        </LinearGradient>

        {!picked ? (
          <View style={styles.choices}>
            {drill.choices.map((c) => {
              const style = actionButtonStyle(c.label);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => onChoose(c)}
                  style={({ pressed }) => [
                    styles.choiceBtn,
                    { backgroundColor: style.bg, borderColor: style.border },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Text style={[styles.choiceText, { color: style.text }]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.reveal}>
            <View
              style={[
                styles.verdictPill,
                { backgroundColor: tone!.bg, borderColor: tone!.border },
              ]}
            >
              <Text style={[styles.verdictText, { color: tone!.text }]}>
                {qualityLabel(picked.quality)}
              </Text>
            </View>
            {countsLp ? (
              lastLpGain > 0 ? (
                <View style={styles.lpReveal}>
                  <Text style={styles.lpRevealText}>+{lastLpGain} LP</Text>
                </View>
              ) : (
                <Text style={styles.lpMiss}>+0 LP · leak</Text>
              )
            ) : null}
            <Text style={styles.pickedLine}>You chose · {picked.label}</Text>
            <Text style={styles.explain}>{explanationFor(drill, picked.quality)}</Text>
            {picked.quality !== 'best' ? (
              <Text style={styles.bestHint}>
                Best line: {drill.choices.find((c) => c.quality === 'best')?.label ?? '—'}
              </Text>
            ) : null}
            <Pressable onPress={onNext} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>
                {cursor + 1 >= deck.length ? 'Finish' : 'Next spot'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dash.bg },
  content: { paddingHorizontal: 16, gap: 12 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exitChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  exitText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  sessionTitle: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  sessionSub: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 1,
  },
  progressChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(77,163,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.28)',
  },
  progressText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  lpLine: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  spotCard: {
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.22)',
    overflow: 'hidden',
  },
  spotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(46,230,106,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.35)',
  },
  tagText: {
    color: dash.cta,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  stakes: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  prompt: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 20,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  choices: { gap: 10 },
  choiceBtn: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  choiceText: { fontFamily: fonts.bodyBold, fontSize: 16 },
  reveal: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    backgroundColor: 'rgba(20,26,44,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  verdictPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  verdictText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  lpReveal: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(46,230,106,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46,230,106,0.35)',
  },
  lpRevealText: {
    color: dash.cta,
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  lpMiss: {
    color: dash.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  pickedLine: {
    color: dash.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  explain: {
    color: dash.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bestHint: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: dash.cta,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  doneWrap: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 10,
  },
  kicker: {
    color: 'rgba(255,255,255,0.38)',
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  doneTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 28,
  },
  doneBody: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  empty: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  backBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dash.border,
  },
  backBtnText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
});
