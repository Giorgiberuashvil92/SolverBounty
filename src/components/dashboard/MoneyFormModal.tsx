import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

type MoneyFormModalProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  confirmLabel: string;
  defaultDollars?: string;
  quickAmounts?: number[];
  onCancel: () => void;
  onConfirm: (cents: number) => void;
};

export function MoneyFormModal({
  visible,
  title,
  subtitle,
  confirmLabel,
  defaultDollars = '',
  quickAmounts = [50, 100, 200, 500],
  onCancel,
  onConfirm,
}: MoneyFormModalProps) {
  const [value, setValue] = useState(defaultDollars);

  useEffect(() => {
    if (visible) setValue(defaultDollars);
  }, [visible, defaultDollars]);

  const submit = () => {
    const dollars = Number(value.replace(',', '.'));
    if (!Number.isFinite(dollars) || dollars <= 0) return;
    onConfirm(Math.round(dollars * 100));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}

          <View style={styles.inputRow}>
            <Text style={styles.currency}>$</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={dash.textMuted}
              style={styles.input}
              autoFocus
            />
          </View>

          <View style={styles.chips}>
            {quickAmounts.map((amount) => (
              <Pressable
                key={amount}
                onPress={() => setValue(String(amount))}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <Text style={styles.chipText}>${amount}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={submit} style={styles.confirmBtn}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d1520',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  sub: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: -4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    marginTop: 4,
  },
  currency: {
    color: dash.opsSoft,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    marginRight: 4,
  },
  input: {
    flex: 1,
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 32,
    paddingVertical: 14,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
  },
  confirmBtn: {
    flex: 1.2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: dash.cta,
  },
  confirmText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
  },
  pressed: {
    opacity: 0.75,
  },
});
