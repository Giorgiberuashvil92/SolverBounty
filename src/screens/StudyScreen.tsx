import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HAND_GRID, type HandCell, type Strategy } from '../data/hands';
import {
  PositionTable,
  type Position,
} from '../components/study/PositionTable';
import { studyApi, type StudyCellOverride } from '../api/studyApi';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';

const RANGE_COLORS = {
  raise: dash.ops,
  call: dash.cta,
  fold: dash.loss,
} as const;

function mergeGrid(
  overrides: Record<string, StudyCellOverride>,
): HandCell[][] {
  return HAND_GRID.map((row) =>
    row.map((cell) => {
      const o = overrides[cell.label];
      if (!o) return cell;
      return {
        ...cell,
        strategy: { raise: o.raise, call: o.call, fold: o.fold },
        note: o.note,
      } as HandCell & { note?: string };
    }),
  );
}

function dominantAction(strategy: Strategy) {
  if (strategy.raise >= strategy.call && strategy.raise >= strategy.fold) {
    return 'raise';
  }
  if (strategy.call >= strategy.fold) return 'call';
  return 'fold';
}

function cellTint(strategy: Strategy) {
  const dominant = dominantAction(strategy);
  if (dominant === 'raise') {
    return `rgba(77,163,255,${0.14 + strategy.raise * 0.56})`;
  }
  if (dominant === 'call') {
    return `rgba(46,230,106,${0.16 + strategy.call * 0.66})`;
  }
  return `rgba(255,77,94,${0.08 + strategy.fold * 0.2})`;
}

export function StudyScreen({
  embedded = false,
  onClose,
}: {
  embedded?: boolean;
  onClose?: () => void;
} = {}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [position, setPosition] = useState<Position>('BTN');
  const [overrides, setOverrides] = useState<Record<string, StudyCellOverride>>(
    {},
  );
  const [grid, setGrid] = useState(HAND_GRID);
  const [selectedLabel, setSelectedLabel] = useState(HAND_GRID[0][0].label);
  const [raisePct, setRaisePct] = useState('100');
  const [callPct, setCallPct] = useState('0');
  const [foldPct, setFoldPct] = useState('0');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => {
    for (const row of grid) {
      const hit = row.find((c) => c.label === selectedLabel);
      if (hit) return hit;
    }
    return grid[0][0];
  }, [grid, selectedLabel]);

  const syncEditor = (cell: HandCell, cells: Record<string, StudyCellOverride>) => {
    setSelectedLabel(cell.label);
    setRaisePct(String(Math.round(cell.strategy.raise * 100)));
    setCallPct(String(Math.round(cell.strategy.call * 100)));
    setFoldPct(String(Math.round(cell.strategy.fold * 100)));
    setNote(cells[cell.label]?.note ?? '');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await studyApi.getRange(position);
        if (cancelled) return;
        const cells = data.cells ?? {};
        setOverrides(cells);
        const next = mergeGrid(cells);
        setGrid(next);
        const cell = next.flat().find((c) => c.label === selectedLabel) ?? next[0][0];
        syncEditor(cell, cells);
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Study', (e as Error).message);
          setOverrides({});
          setGrid(HAND_GRID);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Reload when position changes only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const onSelectPosition = (pos: Position) => {
    setPosition(pos);
  };

  const saveCell = async () => {
    const r = Math.max(0, Number(raisePct) || 0);
    const c = Math.max(0, Number(callPct) || 0);
    const f = Math.max(0, Number(foldPct) || 0);
    const sum = r + c + f;
    if (!sum) {
      Alert.alert('Study', 'Enter raise / call / fold percentages.');
      return;
    }
    const strategy: Strategy = {
      raise: r / sum,
      call: c / sum,
      fold: f / sum,
    };
    setSaving(true);
    try {
      const payload = {
        [selectedLabel]: {
          ...strategy,
          note: note.trim() || undefined,
        },
      };
      const data = await studyApi.upsertRange(position, payload);
      setOverrides(data.cells);
      const next = mergeGrid(data.cells);
      setGrid(next);
      Alert.alert('Saved', `${selectedLabel} @ ${position}`);
    } catch (e) {
      Alert.alert('Study', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const gap = 1;
  const sidePad = 10;
  const reserved = insets.top + 50 + 46 + 128 + 52;
  const availH = Math.max(180, height - reserved);
  const availW = width - sidePad * 2;
  const cell = Math.max(
    16,
    Math.min(
      Math.floor((availW - gap * 12) / 13),
      Math.floor((availH - gap * 12) / 13),
    ),
  );
  const gridSize = cell * 13 + gap * 12;
  const fontSize = cell >= 26 ? 9 : cell >= 22 ? 8 : 7;

  const bars = useMemo(() => {
    const { raise, call, fold } = selected.strategy;
    return [
      { key: 'R', label: 'Raise', pct: raise, color: RANGE_COLORS.raise },
      { key: 'C', label: 'Call', pct: call, color: RANGE_COLORS.call },
      { key: 'F', label: 'Fold', pct: fold, color: RANGE_COLORS.fold },
    ].filter((b) => b.pct > 0.005);
  }, [selected]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 4 }]}>
      <LinearGradient
        colors={['#151A32', dash.bg, '#080C18']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {embedded && onClose ? (
            <Pressable onPress={onClose} hitSlop={10} style={styles.doneBtn}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>RANGE LAB</Text>
          <Text style={styles.title}>
            {position} Open
          </Text>
        </View>
        <View style={styles.headerSide}>
          {loading ? <ActivityIndicator color={dash.ops} /> : null}
        </View>
      </View>

      <PositionTable selected={position} onSelect={onSelectPosition} />

      <View style={styles.gridWrap}>
        <LinearGradient
          colors={['rgba(77,163,255,0.16)', 'rgba(20,26,44,0.96)', 'rgba(10,14,26,0.96)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.matrixPanel}
        >
          <View style={[styles.grid, { width: gridSize }]}>
            {grid.map((row, ri) => (
              <View key={ri} style={styles.row}>
                {row.map((cellData) => {
                  const active = selectedLabel === cellData.label;
                  const inRange =
                    cellData.strategy.raise > 0.05 || cellData.strategy.call > 0.05;
                  const custom = Boolean(overrides[cellData.label]);
                  const dominant = dominantAction(cellData.strategy);
                  const callAlpha = Math.min(0.6, cellData.strategy.call * 0.5);
                  const bg = cellTint(cellData.strategy);

                  return (
                    <Pressable
                      key={cellData.label}
                      onPress={() => syncEditor(cellData, overrides)}
                      style={[
                        styles.cell,
                        {
                          width: cell,
                          height: cell,
                          backgroundColor: bg,
                          borderColor: active
                            ? dash.opsSoft
                            : custom
                              ? 'rgba(143,196,255,0.7)'
                              : 'rgba(0,0,0,0.28)',
                        },
                        callAlpha > 0.02 && { shadowColor: dash.ops, shadowOpacity: callAlpha, shadowRadius: 4 },
                        active && styles.cellActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          {
                            fontSize,
                            color: !inRange
                              ? dash.textMuted
                              : dominant === 'call'
                                ? '#06170E'
                                : '#FFFFFF',
                          },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                          {cellData.label}
                      </Text>
                      <View style={styles.cellMix}>
                        <View
                          style={[
                            styles.mixPart,
                            {
                              flex: Math.max(cellData.strategy.raise, 0.02),
                              backgroundColor: RANGE_COLORS.raise,
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.mixPart,
                            {
                              flex: Math.max(cellData.strategy.call, 0.02),
                              backgroundColor: RANGE_COLORS.call,
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.mixPart,
                            {
                              flex: Math.max(cellData.strategy.fold, 0.02),
                              backgroundColor: RANGE_COLORS.fold,
                            },
                          ]}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      <LinearGradient
        colors={['rgba(26,34,56,0.98)', 'rgba(20,26,44,0.98)']}
        style={styles.detail}
      >
        <Text style={styles.hand}>{selected.label}</Text>
        <View style={styles.barTrack}>
          {bars.map((b) => (
            <View
              key={b.key}
              style={{ flex: Math.max(b.pct, 0.02), backgroundColor: b.color }}
            />
          ))}
        </View>
        <View style={styles.freqs}>
          <FreqField
            label="R"
            value={raisePct}
            onChange={setRaisePct}
            accent={{ color: RANGE_COLORS.raise }}
          />
          <FreqField
            label="C"
            value={callPct}
            onChange={setCallPct}
            accent={{ color: RANGE_COLORS.call }}
          />
          <FreqField
            label="F"
            value={foldPct}
            onChange={setFoldPct}
            accent={{ color: RANGE_COLORS.fold }}
          />
        </View>
        <Pressable
          onPress={() => void saveCell()}
          disabled={saving}
          style={[styles.save, saving && styles.saveDisabled]}
        >
          {saving ? (
            <ActivityIndicator color={dash.ctaText} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </LinearGradient>
    </View>
  );
}

function FreqField({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accent: TextStyle;
}) {
  return (
    <View style={styles.freq}>
      <Text style={[styles.freqLabel, accent]}>{label}</Text>
      <TextInput
        style={styles.freqInput}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={3}
      />
      <Text style={styles.percent}>%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dash.bg,
  },
  header: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
  },
  headerSide: {
    width: 58,
    alignItems: 'flex-start',
  },
  doneBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: 'rgba(77,163,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.24)',
  },
  doneText: {
    color: dash.opsSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  kicker: {
    color: dash.brandSoft,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 21,
    textAlign: 'center',
  },
  titleMuted: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  gridWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
    paddingHorizontal: 8,
  },
  matrixPanel: {
    padding: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: dash.ops,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  grid: {
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 1,
  },
  cell: {
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  cellMix: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 2,
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    opacity: 0.9,
  },
  mixPart: {
    height: '100%',
  },
  cellActive: {
    borderWidth: 1.5,
    shadowColor: dash.opsSoft,
    shadowOpacity: 0.5,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  cellText: {
    fontFamily: fonts.bodyBold,
    includeFontPadding: false,
  },
  detail: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    alignItems: 'center',
    gap: 8,
  },
  hand: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 23,
  },
  freqs: {
    flexDirection: 'row',
    gap: 7,
    width: '100%',
  },
  freq: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: 'rgba(10,14,26,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 5,
  },
  freqLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  freqInput: {
    flex: 1,
    minWidth: 0,
    color: dash.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    paddingHorizontal: 0,
    paddingVertical: 8,
    textAlign: 'right',
  },
  percent: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  save: {
    backgroundColor: dash.cta,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  saveDisabled: { opacity: 0.5 },
  saveText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  barTrack: {
    height: 7,
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
