import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { coachApi } from '../../api/coachApi';
import { VoiceCaptureButton } from '../VoiceCaptureButton';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import type { PokerActionType, Street, StructuredAction } from '../../types/session';

type ActionStreet = Extract<Street, 'preflop' | 'flop' | 'turn' | 'river'>;
type SeatActionMap = Partial<Record<string, PokerActionType>>;
type StreetActionMap = Record<ActionStreet, SeatActionMap>;

const ACTION_STREETS: ActionStreet[] = ['preflop', 'flop', 'turn', 'river'];

function emptyStreetActions(): StreetActionMap {
  return { preflop: {}, flop: {}, turn: {}, river: {} };
}

function streetUnlocked(street: ActionStreet, boardLen: number) {
  if (street === 'preflop') return true;
  if (street === 'flop') return boardLen >= 3;
  if (street === 'turn') return boardLen >= 4;
  return boardLen >= 5;
}

function isOutBefore(
  pos: string,
  street: ActionStreet,
  map: StreetActionMap,
): boolean {
  const idx = ACTION_STREETS.indexOf(street);
  for (let i = 0; i < idx; i++) {
    if (map[ACTION_STREETS[i]][pos] === 'fold') return true;
  }
  return false;
}

const TABLE_SIZES = [6, 8, 9] as const;
const POT_TYPES = [
  { key: 'srp', label: 'SRP' },
  { key: '3bet', label: '3-bet' },
  { key: '4bet', label: '4-bet' },
  { key: '5bet', label: '5-bet' },
  { key: '6bet', label: '6-bet+' },
  { key: 'iso', label: 'Iso' },
  { key: 'limped', label: 'Limp' },
] as const;
const TAGS = ['bluff', 'value', 'missed_value', 'bad_fold', 'cooler', 'tilt', 'study'] as const;
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
const SUITS = [
  { id: 's', glyph: '♠', color: '#E8EEF8' },
  { id: 'h', glyph: '♥', color: '#F87171' },
  { id: 'd', glyph: '♦', color: '#60A5FA' },
  { id: 'c', glyph: '♣', color: '#4ADE80' },
] as const;
const RESULT_CHIPS = [-20, -10, -5, -2, 0, 2, 5, 10, 20, 50] as const;

const ACTIONS: Array<{ key: PokerActionType; label: string; tone: 'fold' | 'call' | 'raise' | 'soft' }> = [
  { key: 'fold', label: 'Fold', tone: 'fold' },
  { key: 'check', label: 'Check', tone: 'soft' },
  { key: 'call', label: 'Call', tone: 'call' },
  { key: 'raise', label: 'Raise', tone: 'raise' },
  { key: 'allin', label: 'All-in', tone: 'raise' },
];

const SEATS_6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
const SEATS_8 = ['UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
const SEATS_9 = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;

export type HandLoggerResult = {
  heroPosition: string;
  holeCards: string[];
  board: string[];
  resultBb: number;
  tags: string[];
  aiSummary: string;
  villainPositions: string[];
  potType: 'srp' | '3bet' | '4bet' | '5bet' | '6bet' | 'limped' | 'iso';
  tableSize: number;
  actions: StructuredAction[];
  stakes?: string;
  rawInput?: string;
  source?: 'manual' | 'voice';
};

type HandLoggerModalProps = {
  visible: boolean;
  stakesLabel?: string;
  initialNote?: string;
  onCancel: () => void;
  onConfirm: (input: HandLoggerResult) => void;
};

type Mode = 'manual' | 'voice' | null;
type Step = 'mode' | 'voice' | 'table' | 'details';
type PickTarget = 'hole' | 'board';

function suitGlyph(card: string) {
  const s = card.slice(-1).toLowerCase();
  const hit = SUITS.find((x) => x.id === s);
  return { glyph: hit?.glyph ?? '?', color: hit?.color ?? '#fff', rank: card.slice(0, -1) };
}

function PlayingCard({ code, small }: { code: string; small?: boolean }) {
  const { glyph, color, rank } = suitGlyph(code);
  return (
    <View style={[styles.playingCard, small && styles.playingCardSm]}>
      <Text style={[styles.playingRank, small && styles.playingRankSm, { color }]}>{rank}</Text>
      <Text style={[styles.playingSuit, small && styles.playingSuitSm, { color }]}>{glyph}</Text>
    </View>
  );
}

function seatsFor(size: number): string[] {
  if (size >= 9) return [...SEATS_9];
  if (size === 8) return [...SEATS_8];
  return [...SEATS_6];
}

function seatPoints(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = (i / count) * Math.PI * 2 + Math.PI / 2;
    return {
      x: 0.5 + 0.44 * Math.cos(t),
      y: 0.5 + 0.4 * Math.sin(t),
    };
  });
}

function actionShort(a?: PokerActionType) {
  const map: Record<PokerActionType, string> = {
    fold: 'FOLD',
    call: 'CALL',
    raise: 'RAISE',
    allin: 'ALLIN',
    check: 'CHECK',
    bet: 'BET',
  };
  return a ? map[a] : '·';
}

export function HandLoggerModal({
  visible,
  stakesLabel,
  initialNote,
  onCancel,
  onConfirm,
}: HandLoggerModalProps) {
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<Mode>(null);
  const [tableSize, setTableSize] = useState(6);
  const [potType, setPotType] =
    useState<HandLoggerResult['potType']>('srp');
  const [heroPosition, setHeroPosition] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [streetActions, setStreetActions] = useState<StreetActionMap>(emptyStreetActions);
  const [actionTimeline, setActionTimeline] = useState<StructuredAction[]>([]);
  const [actionSizeDraft, setActionSizeDraft] = useState('');
  const [logStreet, setLogStreet] = useState<ActionStreet>('preflop');
  const [holeCards, setHoleCards] = useState<string[]>([]);
  const [boardCards, setBoardCards] = useState<string[]>([]);
  const [resultBb, setResultBb] = useState(0);
  const [resultDraft, setResultDraft] = useState('0');
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseHint, setParseHint] = useState<string | null>(null);
  const [pickTarget, setPickTarget] = useState<PickTarget>('hole');
  const [pickSuit, setPickSuit] = useState<(typeof SUITS)[number]['id']>('s');
  const seats = useMemo(() => seatsFor(tableSize), [tableSize]);
  const points = useMemo(() => seatPoints(seats.length), [seats.length]);
  const preflop = streetActions.preflop;

  const villains = useMemo(
    () =>
      seats.filter((pos) => {
        if (pos === heroPosition) return false;
        return ACTION_STREETS.some((st) => {
          const a = streetActions[st][pos];
          return a === 'call' || a === 'raise' || a === 'bet' || a === 'allin' || a === 'check';
        });
      }),
    [seats, heroPosition, streetActions],
  );

  const foldedCount = useMemo(
    () => seats.filter((pos) => preflop[pos] === 'fold').length,
    [seats, preflop],
  );

  const unlockedStreets = useMemo(
    () => ACTION_STREETS.filter((s) => streetUnlocked(s, boardCards.length)),
    [boardCards.length],
  );

  useEffect(() => {
    if (!visible) return;
    setStep('mode');
    setMode(null);
    setTableSize(6);
    setPotType('srp');
    setHeroPosition(null);
    setSelectedSeat(null);
    setStreetActions(emptyStreetActions());
    setActionTimeline([]);
    setActionSizeDraft('');
    setLogStreet('preflop');
    setHoleCards([]);
    setBoardCards([]);
    setResultBb(0);
    setResultDraft('0');
    setTags([]);
    setNote(initialNote ?? '');
    setVoiceText('');
    setParseHint(null);
    setPickTarget('hole');
    setPickSuit('s');
  }, [visible]);

  useEffect(() => {
    setStreetActions((prev) => {
      const next = emptyStreetActions();
      for (const st of ACTION_STREETS) {
        for (const s of seats) if (prev[st][s]) next[st][s] = prev[st][s];
      }
      return next;
    });
    if (heroPosition && !seats.includes(heroPosition)) setHeroPosition(null);
    if (selectedSeat && !seats.includes(selectedSeat)) setSelectedSeat(null);
  }, [tableSize, seats, heroPosition, selectedSeat]);

  useEffect(() => {
    if (!streetUnlocked(logStreet, boardCards.length)) {
      const last = [...unlockedStreets].reverse()[0] ?? 'preflop';
      setLogStreet(last);
    }
  }, [boardCards.length, logStreet, unlockedStreets]);

  const assignAction = (action: PokerActionType, street: ActionStreet = 'preflop') => {
    if (!selectedSeat) return;
    if (isOutBefore(selectedSeat, street, streetActions)) return;
    const current = selectedSeat;
    const parsedSize = Number(actionSizeDraft.replace(',', '.'));
    const sizeBb =
      ['call', 'raise', 'bet', 'allin'].includes(action) && Number.isFinite(parsedSize) && parsedSize > 0
        ? parsedSize
        : undefined;
    setActionTimeline((prev) => [
      ...prev,
      { street, actor: current, action, ...(sizeBb != null ? { sizeBb } : {}) },
    ]);
    setActionSizeDraft('');
    setStreetActions((prev) => {
      const lane = { ...prev[street], [current]: action };
      const next = { ...prev, [street]: lane };
      const alive = seats.filter((s) => !isOutBefore(s, street, next));
      const idx = alive.indexOf(current);
      const nextEmpty = alive.find((s, i) => i > idx && !lane[s]);
      if (nextEmpty) setSelectedSeat(nextEmpty);
      return next;
    });
  };

  const undoLastAction = () => {
    setActionTimeline((prev) => prev.slice(0, -1));
  };

  const markHero = () => {
    if (!selectedSeat) return;
    setHeroPosition(selectedSeat);
  };

  const parseVoice = async () => {
    const transcript = voiceText.trim();
    if (!transcript || parsing) return;
    setParsing(true);
    setParseHint(null);
    try {
      const parsed = await coachApi.parseHand(transcript, stakesLabel);
      const h = parsed.hand;
      const nextSeats = seatsFor(tableSize);
      if (h.heroPosition && nextSeats.includes(h.heroPosition)) {
        setHeroPosition(h.heroPosition);
        setSelectedSeat(h.heroPosition);
      }
      const nextActions: Partial<Record<string, PokerActionType>> = {};
      if (h.villainPositions?.length) {
        for (const v of h.villainPositions) {
          if (v !== h.heroPosition) nextActions[v] = 'call';
        }
      }
      // mark others as fold if we have hero + some villains (common quick parse)
      if (h.heroPosition && h.villainPositions?.length) {
        for (const s of nextSeats) {
          if (s === h.heroPosition) continue;
          if (!h.villainPositions.includes(s)) nextActions[s] = 'fold';
        }
      }
      setStreetActions({ ...emptyStreetActions(), preflop: nextActions });
      setLogStreet('preflop');
      if (h.heroHoleCards?.length) setHoleCards(h.heroHoleCards.slice(0, 2));
      if (h.board?.length) setBoardCards(h.board.slice(0, 5));
      if (h.resultBb != null) {
        setResultBb(h.resultBb);
        setResultDraft(String(h.resultBb));
      }
      if (h.tags?.length) setTags([h.tags[0]]);
      if (h.summary) setNote(h.summary);
      setPickTarget(h.heroHoleCards && h.heroHoleCards.length >= 2 ? 'board' : 'hole');
      if (
        h.potType &&
        ['srp', '3bet', '4bet', '5bet', '6bet', 'iso', 'limped'].includes(h.potType)
      ) {
        setPotType(h.potType as HandLoggerResult['potType']);
      }
      setParseHint(
        `Parsed · ${Math.round(parsed.confidence * 100)}% — tap seats + Fold/Call/Raise to fix.`,
      );
      setStep('table');
    } catch (e) {
      setParseHint((e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const chooseMode = (m: 'manual' | 'voice') => {
    setMode(m);
    setStep(m === 'voice' ? 'voice' : 'table');
  };

  const usedCards = useMemo(
    () => new Set([...holeCards, ...boardCards]),
    [holeCards, boardCards],
  );

  const addCard = (rank: string) => {
    const card = `${rank}${pickSuit}`;
    if (usedCards.has(card)) return;
    if (pickTarget === 'hole') {
      if (holeCards.length >= 2) return;
      const next = [...holeCards, card];
      setHoleCards(next);
      if (next.length >= 2) setPickTarget('board');
      return;
    }
    if (boardCards.length >= 5) return;
    setBoardCards((prev) => {
      const next = [...prev, card];
      if (next.length === 3) setLogStreet('flop');
      else if (next.length === 4) setLogStreet('turn');
      else if (next.length === 5) setLogStreet('river');
      return next;
    });
  };

  const removeCard = (target: PickTarget, index: number) => {
    if (target === 'hole') {
      setHoleCards((prev) => prev.filter((_, i) => i !== index));
      setPickTarget('hole');
      return;
    }
    setBoardCards((prev) => prev.filter((_, i) => i !== index));
    setPickTarget('board');
  };

  const canLeaveTable = Boolean(heroPosition);
  const canSave = holeCards.length >= 2 && Boolean(heroPosition);

  const save = () => {
    if (!heroPosition || holeCards.length < 2) return;
    const parsedResult = Number(String(resultDraft).replace(/,/g, '.'));
    const finalResult = Number.isFinite(parsedResult) ? parsedResult : resultBb;
    const fallbackActions: StructuredAction[] = ACTION_STREETS.flatMap((street) =>
      seats
        .filter((pos) => streetActions[street][pos])
        .filter((pos) => streetUnlocked(street, boardCards.length))
        .map((pos) => ({
          street,
          actor: pos,
          action: streetActions[street][pos]!,
        })),
    );
    const actions = actionTimeline.length ? actionTimeline : fallbackActions;
    const actionLine = actions
      .map((a) => `${a.street}:${a.actor}:${a.action}`)
      .join(' ');
    const summaryBits = [
      `${tableSize}-max`,
      potType,
      `Hero ${heroPosition} ${holeCards.join(' ')}`,
      villains.length ? `vs ${villains.join(', ')}` : null,
      foldedCount ? `${foldedCount} folded` : null,
      boardCards.length ? `board ${boardCards.join(' ')}` : null,
      actions.length
        ? actions
            .map(
              (a) =>
                `${a.street[0].toUpperCase()}${a.actor}:${a.action}${a.sizeBb != null ? ` ${a.sizeBb}bb` : ''}`,
            )
            .join(' ')
        : null,
      note.trim() || null,
    ].filter(Boolean);
    onConfirm({
      heroPosition,
      holeCards,
      board: boardCards,
      resultBb: finalResult,
      tags: tags.length ? tags : [],
      aiSummary: summaryBits.join(' · '),
      villainPositions: villains,
      potType,
      tableSize,
      actions,
      stakes: stakesLabel,
      rawInput:
        [voiceText.trim(), actionLine, note.trim()].filter(Boolean).join('\n') ||
        summaryBits.join(' · '),
      source: mode === 'voice' ? 'voice' : 'manual',
    });
  };

  const tableW = Math.min(width - 48, 340);
  const tableH = tableW * 0.78;
  const seatW = 50;
  const seatH = 50;

  const stepLabel =
    step === 'mode'
      ? 'How do you want to log?'
      : step === 'voice'
        ? 'Voice / dictate'
        : step === 'table'
          ? 'Set the action'
          : 'Tap your cards';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>
                LOG HAND{stakesLabel ? ` · ${stakesLabel}` : ''}
              </Text>
              <Text style={styles.title}>{stepLabel}</Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={10}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {step === 'mode' ? (
              <View style={styles.modeCol}>
                <Pressable
                  onPress={() => chooseMode('manual')}
                  style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}
                >
                  <Text style={styles.modeTitle}>By hand</Text>
                  <Text style={styles.modeBody}>
                    Open the table, tap a seat, then Fold / Call / Raise below.
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => chooseMode('voice')}
                  style={({ pressed }) => [styles.modeCard, styles.modeVoice, pressed && styles.pressed]}
                >
                  <Text style={styles.modeTitle}>By voice</Text>
                  <Text style={styles.modeBody}>
                    Dictate the hand, then fix seats and actions on the felt.
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {step === 'voice' ? (
              <>
                <Text style={styles.hint}>
                  Tap Voice and describe the hand naturally, or paste text. Next: confirm the action line on the table.
                </Text>
                <TextInput
                  value={voiceText}
                  onChangeText={setVoiceText}
                  placeholder="6-max, UTG folds, HJ folds, CO raises, BTN calls…"
                  placeholderTextColor={dash.textMuted}
                  style={[styles.input, styles.voiceBox]}
                  multiline
                  textAlignVertical="top"
                />
                <VoiceCaptureButton
                  stakes={stakesLabel}
                  disabled={parsing}
                  onResult={({ transcript }) => setVoiceText(transcript)}
                />
                {parseHint ? <Text style={styles.parseHint}>{parseHint}</Text> : null}
              </>
            ) : null}

            {step === 'table' ? (
              <>
                <Text style={styles.label}>Table size</Text>
                <View style={styles.chips}>
                  {TABLE_SIZES.map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setTableSize(n)}
                      style={[styles.chip, tableSize === n && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, tableSize === n && styles.chipTextOn]}>
                        {n}-max
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.hint}>Tap a seat, mark Hero, then add the action and size.</Text>

                <View style={[styles.stage, { width: tableW, height: tableH }]}>
                  <View style={styles.rim}>
                    <View style={styles.felt}>
                      <Text style={styles.feltLabel}>{tableSize}-MAX</Text>
                      <Text style={styles.feltSub}>
                        {heroPosition ? `Hero · ${heroPosition}` : 'Tap a seat'}
                        {foldedCount ? ` · ${foldedCount} fold` : ''}
                        {villains.length ? ` · ${villains.length} in` : ''}
                      </Text>
                      {actionTimeline.filter((action) => action.street === 'preflop').length ? (
                        <Text numberOfLines={2} style={styles.feltLine}>
                          {actionTimeline.filter((action) => action.street === 'preflop').map((action) => `${action.actor} ${action.action}${action.sizeBb != null ? ` ${action.sizeBb}bb` : ''}`).join('  →  ')}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {seats.map((pos, i) => {
                    const pt = points[i];
                    const hero = heroPosition === pos;
                    const action = preflop[pos];
                    const selected = selectedSeat === pos;
                    const folded = action === 'fold';
                    const inPot =
                      action === 'call' ||
                      action === 'raise' ||
                      action === 'allin' ||
                      action === 'check' ||
                      action === 'bet';
                    return (
                      <Pressable
                        key={pos}
                        onPress={() => setSelectedSeat(pos)}
                        style={[
                          styles.seat,
                          {
                            left: pt.x * tableW - seatW / 2,
                            top: pt.y * tableH - seatH / 2,
                            width: seatW,
                            height: seatH,
                          },
                          selected && styles.seatSelected,
                          hero && styles.seatHero,
                          folded && styles.seatFold,
                          inPot && !hero && styles.seatIn,
                        ]}
                      >
                        <Text
                          style={[
                            styles.seatText,
                            (hero || folded || inPot || selected) && styles.seatTextOn,
                          ]}
                        >
                          {pos}
                        </Text>
                        <Text style={styles.seatTag}>
                          {hero ? 'ME' : actionShort(action)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.actionBar}>
                  <Text style={styles.actionHint}>
                    {selectedSeat
                      ? `Preflop · ${selectedSeat}${heroPosition === selectedSeat ? ' · Hero' : ' · Villain'}`
                      : 'Tap a seat first'}
                  </Text>
                  {heroPosition ? (
                    <Pressable onPress={() => setStep('details')} style={styles.cardsShortcut}>
                      <Text style={styles.cardsShortcutText}>
                        {holeCards.length === 2 ? `Hero cards · ${holeCards.join(' ')}` : 'Add hero cards'}
                      </Text>
                      <Text style={styles.cardsShortcutArrow}>›</Text>
                    </Pressable>
                  ) : null}
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={markHero}
                      disabled={!selectedSeat}
                      style={[
                        styles.actionBtn,
                        styles.actionHero,
                        !selectedSeat && styles.disabled,
                      ]}
                    >
                      <Text style={styles.actionBtnText}>Hero</Text>
                    </Pressable>
                    {ACTIONS.map((a) => (
                      <Pressable
                        key={a.key}
                        onPress={() => assignAction(a.key, 'preflop')}
                        disabled={!selectedSeat}
                        style={[
                          styles.actionBtn,
                          a.tone === 'fold' && styles.actionFold,
                          a.tone === 'call' && styles.actionCall,
                          a.tone === 'raise' && styles.actionRaise,
                          a.tone === 'soft' && styles.actionSoft,
                          !selectedSeat && styles.disabled,
                          selectedSeat &&
                            preflop[selectedSeat] === a.key &&
                            styles.actionOn,
                        ]}
                      >
                        <Text style={styles.actionBtnText}>{a.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.sizeRow}>
                    <TextInput
                      value={actionSizeDraft}
                      onChangeText={(raw) =>
                        setActionSizeDraft(raw.replace(',', '.').replace(/[^\d.]/g, ''))
                      }
                      keyboardType="decimal-pad"
                      placeholder={selectedSeat ? `${selectedSeat} size in bb` : 'Size in bb'}
                      placeholderTextColor={dash.textMuted}
                      style={styles.sizeInput}
                    />
                    <Text style={styles.sizeUnit}>Saved with this action</Text>
                  </View>
                  {actionTimeline.filter((a) => a.street === 'preflop').length ? (
                    <View style={styles.timeline}>
                      <Text style={styles.timelineText}>
                        {actionTimeline
                          .filter((a) => a.street === 'preflop')
                          .map((a) => `${a.actor} ${a.action}${a.sizeBb != null ? ` ${a.sizeBb}bb` : ''}`)
                          .join('  →  ')}
                      </Text>
                      <Pressable onPress={undoLastAction} hitSlop={8}>
                        <Text style={styles.undoText}>Undo last</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.label}>Pot type · how deep was the preflop raise war?</Text>
                <View style={styles.chips}>
                  {POT_TYPES.map((p) => (
                    <Pressable
                      key={p.key}
                      onPress={() => setPotType(p.key)}
                      style={[styles.chip, potType === p.key && styles.chipOn]}
                    >
                      <Text
                        style={[styles.chipText, potType === p.key && styles.chipTextOn]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {step === 'details' ? (
              <>
                <Text style={styles.label}>Hole cards · tap to remove</Text>
                <View style={styles.cardRow}>
                  {[0, 1].map((i) => {
                    const card = holeCards[i];
                    const active = pickTarget === 'hole' && holeCards.length === i;
                    return (
                      <Pressable
                        key={`h${i}`}
                        onPress={() => {
                          if (card) removeCard('hole', i);
                          else setPickTarget('hole');
                        }}
                        style={[styles.cardSlot, active && styles.cardSlotActive]}
                      >
                        {card ? (
                          <PlayingCard code={card} />
                        ) : (
                          <Text style={styles.cardEmpty}>+</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.label}>Board · flop → river</Text>
                <View style={styles.cardRow}>
                  {[0, 1, 2, 3, 4].map((i) => {
                    const card = boardCards[i];
                    const active = pickTarget === 'board' && boardCards.length === i;
                    return (
                      <Pressable
                        key={`b${i}`}
                        onPress={() => {
                          if (card) removeCard('board', i);
                          else setPickTarget('board');
                        }}
                        style={[styles.cardSlotSm, active && styles.cardSlotActive]}
                      >
                        {card ? (
                          <PlayingCard code={card} small />
                        ) : (
                          <Text style={styles.cardEmptySm}>{i < 3 ? 'F' : i === 3 ? 'T' : 'R'}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.pickToggle}>
                  <Pressable
                    onPress={() => setPickTarget('hole')}
                    style={[styles.pickTab, pickTarget === 'hole' && styles.pickTabOn]}
                  >
                    <Text
                      style={[styles.pickTabText, pickTarget === 'hole' && styles.pickTabTextOn]}
                    >
                      Pick hole
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPickTarget('board')}
                    style={[styles.pickTab, pickTarget === 'board' && styles.pickTabOn]}
                  >
                    <Text
                      style={[styles.pickTabText, pickTarget === 'board' && styles.pickTabTextOn]}
                    >
                      Pick board
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.suitRow}>
                  {SUITS.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => setPickSuit(s.id)}
                      style={[styles.suitBtn, pickSuit === s.id && styles.suitBtnOn]}
                    >
                      <Text style={[styles.suitGlyph, { color: s.color }]}>{s.glyph}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.rankGrid}>
                  {RANKS.map((r) => {
                    const code = `${r}${pickSuit}`;
                    const used = usedCards.has(code);
                    return (
                      <Pressable
                        key={r}
                        disabled={used}
                        onPress={() => addCard(r)}
                        style={[styles.rankBtn, used && styles.rankUsed]}
                      >
                        <Text style={[styles.rankText, used && styles.rankTextUsed]}>{r}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.label}>Street actions · flop / turn / river</Text>
                <Text style={styles.hint}>
                  Pick a street, tap a seat still in the hand, then Fold / Check / Call / Raise.
                  Folded seats stay locked.
                </Text>
                <View style={styles.chips}>
                  {ACTION_STREETS.map((st) => {
                    const on = logStreet === st;
                    const unlocked = streetUnlocked(st, boardCards.length);
                    return (
                      <Pressable
                        key={st}
                        disabled={!unlocked}
                        onPress={() => setLogStreet(st)}
                        style={[
                          styles.chip,
                          on && styles.chipOn,
                          !unlocked && styles.disabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            on && styles.chipTextOn,
                            !unlocked && { opacity: 0.5 },
                          ]}
                        >
                          {unlocked ? st : `${st} · board`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.feltStrip}>
                  {seats.map((s) => {
                    const out = isOutBefore(s, logStreet, streetActions);
                    const a = streetActions[logStreet][s];
                    const hero = s === heroPosition;
                    const selected = selectedSeat === s;
                    return (
                      <Pressable
                        key={`${logStreet}-${s}`}
                        disabled={out}
                        onPress={() => setSelectedSeat(s)}
                        style={[
                          styles.miniSeat,
                          hero && styles.miniHero,
                          a === 'fold' && styles.miniFold,
                          a && a !== 'fold' && !hero && styles.miniIn,
                          selected && styles.miniSelected,
                          out && styles.miniOut,
                        ]}
                      >
                        <Text style={styles.miniSeatPos}>{s}</Text>
                        <Text style={styles.miniSeatAct}>
                          {out
                            ? 'OUT'
                            : hero && !a
                              ? 'ME'
                              : actionShort(a)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.actionBar}>
                  <Text style={styles.actionHint}>
                    {selectedSeat
                      ? `${logStreet.toUpperCase()} · ${selectedSeat}${
                          isOutBefore(selectedSeat, logStreet, streetActions)
                            ? ' (out)'
                            : heroPosition === selectedSeat
                              ? ' (me)'
                              : ''
                        }`
                      : `Tap a seat for ${logStreet}`}
                  </Text>
                  <View style={styles.actionRow}>
                    {ACTIONS.map((a) => {
                      const out =
                        !selectedSeat ||
                        isOutBefore(selectedSeat, logStreet, streetActions);
                      return (
                        <Pressable
                          key={`d-${a.key}`}
                          onPress={() => assignAction(a.key, logStreet)}
                          disabled={out}
                          style={[
                            styles.actionBtn,
                            a.tone === 'fold' && styles.actionFold,
                            a.tone === 'call' && styles.actionCall,
                            a.tone === 'raise' && styles.actionRaise,
                            a.tone === 'soft' && styles.actionSoft,
                            out && styles.disabled,
                            selectedSeat &&
                              streetActions[logStreet][selectedSeat] === a.key &&
                              styles.actionOn,
                          ]}
                        >
                          <Text style={styles.actionBtnText}>{a.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.sizeRow}>
                    <TextInput
                      value={actionSizeDraft}
                      onChangeText={(raw) =>
                        setActionSizeDraft(raw.replace(',', '.').replace(/[^\d.]/g, ''))
                      }
                      keyboardType="decimal-pad"
                      placeholder="Size in bb"
                      placeholderTextColor={dash.textMuted}
                      style={styles.sizeInput}
                    />
                    <Text style={styles.sizeUnit}>Optional for Call / Raise / All-in</Text>
                  </View>
                  {actionTimeline.filter((a) => a.street === logStreet).length ? (
                    <View style={styles.timeline}>
                      <Text style={styles.timelineText}>
                        {actionTimeline
                          .filter((a) => a.street === logStreet)
                          .map((a) => `${a.actor} ${a.action}${a.sizeBb != null ? ` ${a.sizeBb}bb` : ''}`)
                          .join('  →  ')}
                      </Text>
                      <Pressable onPress={undoLastAction} hitSlop={8}>
                        <Text style={styles.undoText}>Undo last</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.label}>Result (bb)</Text>
                <View style={styles.resultRow}>
                  <TextInput
                    value={resultDraft}
                    onChangeText={(raw) => {
                      const cleaned = raw.replace(/,/g, '.').replace(/[^\d.+-]/g, '');
                      setResultDraft(cleaned);
                      if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
                        return;
                      }
                      const n = Number(cleaned);
                      if (Number.isFinite(n)) setResultBb(n);
                    }}
                    onBlur={() => {
                      const n = Number(resultDraft.replace(/,/g, '.'));
                      const next = Number.isFinite(n) ? n : 0;
                      setResultBb(next);
                      setResultDraft(String(next));
                    }}
                    keyboardType="numbers-and-punctuation"
                    selectTextOnFocus
                    style={[
                      styles.resultInput,
                      resultBb > 0 && styles.plUp,
                      resultBb < 0 && styles.plDown,
                    ]}
                    placeholder="0"
                    placeholderTextColor={dash.textMuted}
                  />
                  <Text style={styles.resultUnit}>bb</Text>
                </View>
                <Text style={styles.hint}>Quick pick or type any amount (e.g. +7.5 / -12)</Text>
                <View style={styles.chips}>
                  {RESULT_CHIPS.map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => {
                        setResultBb(n);
                        setResultDraft(String(n));
                      }}
                      style={[styles.chip, resultBb === n && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, resultBb === n && styles.chipTextOn]}>
                        {n > 0 ? `+${n}` : String(n)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Why log it · pick one</Text>
                <View style={styles.chips}>
                  {TAGS.map((t) => {
                    const on = tags[0] === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setTags(on ? [] : [t])}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>
                          {t.replace(/_/g, ' ')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </ScrollView>

          {step !== 'mode' ? (
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  if (step === 'voice') setStep('mode');
                  else if (step === 'table')
                    setStep(mode === 'voice' ? 'voice' : 'mode');
                  else if (step === 'details') setStep('table');
                }}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryText}>Back</Text>
              </Pressable>

              {step === 'voice' ? (
                <Pressable
                  onPress={() => void parseVoice()}
                  disabled={!voiceText.trim() || parsing}
                  style={[
                    styles.primaryBtn,
                    (!voiceText.trim() || parsing) && styles.disabled,
                  ]}
                >
                  {parsing ? (
                    <ActivityIndicator color={dash.ctaText} />
                  ) : (
                    <Text style={styles.primaryText}>Parse → table</Text>
                  )}
                </Pressable>
              ) : null}

              {step === 'table' ? (
                <Pressable
                  onPress={() => setStep('details')}
                  disabled={!canLeaveTable}
                  style={[styles.primaryBtn, !canLeaveTable && styles.disabled]}
                >
                  <Text style={styles.primaryText}>Continue</Text>
                </Pressable>
              ) : null}

              {step === 'details' ? (
                <Pressable
                  onPress={save}
                  disabled={!canSave}
                  style={[styles.primaryBtn, !canSave && styles.disabled]}
                >
                  <Text style={styles.primaryText}>Save to Reviews</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '94%',
    backgroundColor: '#0d1520',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  kicker: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 24,
    marginTop: 2,
  },
  close: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 14 },
  scroll: { paddingBottom: 12, paddingTop: 10, gap: 6 },
  modeCol: { gap: 12, marginTop: 8 },
  modeCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: dash.border,
    backgroundColor: dash.surface,
    padding: 18,
    gap: 6,
  },
  modeVoice: {
    borderColor: 'rgba(168,85,247,0.4)',
    backgroundColor: 'rgba(168,85,247,0.1)',
  },
  modeTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  modeBody: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: { opacity: 0.9 },
  label: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 10,
    marginBottom: 6,
  },
  hint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    marginTop: 6,
  },
  parseHint: {
    color: dash.opsSoft,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    marginTop: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipOn: {
    backgroundColor: 'rgba(77,163,255,0.16)',
    borderColor: 'rgba(77,163,255,0.45)',
  },
  chipText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  chipTextOn: { color: dash.opsSoft },
  stage: {
    alignSelf: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  rim: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(4,11,22,0.34)',
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(143,196,255,0.3)',
  },
  felt: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(7,19,34,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(143,196,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  feltLabel: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  feltSub: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  feltLine: {
    maxWidth: '78%',
    color: dash.opsSoft,
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  seat: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(10,21,37,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(143,196,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  seatSelected: {
    borderColor: dash.ops,
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
  },
  seatHero: {
    backgroundColor: 'rgba(46,230,106,0.14)',
    borderColor: '#2EE66A',
  },
  seatFold: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderColor: 'rgba(255,255,255,0.12)',
    opacity: 0.58,
  },
  seatIn: {
    backgroundColor: 'rgba(77,163,255,0.28)',
    borderColor: '#4DA3FF',
  },
  seatText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  seatTextOn: { color: '#fff' },
  seatTag: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fonts.bodyBold,
    fontSize: 9,
  },
  actionBar: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dash.border,
    backgroundColor: dash.surface,
    padding: 10,
    gap: 8,
  },
  actionHint: {
    color: dash.textSecondary,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
  cardsShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(77,163,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.24)',
  },
  cardsShortcutText: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 12 },
  cardsShortcutArrow: { color: dash.opsSoft, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 18 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sizeRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sizeInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 108,
  },
  sizeUnit: { color: dash.textMuted, flex: 1, fontFamily: fonts.body, fontSize: 11 },
  timeline: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 5,
    paddingTop: 8,
  },
  timelineText: { color: dash.textSecondary, fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 17 },
  undoText: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 12 },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  actionHero: {
    backgroundColor: 'rgba(46,230,106,0.18)',
    borderColor: 'rgba(46,230,106,0.5)',
  },
  actionFold: {
    backgroundColor: 'rgba(239,68,68,0.16)',
    borderColor: 'rgba(239,68,68,0.45)',
  },
  actionCall: {
    backgroundColor: 'rgba(77,163,255,0.16)',
    borderColor: 'rgba(77,163,255,0.45)',
  },
  actionRaise: {
    backgroundColor: 'rgba(46,230,106,0.14)',
    borderColor: 'rgba(46,230,106,0.45)',
  },
  actionSoft: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionOn: {
    borderColor: '#fff',
    borderWidth: 2,
  },
  actionBtnText: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  voiceBox: {
    minHeight: 140,
    fontFamily: fonts.body,
    textAlignVertical: 'top',
  },
  feltStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  miniSeat: {
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  miniHero: {
    backgroundColor: 'rgba(46,230,106,0.22)',
    borderColor: '#2EE66A',
  },
  miniFold: { opacity: 0.45 },
  miniIn: {
    backgroundColor: 'rgba(77,163,255,0.2)',
    borderColor: 'rgba(77,163,255,0.45)',
  },
  miniSelected: {
    borderColor: '#fff',
    borderWidth: 2,
  },
  miniOut: {
    opacity: 0.35,
  },
  miniSeatPos: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  miniSeatAct: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    marginTop: 2,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  cardSlot: {
    width: 72,
    height: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  cardSlotSm: {
    width: 52,
    height: 70,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  cardSlotActive: {
    borderColor: dash.opsSoft,
    borderStyle: 'solid',
    backgroundColor: 'rgba(77,163,255,0.12)',
  },
  cardEmpty: {
    color: dash.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 28,
  },
  cardEmptySm: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  playingCard: {
    width: 64,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  playingCardSm: {
    width: 44,
    height: 60,
    borderRadius: 10,
  },
  playingRank: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
  },
  playingRankSm: { fontSize: 18 },
  playingSuit: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
  },
  playingSuitSm: { fontSize: 16 },
  pickToggle: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  pickTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pickTabOn: {
    backgroundColor: 'rgba(77,163,255,0.16)',
    borderColor: 'rgba(77,163,255,0.45)',
  },
  pickTabText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  pickTabTextOn: { color: dash.opsSoft },
  suitRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  suitBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  suitBtnOn: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  suitGlyph: {
    fontSize: 26,
    fontFamily: fonts.bodyBold,
  },
  rankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  rankBtn: {
    width: '13.5%',
    minWidth: 40,
    aspectRatio: 1,
    maxWidth: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankUsed: { opacity: 0.28 },
  rankText: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  rankTextUsed: { color: dash.textMuted },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  resultInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resultUnit: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  plUp: { color: '#2EE66A' },
  plDown: { color: '#F87171' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  secondaryText: { color: dash.textSecondary, fontFamily: fonts.bodyBold },
  primaryBtn: {
    flex: 1.4,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: dash.cta,
  },
  primaryText: { color: dash.ctaText, fontFamily: fonts.bodyBold, fontSize: 15 },
  disabled: { opacity: 0.45 },
});
