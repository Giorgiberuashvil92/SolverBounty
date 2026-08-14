import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { coachApi, type VoiceHandResult } from '../api/coachApi';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';

type VoiceCaptureButtonProps = {
  stakes?: string;
  disabled?: boolean;
  compact?: boolean;
  onResult: (result: VoiceHandResult) => void;
};

export function VoiceCaptureButton({ stakes, disabled, compact = false, onResult }: VoiceCaptureButtonProps) {
  const [transcribing, setTranscribing] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const recording = recorderState.isRecording;

  const start = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone', 'Allow microphone access to speak a hand to Coach.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      Alert.alert('Microphone', (error as Error).message || 'Could not start recording.');
    }
  };

  const stop = async () => {
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error('Recording was not available.');
      setTranscribing(true);
      onResult(await coachApi.transcribeHand(recorder.uri, stakes));
    } catch (error) {
      Alert.alert('Voice', (error as Error).message || 'Could not transcribe this recording.');
    } finally {
      setTranscribing(false);
    }
  };

  const inactive = Boolean(disabled || transcribing);
  return (
    <Pressable
      disabled={inactive}
      onPress={() => void (recording ? stop() : start())}
      style={[styles.button, compact && styles.compact, recording && styles.recording, inactive && styles.disabled]}
    >
      <Ionicons name={recording ? 'stop-circle' : 'mic'} size={compact ? 17 : 19} color={recording ? dash.loss : dash.opsSoft} />
      {!compact || recording || transcribing ? (
        <Text style={[styles.label, recording && styles.recordingText]}>
          {transcribing ? 'Transcribing...' : recording ? 'Stop' : 'Voice'}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 42, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(77,163,255,0.42)', backgroundColor: 'rgba(77,163,255,0.1)' },
  compact: { minWidth: 42, paddingHorizontal: 10 },
  recording: { borderColor: 'rgba(255,77,94,0.65)', backgroundColor: 'rgba(255,77,94,0.1)' },
  disabled: { opacity: 0.52 },
  label: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 12 },
  recordingText: { color: dash.loss },
});
