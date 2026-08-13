import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  coachApi,
  type CoachMessage,
  type CoachThreadSummary,
  type ParsedHandResult,
} from '../api/coachApi';
import { dashboardApi, type ReviewsPayload } from '../api/dashboardApi';
import { MiniCards } from '../components/community/MiniCards';
import { TabIcon } from '../components/TabIcon';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';
import { formatDuration, formatSignedMoney } from '../utils/money';
import type { KeyHand } from '../types/session';

type ReviewHand = KeyHand & { stakesLabel?: string; sessionStartedAt?: string };
type SessionRow = ReviewsPayload['sessions'][number];

const PROMPTS = [
  '3-bet or flat here?',
  'Is this a bluff spot?',
  'Size vs this range?',
];

function formatSessionWhen(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatThreadWhen(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function threadPreviewLine(content: string) {
  return content
    .replace(/^Attached hand from my sessions:\s*/i, '')
    .replace(/^\[Attached table screenshot:[^\]]*\]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type PhotoAttach = { kind: 'photo'; uri: string; name: string };
type HandAttach = { kind: 'hand'; hand: ReviewHand };
type Attachment = PhotoAttach | HandAttach;

type ParsedBubbleHand = {
  heroLine: string;
  holeCards: string[];
  meta: string[];
  rest: string | null;
};

function formatHandForCoach(hand: ReviewHand): string {
  const actions = hand.actions?.length
    ? hand.actions
        .map((a) => `${a.street} ${a.actor} ${a.action}`)
        .join(' · ')
    : null;
  let takeaway: string | null = null;
  if (hand.aiAnalysis) {
    try {
      const parsed = JSON.parse(hand.aiAnalysis) as { v?: number; verdict?: string };
      if (parsed?.v === 1 && parsed.verdict) takeaway = parsed.verdict;
    } catch {
      /* ignore */
    }
  }
  return [
    'Attached hand from my sessions:',
    `Hero ${hand.heroPosition ?? '?'} ${hand.holeCards?.join(' ') ?? ''}`.trim(),
    hand.board?.length ? `Board: ${hand.board.join(' ')}` : null,
    hand.stakesLabel || hand.stakes
      ? `Stakes: ${hand.stakesLabel ?? hand.stakes}${hand.potType ? ` · ${hand.potType}` : ''}`
      : null,
    hand.resultBb != null
      ? `Result: ${hand.resultBb >= 0 ? '+' : ''}${hand.resultBb} bb`
      : null,
    actions ? `Actions: ${actions}` : null,
    hand.tags?.length ? `Tags: ${hand.tags.join(', ')}` : null,
    takeaway ? `Takeaway: ${takeaway}` : hand.aiSummary ? `Note: ${hand.aiSummary}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildOutboundMessage(text: string, attachments: Attachment[]): string {
  const parts: string[] = [];
  for (const a of attachments) {
    if (a.kind === 'hand') parts.push(formatHandForCoach(a.hand));
    if (a.kind === 'photo') {
      parts.push(
        `[Attached table screenshot: ${a.name}]\nI attached a photo of the spot — coach from my question and ask if anything on the image is unclear.`,
      );
    }
  }
  if (text.trim()) parts.push(text.trim());
  if (!parts.length) return '';
  return parts.join('\n\n');
}

function parseHandBubble(content: string): ParsedBubbleHand | null {
  if (!content.includes('Attached hand from my sessions:')) return null;
  const chunks = content.split(/\n\n+/);
  const handBlock = chunks.find((c) => c.includes('Attached hand from my sessions:')) ?? '';
  const question = chunks.filter((c) => c !== handBlock).join('\n\n').trim() || null;
  const lines = handBlock
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => l !== 'Attached hand from my sessions:');
  const heroLine = lines.find((l) => l.startsWith('Hero ')) ?? lines[0] ?? 'Hand';
  const cardMatch = heroLine.match(/\b([2-9TJQKA][shdc])\s+([2-9TJQKA][shdc])\b/i);
  const holeCards = cardMatch ? [cardMatch[1], cardMatch[2]] : [];
  const meta = lines.filter((l) => l !== heroLine).slice(0, 4);
  return { heroLine, holeCards, meta, rest: question };
}

function plainCoachText(content: string) {
  return content
    .replace(/\*\*/g, '')
    .replace(/(^|\n)\s*[-*]\s+/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

function ChatBubble({ item }: { item: CoachMessage }) {
  const isUser = item.role === 'user';
  const hand = isUser ? parseHandBubble(item.content) : null;
  const [copied, setCopied] = useState(false);
  const displayContent = isUser ? item.content : plainCoachText(item.content);

  const copyReply = async () => {
    await Clipboard.setStringAsync(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (hand) {
    return (
      <View style={[styles.msgRow, styles.msgRowUser]}>
        <View style={[styles.bubble, styles.bubbleUser, styles.handBubble]}>
          <View style={styles.handBubbleTop}>
            {hand.holeCards.length ? (
              <MiniCards cards={hand.holeCards} size="sm" />
            ) : (
              <View style={styles.handBadge}>
                <TabIcon name="reviews" color={dash.opsSoft} size={16} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.handBubbleEyebrow}>SESSION HAND</Text>
              <Text style={styles.handBubbleTitle}>{hand.heroLine.replace(/^Hero\s+/i, 'Me · ')}</Text>
            </View>
          </View>
          {hand.meta.map((line) => (
            <Text key={line} style={styles.handBubbleMeta} numberOfLines={2}>
              {line}
            </Text>
          ))}
          {hand.rest ? (
            <View style={styles.handQuestion}>
              <Text style={styles.bubbleText}>{hand.rest}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
      {!isUser ? (
        <View style={styles.aiMark}>
          <TabIcon name="coach" color={dash.opsSoft} size={12} active />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
        {!isUser ? <Text style={styles.aiLabel}>Coach</Text> : null}
        {displayContent ? (
          <>
            <Text style={[styles.bubbleText, !isUser && styles.bubbleTextAi]}>{displayContent}</Text>
            {!isUser ? (
              <Pressable
                onPress={() => void copyReply()}
                accessibilityRole="button"
                accessibilityLabel="Copy Coach reply"
                hitSlop={8}
                style={({ pressed }) => [styles.copyReply, pressed && { opacity: 0.65 }]}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={15}
                  color={copied ? dash.cta : dash.opsSoft}
                />
              </Pressable>
            ) : null}
          </>
        ) : (
          <ActivityIndicator color={dash.opsSoft} size="small" />
        )}
      </View>
    </View>
  );
}

export function CoachScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<CoachMessage>>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [handDraft, setHandDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'chat' | 'hand'>('chat');
  const [lastParse, setLastParse] = useState<ParsedHandResult | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [handPickerOpen, setHandPickerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyThreads, setHistoryThreads] = useState<CoachThreadSummary[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<
    | { type: 'new'; fromHistory: boolean }
    | { type: 'delete'; id: string }
    | null
  >(null);
  const [sessionHands, setSessionHands] = useState<ReviewHand[]>([]);
  const [pickerSessions, setPickerSessions] = useState<SessionRow[]>([]);
  const [pickerSessionId, setPickerSessionId] = useState<string | null>(null);
  const [handsLoading, setHandsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const thread = await coachApi.getThread();
      setThreadId(thread.id);
      setMessages(thread.messages ?? []);
    } catch (e) {
      Alert.alert('Coach', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const threads = await coachApi.listThreads();
      setHistoryThreads(threads ?? []);
    } catch (e) {
      Alert.alert('History', (e as Error).message);
      setHistoryOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openThread = async (id: string) => {
    if (busy || id === threadId) {
      setHistoryOpen(false);
      return;
    }
    setBusy(true);
    try {
      const thread = await coachApi.getThread(id);
      setThreadId(thread.id);
      setMessages(thread.messages ?? []);
      setInput('');
      setAttachments([]);
      setMode('chat');
      setHistoryOpen(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
    } catch (e) {
      Alert.alert('Coach', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openHandPicker = async () => {
    setHandPickerOpen(true);
    setPickerSessionId(null);
    setHandsLoading(true);
    try {
      const reviews = await dashboardApi.getReviews();
      setPickerSessions(reviews.sessions ?? []);
      setSessionHands((reviews.keyHands ?? []) as ReviewHand[]);
    } catch (e) {
      Alert.alert('Hands', (e as Error).message);
      setHandPickerOpen(false);
    } finally {
      setHandsLoading(false);
    }
  };

  const pickerSession = useMemo(
    () => pickerSessions.find((s) => s.id === pickerSessionId) ?? null,
    [pickerSessions, pickerSessionId],
  );

  const handsInPickerSession = useMemo(() => {
    if (!pickerSessionId) return [] as ReviewHand[];
    return sessionHands.filter((h) => h.sessionId === pickerSessionId);
  }, [sessionHands, pickerSessionId]);

  const sessionsWithHands = useMemo(
    () =>
      pickerSessions.filter((s) =>
        sessionHands.some((h) => h.sessionId === s.id),
      ),
    [pickerSessions, sessionHands],
  );

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Allow photo access to attach a table screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `screenshot-${Date.now()}.jpg`;
    const photo: PhotoAttach = { kind: 'photo', uri: asset.uri, name };
    setAttachments((prev) => {
      const withoutPhoto = prev.filter((a) => a.kind !== 'photo');
      return [...withoutPhoto, photo].slice(0, 4);
    });
  };

  const attachHand = (hand: ReviewHand) => {
    const next: HandAttach = { kind: 'hand', hand };
    setAttachments((prev) => {
      if (prev.some((a) => a.kind === 'hand' && a.hand.id === hand.id)) return prev;
      return [...prev, next].slice(0, 4);
    });
    setPickerSessionId(null);
    setHandPickerOpen(false);
  };

  const removeAttach = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const createFreshChat = async (opts?: { closeHistory?: boolean }) => {
    setBusy(true);
    try {
      const thread = await coachApi.newThread();
      setThreadId(thread.id);
      setMessages(thread.messages);
      setInput('');
      setAttachments([]);
      setMode('chat');
      if (opts?.closeHistory) setHistoryOpen(false);
    } catch (e) {
      Alert.alert('Coach', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startNewChat = (fromHistory = false) => {
    if (busy) return;
    if (!messages.length) {
      setInput('');
      setAttachments([]);
      setMode('chat');
      if (fromHistory) setHistoryOpen(false);
      return;
    }
    setPendingConfirm({ type: 'new', fromHistory });
  };

  const deleteThread = (id: string) => {
    if (busy) return;
    setPendingConfirm({ type: 'delete', id });
  };

  const runPendingConfirm = async () => {
    const pending = pendingConfirm;
    setPendingConfirm(null);
    if (!pending) return;

    if (pending.type === 'new') {
      await createFreshChat({ closeHistory: pending.fromHistory });
      return;
    }

    setBusy(true);
    try {
      await coachApi.deleteThread(pending.id);
      setHistoryThreads((prev) => prev.filter((t) => t.id !== pending.id));
      if (pending.id === threadId) {
        const next = await coachApi.newThread();
        setThreadId(next.id);
        setMessages(next.messages ?? []);
        setInput('');
        setAttachments([]);
      }
    } catch (e) {
      Alert.alert('Coach', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmCopy =
    pendingConfirm?.type === 'delete'
      ? {
          title: 'Delete chat',
          body: 'Remove this thread from history? You can’t undo this.',
          confirmLabel: 'Delete',
          destructive: true,
        }
      : pendingConfirm?.type === 'new'
        ? {
            title: 'New chat',
            body: 'Start a fresh thread with Coach? This one stays in History.',
            confirmLabel: 'Start new',
            destructive: false,
          }
        : null;

  const sendChat = async () => {
    const outbound = buildOutboundMessage(input, attachments);
    if (!outbound || busy) return;
    setBusy(true);
    const keptInput = input;
    const keptAttach = attachments;
    const optimisticMessage: CoachMessage = {
      id: `pending-${Date.now()}`,
      role: 'user',
      content: outbound,
      createdAt: new Date().toISOString(),
    };
    const streamingMessage: CoachMessage = {
      id: `streaming-${Date.now()}`,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setInput('');
    setAttachments([]);
    setMessages((prev) => [...prev, optimisticMessage, streamingMessage]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    try {
      const thread = await coachApi.chatStream(outbound, threadId, {
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === streamingMessage.id
                ? { ...message, content: message.content + delta }
                : message,
            ),
          );
          setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
        },
      });
      setThreadId(thread.id);
      setMessages(thread.messages);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e) {
      setInput(keptInput);
      setAttachments(keptAttach);
      setMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== optimisticMessage.id && message.id !== streamingMessage.id,
        ),
      );
      Alert.alert('Coach', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const parseAndMaybeLog = async () => {
    const transcript = handDraft.trim();
    if (!transcript || busy) return;
    setBusy(true);
    try {
      const parsed = await coachApi.parseHand(transcript);
      setLastParse(parsed);

      const snap = await dashboardApi.getSnapshot();
      const live = snap.activeSession?.status === 'live' ? snap.activeSession : null;
      if (!live) {
        Alert.alert(
          parsed.hand.summary ?? 'Parsed hand',
          `${JSON.stringify(parsed.hand.heroHoleCards ?? [])}\nConfidence ${Math.round(parsed.confidence * 100)}%\n\nStart a live session on Daily to save this as a key hand.`,
        );
        return;
      }

      const hand = await dashboardApi.addKeyHand(live.id, {
        source: 'text',
        tags: parsed.hand.tags?.length ? parsed.hand.tags : ['study'],
        heroPosition: parsed.hand.heroPosition ?? undefined,
        holeCards: parsed.hand.heroHoleCards ?? undefined,
        board: parsed.hand.board ?? undefined,
        resultBb: parsed.hand.resultBb ?? undefined,
        aiSummary: parsed.hand.summary ?? undefined,
        rawInput: transcript,
        stakes: parsed.hand.stakes ?? live.stakesLabel,
      });
      setHandDraft('');
      Alert.alert(
        'Logged to session',
        hand.aiSummary ?? hand.holeCards?.join(' ') ?? 'Key hand saved.',
      );
    } catch (e) {
      Alert.alert('Parse hand', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const canSend = Boolean(buildOutboundMessage(input, attachments)) && !busy;

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={dash.ops} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={[styles.flex, { paddingTop: insets.top + 6 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>TABLE TALK</Text>
            <Text style={styles.title}>Coach</Text>
            <Text style={styles.sub}>Spots, sizing, and second opinions.</Text>
          </View>
          <View style={styles.headerActions}>
            {mode === 'chat' ? (
              <>
                <Pressable
                  onPress={() => void openHistory()}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.headerChip,
                    pressed && { opacity: 0.88 },
                    busy && { opacity: 0.5 },
                  ]}
                >
                  <Ionicons name="time-outline" size={16} color={dash.text} />
                  <Text style={styles.headerChipText}>History</Text>
                </Pressable>
                <Pressable
                  onPress={() => startNewChat()}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.headerChip,
                    pressed && { opacity: 0.88 },
                    busy && { opacity: 0.5 },
                  ]}
                >
                  <Text style={styles.headerChipText}>New</Text>
                </Pressable>
              </>
            ) : null}
            <LinearGradient
              colors={[dash.opsSoft, dash.ops, dash.opsDeep]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.headerBadge}
            >
              <TabIcon name="coach" color="#fff" size={20} active />
            </LinearGradient>
          </View>
        </View>

        <View style={styles.segmentTrack}>
          <Pressable
            onPress={() => setMode('chat')}
            style={[styles.segment, mode === 'chat' && styles.segmentOn]}
          >
            <Text style={[styles.segmentText, mode === 'chat' && styles.segmentTextOn]}>
              Chat
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('hand')}
            style={[styles.segment, mode === 'hand' && styles.segmentOn]}
          >
            <Text style={[styles.segmentText, mode === 'hand' && styles.segmentTextOn]}>
              Log hand
            </Text>
          </Pressable>
        </View>

        {mode === 'chat' ? (
          <>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.list}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}>
                    <TabIcon name="coach" color={dash.opsSoft} size={28} />
                  </View>
                  <Text style={styles.emptyTitle}>What’s the spot?</Text>
                  <Text style={styles.emptyBody}>
                    Ask freely — or attach a screenshot / logged hand for a sharper read.
                  </Text>
                  <View style={styles.promptRow}>
                    {PROMPTS.map((p) => (
                      <Pressable
                        key={p}
                        onPress={() => setInput(p)}
                        style={({ pressed }) => [
                          styles.promptChip,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text style={styles.promptText}>{p}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              }
              renderItem={({ item }) => <ChatBubble item={item} />}
            />

            {attachments.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.attachStrip}
              >
                {attachments.map((a, i) => (
                  <View key={`${a.kind}-${i}`} style={styles.attachChip}>
                    {a.kind === 'photo' ? (
                      <Image source={{ uri: a.uri }} style={styles.attachThumb} />
                    ) : (
                      <MiniCards
                        cards={a.hand.holeCards?.length ? a.hand.holeCards : ['?', '?']}
                        size="sm"
                      />
                    )}
                    <View style={{ flex: 1, minWidth: 72 }}>
                      <Text style={styles.attachKind}>
                        {a.kind === 'photo' ? 'PHOTO' : 'HAND'}
                      </Text>
                      <Text style={styles.attachLabel} numberOfLines={1}>
                        {a.kind === 'photo'
                          ? a.name
                          : `${a.hand.heroPosition ?? '?'} ${a.hand.holeCards?.join(' ') ?? ''}`}
                      </Text>
                    </View>
                    <Pressable onPress={() => removeAttach(i)} hitSlop={8}>
                      <Text style={styles.attachRemove}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.dock}>
              <View style={styles.attachActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => void pickPhoto()}
                  style={({ pressed }) => [
                    styles.toolBtn,
                    styles.toolPhoto,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Ionicons name="camera-outline" size={16} color={dash.opsSoft} />
                  <Text style={styles.toolLabel}>Photo</Text>
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() => void openHandPicker()}
                  style={({ pressed }) => [
                    styles.toolBtn,
                    styles.toolHand,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <TabIcon name="reviews" color={dash.cta} size={16} />
                  <Text style={[styles.toolLabel, { color: dash.cta }]}>Hand</Text>
                </Pressable>
              </View>

              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder={
                    attachments.length
                      ? 'What should we focus on?'
                      : 'Ask about a line, size, or range…'
                  }
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  multiline
                  editable={!busy}
                />
                <Pressable
                  onPress={() => void sendChat()}
                  disabled={!canSend}
                  style={[styles.send, !canSend && styles.sendDisabled]}
                >
                  {busy ? (
                    <ActivityIndicator color={dash.ctaText} />
                  ) : (
                    <Text style={styles.sendText}>Send</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.handPane}>
            <View style={styles.handCard}>
              <Text style={styles.handCardKicker}>VOICE → STRUCTURE</Text>
              <Text style={styles.handCardTitle}>Paste the hand</Text>
              <Text style={styles.handHint}>
                We’ll parse cards and position, then save to your live Daily session if one is
                running.
              </Text>
              <TextInput
                style={[styles.input, styles.handInput]}
                value={handDraft}
                onChangeText={setHandDraft}
                placeholder="BTN AhKd, flop Qh9c2d, I bet 33%…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                multiline
                textAlignVertical="top"
                editable={!busy}
              />
              {lastParse ? (
                <Text style={styles.parseMeta}>
                  Last parse · {Math.round(lastParse.confidence * 100)}% ·{' '}
                  {lastParse.source ?? '—'} · {lastParse.hand.summary}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => void parseAndMaybeLog()}
              disabled={busy || !handDraft.trim()}
              style={[
                styles.send,
                styles.handCta,
                (!handDraft.trim() || busy) && styles.sendDisabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={dash.ctaText} />
              ) : (
                <Text style={styles.sendText}>Parse & log</Text>
              )}
            </Pressable>
          </View>
        )}

        <Modal
          visible={historyOpen || Boolean(pendingConfirm)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (pendingConfirm) setPendingConfirm(null);
            else setHistoryOpen(false);
          }}
        >
          <View style={styles.pickerBackdrop}>
            {historyOpen ? (
              <View style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <View style={styles.pickerHead}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.pickerEyebrow}>Coach</Text>
                    <Text style={styles.pickerTitle}>Chat history</Text>
                    <Text style={styles.pickerSub}>
                      Reopen a past spot, start a new one, or delete old threads.
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setPendingConfirm(null);
                      setHistoryOpen(false);
                    }}
                    hitSlop={10}
                  >
                    <Text style={styles.close}>Close</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => startNewChat(true)}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.historyNewBtn,
                    pressed && { opacity: 0.9 },
                    busy && { opacity: 0.5 },
                  ]}
                >
                  <Ionicons name="add" size={18} color={dash.ctaText} />
                  <Text style={styles.historyNewBtnText}>New chat</Text>
                </Pressable>

                {historyLoading ? (
                  <ActivityIndicator color={dash.ops} style={{ marginTop: 24 }} />
                ) : historyThreads.length === 0 ? (
                  <Text style={styles.emptyBody}>
                    No past chats yet — send a question and it’ll show up here.
                  </Text>
                ) : (
                  <FlatList
                    data={historyThreads}
                    keyExtractor={(t) => t.id}
                    contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
                    renderItem={({ item }) => {
                      const active = item.id === threadId;
                      return (
                        <View
                          style={[
                            styles.historyCard,
                            active && styles.historyCardActive,
                          ]}
                        >
                          <Pressable
                            onPress={() => void openThread(item.id)}
                            style={({ pressed }) => [
                              styles.historyCardBody,
                              pressed && { opacity: 0.92 },
                            ]}
                          >
                            <View style={styles.historyTop}>
                              <Text style={styles.historyWhen}>
                                {formatThreadWhen(item.updatedAt)}
                              </Text>
                              <Text style={styles.historyCount}>
                                {item.messageCount} msgs
                              </Text>
                            </View>
                            <Text style={styles.historyPreview} numberOfLines={2}>
                              {threadPreviewLine(item.preview) || 'Chat'}
                            </Text>
                            {active ? (
                              <Text style={styles.historyActiveLabel}>Open now</Text>
                            ) : null}
                          </Pressable>
                          <Pressable
                            onPress={() => deleteThread(item.id)}
                            disabled={busy}
                            hitSlop={8}
                            style={({ pressed }) => [
                              styles.historyDeleteBtn,
                              pressed && { opacity: 0.75 },
                              busy && { opacity: 0.45 },
                            ]}
                          >
                            <Ionicons name="trash-outline" size={18} color="#FF8B8B" />
                          </Pressable>
                        </View>
                      );
                    }}
                  />
                )}
              </View>
            ) : null}

            {confirmCopy ? (
              <View style={styles.confirmOverlay} pointerEvents="box-none">
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setPendingConfirm(null)}
                />
                <View style={styles.confirmCard}>
                  <Text style={styles.confirmTitle}>{confirmCopy.title}</Text>
                  <Text style={styles.confirmBody}>{confirmCopy.body}</Text>
                  <View style={styles.confirmActions}>
                    <Pressable
                      onPress={() => setPendingConfirm(null)}
                      style={({ pressed }) => [
                        styles.confirmCancelBtn,
                        pressed && { opacity: 0.88 },
                      ]}
                    >
                      <Text style={styles.confirmCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void runPendingConfirm()}
                      style={({ pressed }) => [
                        styles.confirmOkBtn,
                        confirmCopy.destructive && styles.confirmOkBtnDanger,
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.confirmOkText,
                          confirmCopy.destructive && styles.confirmOkTextDanger,
                        ]}
                      >
                        {confirmCopy.confirmLabel}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </Modal>

        <Modal
          visible={handPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (pickerSessionId) setPickerSessionId(null);
            else setHandPickerOpen(false);
          }}
        >
          <View style={styles.pickerBackdrop}>
            <View style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.pickerHead}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.pickerEyebrow}>
                    {pickerSession ? 'Session hands' : 'Attach from'}
                  </Text>
                  <Text style={styles.pickerTitle}>
                    {pickerSession ? pickerSession.stakesLabel : 'Your sessions'}
                  </Text>
                  {pickerSession ? (
                    <Text style={styles.pickerSub}>
                      {[
                        pickerSession.status === 'live' ? 'Live' : 'Ended',
                        formatSessionWhen(pickerSession.startedAt),
                        formatDuration(pickerSession.durationSeconds),
                        pickerSession.profitLossCents != null
                          ? formatSignedMoney(pickerSession.profitLossCents, 'USD')
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  ) : (
                    <Text style={styles.pickerSub}>
                      Pick a session, then attach the hand you want coached.
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => {
                    if (pickerSessionId) setPickerSessionId(null);
                    else setHandPickerOpen(false);
                  }}
                  hitSlop={10}
                >
                  <Text style={styles.close}>{pickerSessionId ? 'Back' : 'Close'}</Text>
                </Pressable>
              </View>

              {handsLoading ? (
                <ActivityIndicator color={dash.ops} style={{ marginTop: 24 }} />
              ) : !pickerSessionId ? (
                sessionsWithHands.length === 0 ? (
                  <Text style={styles.emptyBody}>
                    No session hands yet — log one in Reviews first.
                  </Text>
                ) : (
                  <FlatList
                    data={sessionsWithHands}
                    keyExtractor={(s) => s.id}
                    contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
                    renderItem={({ item }) => {
                      const live = item.status === 'live';
                      const count = sessionHands.filter((h) => h.sessionId === item.id).length;
                      const when = formatSessionWhen(item.startedAt);
                      return (
                        <Pressable
                          onPress={() => setPickerSessionId(item.id)}
                          style={({ pressed }) => [
                            styles.sessionPickCard,
                            live && styles.sessionPickLive,
                            pressed && { opacity: 0.92 },
                          ]}
                        >
                          <View style={styles.sessionPickTop}>
                            <Text style={styles.sessionPickTitle}>{item.stakesLabel}</Text>
                            <View
                              style={[
                                styles.sessionPill,
                                live ? styles.pillLive : styles.pillEnded,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.sessionPillText,
                                  live && styles.sessionPillLiveText,
                                ]}
                              >
                                {live ? 'LIVE' : 'ENDED'}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.sessionPickPl,
                              item.profitLossCents != null &&
                                item.profitLossCents > 0 &&
                                styles.plUp,
                              item.profitLossCents != null &&
                                item.profitLossCents < 0 &&
                                styles.plDown,
                            ]}
                          >
                            {item.profitLossCents != null
                              ? formatSignedMoney(item.profitLossCents, 'USD')
                              : 'In progress'}
                          </Text>
                          <Text style={styles.sessionPickMeta}>
                            {[when, formatDuration(item.durationSeconds), `${count} hands`]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                          <Text style={styles.sessionPickCta}>Open hands →</Text>
                        </Pressable>
                      );
                    }}
                  />
                )
              ) : handsInPickerSession.length === 0 ? (
                <Text style={styles.emptyBody}>This session has no logged hands.</Text>
              ) : (
                <FlatList
                  data={handsInPickerSession}
                  keyExtractor={(h) => h.id}
                  contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
                  renderItem={({ item }) => {
                    const up = (item.resultBb ?? 0) > 0;
                    const down = (item.resultBb ?? 0) < 0;
                    return (
                      <Pressable
                        onPress={() => attachHand(item)}
                        style={({ pressed }) => [
                          styles.handPickRow,
                          pressed && { opacity: 0.9 },
                        ]}
                      >
                        <MiniCards
                          cards={item.holeCards?.length ? item.holeCards : ['?', '?']}
                          size="sm"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.handPickTitle}>
                            Me · {item.heroPosition ?? '?'}
                          </Text>
                          <Text style={styles.handPickMeta} numberOfLines={1}>
                            {[
                              item.potType?.toUpperCase(),
                              item.board?.length ? `board ${item.board.length}` : null,
                              item.tags?.[0]?.replace(/_/g, ' '),
                              item.reviewStatus === 'reviewed' ? 'reviewed' : 'to review',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        </View>
                        {item.resultBb != null ? (
                          <Text
                            style={[
                              styles.handPickResult,
                              up && styles.plUp,
                              down && styles.plDown,
                            ]}
                          >
                            {item.resultBb >= 0 ? '+' : ''}
                            {item.resultBb}bb
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  }}
                />
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  headerText: { flex: 1, gap: 2 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerChipText: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
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
  sub: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  headerBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  segmentTrack: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentOn: {
    backgroundColor: 'rgba(77,163,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.35)',
  },
  segmentText: {
    color: 'rgba(255,255,255,0.42)',
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  segmentTextOn: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
  },

  list: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 12,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(77,163,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.22)',
    marginBottom: 4,
  },
  emptyTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  emptyBody: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  promptChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  promptText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },
  aiMark: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(77,163,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.28)',
    marginBottom: 2,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxWidth: '86%',
  },
  bubbleUser: {
    backgroundColor: 'rgba(77,163,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.28)',
    borderBottomRightRadius: 6,
  },
  bubbleAi: {
    backgroundColor: 'rgba(26,34,56,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 6,
  },
  aiLabel: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 4,
  },
  bubbleText: {
    color: dash.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  bubbleTextAi: {
    color: 'rgba(255,255,255,0.88)',
  },
  copyReply: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    marginTop: 5,
    width: 28,
  },

  handBubble: {
    gap: 6,
    maxWidth: '92%',
  },
  handBubbleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  handBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(77,163,255,0.12)',
  },
  handBubbleEyebrow: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  handBubbleTitle: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: 1,
  },
  handBubbleMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  handQuestion: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },

  attachStrip: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  attachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(20,26,44,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.28)',
    maxWidth: 220,
  },
  attachThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  attachKind: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  attachLabel: {
    color: dash.text,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    marginTop: 1,
  },
  attachRemove: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    paddingHorizontal: 4,
  },

  dock: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(16,22,38,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  attachActions: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  toolPhoto: {
    backgroundColor: 'rgba(77,163,255,0.1)',
    borderColor: 'rgba(77,163,255,0.22)',
  },
  toolHand: {
    backgroundColor: 'rgba(46,230,106,0.08)',
    borderColor: 'rgba(46,230,106,0.22)',
  },
  toolLabel: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: dash.text,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  send: {
    backgroundColor: dash.cta,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: dash.ctaText, fontFamily: fonts.bodyBold, fontSize: 14 },

  handPane: { flex: 1, paddingHorizontal: 16, gap: 12, paddingBottom: 12 },
  handCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    backgroundColor: 'rgba(20,26,44,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  handCardKicker: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  handCardTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  handHint: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  handInput: { flex: 1, minHeight: 140, maxHeight: undefined },
  handCta: { alignSelf: 'stretch' },
  parseMeta: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,8,18,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(4,8,18,0.72)',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 20,
    gap: 10,
    backgroundColor: '#12182A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  confirmTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  confirmBody: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  confirmCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  confirmCancelText: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  confirmOkBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: dash.cta,
  },
  confirmOkBtnDanger: {
    backgroundColor: 'rgba(255,107,107,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,139,139,0.45)',
  },
  confirmOkText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  confirmOkTextDanger: {
    color: '#FFB0B0',
  },
  pickerSheet: {
    maxHeight: '78%',
    backgroundColor: '#0E1422',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pickerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  pickerEyebrow: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 2,
  },
  pickerTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 26,
    letterSpacing: -0.4,
  },
  pickerSub: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  close: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 14, marginTop: 4 },
  sessionPickCard: {
    borderRadius: 18,
    padding: 14,
    gap: 6,
    backgroundColor: dash.surface,
    borderWidth: 1,
    borderColor: dash.border,
  },
  historyCard: {
    borderRadius: 18,
    padding: 14,
    gap: 8,
    backgroundColor: dash.surface,
    borderWidth: 1,
    borderColor: dash.border,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  historyCardActive: {
    borderColor: 'rgba(77,163,255,0.45)',
    backgroundColor: 'rgba(77,163,255,0.08)',
  },
  historyCardBody: {
    flex: 1,
    gap: 8,
    paddingRight: 8,
  },
  historyNewBtn: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: dash.cta,
  },
  historyNewBtnText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  historyDeleteBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,139,139,0.1)',
  },
  historyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyWhen: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  historyCount: {
    color: 'rgba(255,255,255,0.38)',
    fontFamily: fonts.body,
    fontSize: 12,
  },
  historyPreview: {
    color: dash.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
  },
  historyActiveLabel: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  sessionPickLive: {
    borderColor: 'rgba(46,230,106,0.4)',
    backgroundColor: 'rgba(46,230,106,0.06)',
  },
  sessionPickTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sessionPickTitle: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  sessionPill: {
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
  sessionPillText: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  sessionPillLiveText: { color: dash.cta },
  sessionPickPl: {
    color: dash.textSecondary,
    fontFamily: fonts.displayBold,
    fontSize: 20,
  },
  plUp: { color: dash.profit },
  plDown: { color: dash.loss },
  sessionPickMeta: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  sessionPickCta: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    marginTop: 2,
  },
  handPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: dash.surface,
    borderWidth: 1,
    borderColor: dash.border,
  },
  handPickTitle: {
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  handPickMeta: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  handPickResult: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dash.text,
  },
});
