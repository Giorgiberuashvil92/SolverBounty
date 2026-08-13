import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { coachApi, type ParsedHandResult } from '../../api/coachApi';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

const SPOTS = ['Preflop', 'Flop', 'Turn', 'River'] as const;

type QuickHandLogModalProps = {
  visible: boolean;
  stakesLabel?: string;
  saving?: boolean;
  onCancel: () => void;
  onSave: (input: { rawInput: string; tags: string[]; parsed?: ParsedHandResult }) => void;
  onOpenDetailed: () => void;
};

export function QuickHandLogModal({
  visible,
  stakesLabel,
  saving = false,
  onCancel,
  onSave,
  onOpenDetailed,
}: QuickHandLogModalProps) {
  const [note, setNote] = useState('');
  const [spot, setSpot] = useState<(typeof SPOTS)[number]>('Preflop');
  const [parsed, setParsed] = useState<ParsedHandResult | undefined>();
  const [transcribing, setTranscribing] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    if (!visible) return;
    setNote('');
    setSpot('Preflop');
    setParsed(undefined);
  }, [visible]);

  const save = () => {
    const rawInput = note.trim();
    if (!rawInput || saving) return;
    onSave({ rawInput, tags: parsed?.hand.tags?.length ? parsed.hand.tags : [spot.toLowerCase()], parsed });
  };

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone', 'Allow microphone access to log hands by voice.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      Alert.alert('Microphone', (error as Error).message || 'Could not start recording.');
    }
  };

  const stopAndTranscribe = async () => {
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error('Recording was not available.');
      setTranscribing(true);
      const result = await coachApi.transcribeHand(recorder.uri, stakesLabel);
      setNote(result.transcript);
      setParsed(result.parsed);
      const boardCount = result.parsed.hand.board?.length ?? 0;
      setSpot(boardCount >= 5 ? 'River' : boardCount === 4 ? 'Turn' : boardCount >= 3 ? 'Flop' : 'Preflop');
    } catch (error) {
      Alert.alert('Voice log', (error as Error).message || 'Could not transcribe this hand.');
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.icon}>
              <Ionicons name="flash-outline" size={19} color={dash.opsSoft} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>QUICK LOG{stakesLabel ? ` · ${stakesLabel}` : ''}</Text>
              <Text style={styles.title}>Save the spot before it fades.</Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={10}>
              <Ionicons name="close" size={22} color={dash.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.spotRow}>
            {SPOTS.map((item) => (
              <Pressable
                key={item}
                onPress={() => setSpot(item)}
                style={[styles.spotChip, spot === item && styles.spotChipActive]}
              >
                <Text style={[styles.spotText, spot === item && styles.spotTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            disabled={saving || transcribing}
            onPress={() => void (recorderState.isRecording ? stopAndTranscribe() : startRecording())}
            style={[styles.voiceButton, recorderState.isRecording && styles.voiceButtonRecording, (saving || transcribing) && styles.voiceButtonDisabled]}
          >
            <Ionicons name={recorderState.isRecording ? 'stop-circle' : 'mic'} size={19} color={recorderState.isRecording ? dash.loss : dash.opsSoft} />
            <Text style={[styles.voiceButtonText, recorderState.isRecording && styles.voiceButtonTextRecording]}>
              {transcribing ? 'Turning voice into a hand...' : recorderState.isRecording ? 'Stop & transcribe' : 'Tap to talk'}
            </Text>
          </Pressable>

          <TextInput
            autoFocus
            value={note}
            onChangeText={setNote}
            placeholder="BTN vs BB, AQs, 3-bet pot. Turn jam felt close..."
            placeholderTextColor={dash.textMuted}
            multiline
            textAlignVertical="top"
            style={styles.input}
            maxLength={700}
          />

          {parsed?.hand.summary ? (
            <View style={styles.parsedPreview}>
              <Ionicons name="sparkles" size={14} color={dash.brandSoft} />
              <Text style={styles.parsedText} numberOfLines={2}>{parsed.hand.summary}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={!note.trim() || saving}
            onPress={save}
            style={[styles.save, (!note.trim() || saving) && styles.saveDisabled]}
          >
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save for review'}</Text>
          </Pressable>

          <Pressable disabled={saving} onPress={onOpenDetailed} style={styles.detailLink}>
            <Text style={styles.detailText}>Add cards, sizes, and action line</Text>
            <Ionicons name="chevron-forward" size={15} color={dash.opsSoft} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    backgroundColor: '#151C31',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: dash.borderStrong,
    padding: 18,
    paddingBottom: 28,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dash.opsDim,
  },
  kicker: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2 },
  title: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 16, marginTop: 2 },
  spotRow: { flexDirection: 'row', gap: 7 },
  spotChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  spotChipActive: { backgroundColor: dash.opsDim, borderColor: 'rgba(77,163,255,0.5)' },
  spotText: { color: dash.textMuted, fontFamily: fonts.bodyBold, fontSize: 11 },
  spotTextActive: { color: dash.opsSoft },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 11,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.4)',
    backgroundColor: 'rgba(77,163,255,0.1)',
  },
  voiceButtonRecording: { borderColor: 'rgba(255,77,94,0.65)', backgroundColor: 'rgba(255,77,94,0.1)' },
  voiceButtonDisabled: { opacity: 0.55 },
  voiceButtonText: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 13 },
  voiceButtonTextRecording: { color: dash.loss },
  input: {
    minHeight: 112,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dash.borderStrong,
    backgroundColor: 'rgba(5,8,18,0.42)',
    color: dash.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
  },
  parsedPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(155,107,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(155,107,255,0.25)',
  },
  parsedText: { flex: 1, color: dash.textSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  save: { alignItems: 'center', borderRadius: 12, paddingVertical: 14, backgroundColor: dash.cta },
  saveDisabled: { opacity: 0.48 },
  saveText: { color: dash.ctaText, fontFamily: fonts.bodyBold, fontSize: 15 },
  detailLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3, paddingVertical: 2 },
  detailText: { color: dash.opsSoft, fontFamily: fonts.bodyMedium, fontSize: 12 },
});
