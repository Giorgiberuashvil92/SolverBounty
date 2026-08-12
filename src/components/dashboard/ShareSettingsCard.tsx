import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { shareApi } from '../../api/shareApi';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';

type ShareSettingsCardProps = {
  compact?: boolean;
};

export function ShareSettingsCard({ compact }: ShareSettingsCardProps) {
  const [discord, setDiscord] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [hasDiscord, setHasDiscord] = useState(false);
  const [hasTelegram, setHasTelegram] = useState(false);
  const [open, setOpen] = useState(!compact);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const s = await shareApi.getSettings();
        setDiscord(s.discordWebhookUrl);
        setTelegramToken(s.telegramBotToken);
        setTelegramChatId(s.telegramChatId);
        setHasDiscord(s.hasDiscord);
        setHasTelegram(s.hasTelegram);
      } catch {
        // ignore until user opens
      }
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const s = await shareApi.updateSettings({
        discordWebhookUrl: discord.includes('•') ? undefined : discord,
        telegramBotToken: telegramToken.includes('•') ? undefined : telegramToken,
        telegramChatId,
      });
      setDiscord(s.discordWebhookUrl);
      setTelegramToken(s.telegramBotToken);
      setTelegramChatId(s.telegramChatId);
      setHasDiscord(s.hasDiscord);
      setHasTelegram(s.hasTelegram);
      setStatus('Share destinations saved.');
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.shell}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.head}>
        <View>
          <Text style={styles.label}>SHARE DESTINATIONS</Text>
          <Text style={styles.title}>Discord · Telegram</Text>
          <Text style={styles.meta}>
            {hasDiscord ? 'Discord linked' : 'Discord off'} ·{' '}
            {hasTelegram ? 'Telegram linked' : 'Telegram off'}
          </Text>
        </View>
        <Text style={styles.chev}>{open ? '−' : '+'}</Text>
      </Pressable>

      {open ? (
        <View style={styles.body}>
          <Text style={styles.hint}>
            Optional webhooks. Without them, share still opens the system share sheet.
          </Text>
          <Text style={styles.fieldLabel}>Discord webhook URL</Text>
          <TextInput
            style={styles.input}
            value={discord}
            onChangeText={setDiscord}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://discord.com/api/webhooks/…"
            placeholderTextColor={dash.textMuted}
          />
          <Text style={styles.fieldLabel}>Telegram bot token</Text>
          <TextInput
            style={styles.input}
            value={telegramToken}
            onChangeText={setTelegramToken}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="123456:ABC…"
            placeholderTextColor={dash.textMuted}
          />
          <Text style={styles.fieldLabel}>Telegram chat id</Text>
          <TextInput
            style={styles.input}
            value={telegramChatId}
            onChangeText={setTelegramChatId}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="-100…"
            placeholderTextColor={dash.textMuted}
          />
          <Pressable
            onPress={() => void save()}
            disabled={busy}
            style={[styles.btn, busy && styles.btnDisabled]}
          >
            {busy ? (
              <ActivityIndicator color={dash.ctaText} />
            ) : (
              <Text style={styles.btnText}>Save destinations</Text>
            )}
          </Pressable>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: dash.border,
    backgroundColor: dash.surface,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  label: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: {
    color: dash.text,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    marginTop: 2,
  },
  meta: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 4,
  },
  chev: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    paddingHorizontal: 8,
  },
  body: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  hint: {
    color: dash.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  fieldLabel: {
    color: dash.textSecondary,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dash.border,
    backgroundColor: dash.surfaceRaised,
    color: dash.text,
    fontFamily: fonts.body,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btn: {
    marginTop: 6,
    backgroundColor: dash.cta,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  status: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
