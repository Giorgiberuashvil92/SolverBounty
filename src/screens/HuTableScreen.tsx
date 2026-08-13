import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HuSocket,
  type HuClientAction,
  type HuView,
} from '../api/huSocket';
import { useAuth } from '../auth/AuthContext';
import { HuActionBar } from '../components/hu/HuActionBar';
import { HuMatchResult } from '../components/hu/HuMatchResult';
import { HuQueueModal } from '../components/hu/HuQueueModal';
import { HuTable } from '../components/hu/HuTable';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';

type Props = {
  onClose: () => void;
  onPlayAgain?: () => void;
};

const MATCH_END_PAUSE_MS = 3200;

export function HuTableScreen({ onClose, onPlayAgain }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const socketRef = useRef<HuSocket | null>(null);
  const [phase, setPhase] = useState<'connecting' | 'queued' | 'matched' | 'done'>(
    'connecting',
  );
  const [opponent, setOpponent] = useState<string | null>(null);
  const [view, setView] = useState<HuView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showQueue, setShowQueue] = useState(true);
  const [disconnectNote, setDisconnectNote] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (view?.status !== 'match_over') {
      setShowResult(false);
      overlayOpacity.setValue(0);
      resultOpacity.setValue(0);
      return;
    }

    overlayOpacity.setValue(0);
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      setShowResult(true);
      resultOpacity.setValue(0);
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, MATCH_END_PAUSE_MS);

    return () => clearTimeout(timer);
  }, [view?.status, overlayOpacity, resultOpacity]);

  useEffect(() => {
    const sock = new HuSocket();
    socketRef.current = sock;
    let cancelled = false;

    (async () => {
      try {
        await sock.connect({
          onMatchFound: (info) => {
            if (cancelled) return;
            setOpponent(info.opponent);
            setPhase('matched');
            setShowQueue(true);
            sock.sync();
            setTimeout(() => setShowQueue(false), 1600);
          },
          onTableState: (v) => {
            if (cancelled) return;
            setView(v);
            setPhase(v.status === 'match_over' ? 'done' : 'matched');
            if (v.status === 'match_over') setShowQueue(false);
          },
          onOpponentDisconnected: () => {
            setDisconnectNote('Opponent disconnected — 30s grace');
          },
          onOpponentForfeit: () => {
            setDisconnectNote('Opponent forfeited');
          },
          onError: (msg) => {
            if (!cancelled) setError(msg);
          },
        });
        if (cancelled) return;
        const res = await sock.joinQueue();
        if (res.status === 'queued') {
          setPhase('queued');
          setShowQueue(true);
        } else if (res.status === 'matched' || res.status === 'rejoined') {
          setPhase('matched');
          setShowQueue(false);
          sock.sync();
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      void sock.leaveQueue().catch(() => undefined);
      sock.disconnect();
    };
  }, []);

  const onAction = async (action: HuClientAction) => {
    if (!socketRef.current || busy) return;
    setBusy(true);
    try {
      const res = await socketRef.current.sendAction(action);
      if (!res.ok) Alert.alert('Action', res.error ?? 'Failed');
    } catch (e) {
      Alert.alert('Action', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    try {
      await socketRef.current?.leaveQueue();
    } catch {
      /* ignore */
    }
    socketRef.current?.disconnect();
    onClose();
  };

  const playAgain = async () => {
    try {
      await socketRef.current?.leaveQueue();
    } catch {
      /* ignore */
    }
    socketRef.current?.disconnect();
    if (onPlayAgain) onPlayAgain();
    else onClose();
  };

  const youWon =
    view?.status === 'match_over' &&
    view.winnerUserId != null &&
    view.winnerUserId === view.heroUserId;

  if (view?.status === 'match_over' && showResult) {
    return (
      <Animated.View style={[styles.root, { opacity: resultOpacity }]}>
        <HuMatchResult
          view={view}
          youWon={Boolean(youWon)}
          onBack={() => void leave()}
          onPlayAgain={() => void playAgain()}
        />
      </Animated.View>
    );
  }

  const matchEnding = view?.status === 'match_over';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 4 }]}>
      <LinearGradient
        colors={['#151A32', dash.bg, '#080C18']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topBar}>
        <Pressable onPress={() => void leave()} hitSlop={10} style={styles.leaveBtn}>
          <Text style={styles.leave}>Leave</Text>
        </Pressable>
        <View style={styles.topMid}>
          <Text style={styles.kicker}>HU ONLINE</Text>
          <Text style={styles.title} numberOfLines={1}>
            {opponent ? `vs ${opponent}` : 'Matchmaking'}
          </Text>
        </View>
        {view ? (
          <View style={styles.handPill}>
            <Text style={styles.handNum}>H{view.handNumber}</Text>
          </View>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {disconnectNote ? (
        <Text style={styles.note}>{disconnectNote}</Text>
      ) : null}

      {view ? (
        <View style={styles.tableArea}>
          <HuTable view={view} />
          {matchEnding ? (
            <Animated.View
              style={[styles.matchOverlay, { opacity: overlayOpacity }]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={
                  youWon
                    ? ['rgba(46,230,106,0.28)', 'rgba(11,16,32,0.55)', 'rgba(8,12,24,0.88)']
                    : ['rgba(255,77,94,0.32)', 'rgba(11,16,32,0.55)', 'rgba(8,12,24,0.88)']
                }
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.matchOutcome}>{youWon ? 'VICTORY' : 'DEFEAT'}</Text>
              <Text style={styles.matchWinner}>
                {view.winnerName ?? 'Winner'} takes the match
              </Text>
              <Text style={styles.matchHint}>H{view.handNumber} · final hand</Text>
            </Animated.View>
          ) : null}
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            {error ?? 'Connecting to HU arena…'}
          </Text>
        </View>
      )}

      {view ? (
        <View
          style={[
            styles.actions,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <HuActionBar
            view={view}
            disabled={busy}
            onAction={(a) => void onAction(a)}
          />
        </View>
      ) : null}

      <HuQueueModal
        visible={showQueue && phase !== 'done'}
        searching={phase === 'queued' || phase === 'connecting'}
        heroName={user?.displayName ?? 'You'}
        opponent={opponent}
        error={error}
        onCancel={() => {
          if (phase === 'matched' && view) {
            setShowQueue(false);
            return;
          }
          void leave();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dash.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  leaveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: dash.opsDim,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.25)',
  },
  leave: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  topMid: { flex: 1, alignItems: 'center' },
  kicker: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  handPill: {
    minWidth: 44,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: dash.border,
  },
  handNum: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  note: {
    textAlign: 'center',
    color: dash.warning,
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 4,
  },
  tableArea: {
    flex: 1,
    justifyContent: 'center',
  },
  matchOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  matchOutcome: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 44,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  matchWinner: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    textAlign: 'center',
  },
  matchHint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 4,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholderText: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: dash.border,
    backgroundColor: 'rgba(11,16,32,0.92)',
  },
});
