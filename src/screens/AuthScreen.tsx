import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';

WebBrowser.maybeCompleteAuthSession();

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, socialLogin } = useAuth();
  const [mode, setMode] = useState<'social' | 'login' | 'register'>('social');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const [googleRequest, , googlePrompt] = Google.useAuthRequest(
    googleClientId
      ? {
          clientId: googleClientId,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleClientId,
          androidClientId:
            process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || googleClientId,
        }
      : {
          // Placeholder so hook stays valid; button uses fallback when unset.
          clientId: 'unused.apps.googleusercontent.com',
        },
  );

  const appleAvailable = useMemo(
    () => Platform.OS === 'ios',
    [],
  );

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onApple = () =>
    void run(async () => {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is available on iOS devices.');
      }
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        // Simulator / Expo Go fallback for development
        await socialLogin({
          provider: 'apple',
          providerUserId: `dev-apple-${Date.now()}`,
          email: `apple.dev.${Date.now()}@pac.local`,
          displayName: 'Apple Player',
        });
        return;
      }
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const name = [cred.fullName?.givenName, cred.fullName?.familyName]
        .filter(Boolean)
        .join(' ');
      await socialLogin({
        provider: 'apple',
        providerUserId: cred.user,
        email: cred.email ?? undefined,
        displayName: name || undefined,
        idToken: cred.identityToken ?? undefined,
      });
    });

  const onGoogle = () =>
    void run(async () => {
      if (!googleClientId) {
        // Dev path until Google OAuth client IDs are configured
        await socialLogin({
          provider: 'google',
          providerUserId: `dev-google-${Date.now()}`,
          email: `google.dev.${Date.now()}@pac.local`,
          displayName: 'Google Player',
        });
        return;
      }
      const result = await googlePrompt();
      if (result?.type !== 'success') {
        throw new Error('Google sign-in cancelled');
      }
      const idToken = result.authentication?.idToken;
      const accessToken = result.authentication?.accessToken;
      let email: string | undefined;
      let name: string | undefined;
      let sub = `google-${Date.now()}`;
      if (accessToken) {
        const profile = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then((r) => r.json() as Promise<{ sub?: string; email?: string; name?: string }>);
        sub = profile.sub ?? sub;
        email = profile.email;
        name = profile.name;
      }
      await socialLogin({
        provider: 'google',
        providerUserId: sub,
        email,
        displayName: name,
        idToken: idToken ?? undefined,
      });
    });

  const onGuest = () =>
    void run(async () => {
      const id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await socialLogin({
        provider: 'guest',
        providerUserId: id,
        displayName: 'Guest grinder',
      });
    });

  const onEmailSubmit = () =>
    void run(async () => {
      if (mode === 'login') {
        await login(email.trim(), password);
        return;
      }
      await register({
        email: email.trim(),
        password,
        displayName: displayName.trim() || email.split('@')[0],
        partnerInsightsConsent: false,
      });
    });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#151A32', '#0B1020', '#080C18']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.kicker}>POKER AI COACH</Text>
          <Text style={styles.title}>
            {mode === 'social'
              ? 'Join the table'
              : mode === 'login'
                ? 'Welcome back'
                : 'Create account'}
          </Text>
          <Text style={styles.sub}>
            Sign in your way — then a quick setup like Left Pocket / PokerBase.
          </Text>

          {mode === 'social' ? (
            <>
              {appleAvailable ? (
                <Pressable
                  onPress={onApple}
                  disabled={busy}
                  style={[styles.socialBtn, styles.appleBtn]}
                >
                  <Text style={styles.socialTextLight}>Continue with Apple</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={onGoogle}
                disabled={busy || (!!googleClientId && !googleRequest)}
                style={[styles.socialBtn, styles.googleBtn]}
              >
                <Text style={styles.socialTextDark}>Continue with Google</Text>
              </Pressable>

              <Pressable
                onPress={() => setMode('register')}
                disabled={busy}
                style={[styles.socialBtn, styles.emailBtn]}
              >
                <Text style={styles.socialTextLight}>Continue with Email</Text>
              </Pressable>

              <Pressable onPress={onGuest} disabled={busy} style={styles.guestBtn}>
                <Text style={styles.guestText}>Continue as Guest</Text>
              </Pressable>

              <Pressable onPress={() => setMode('login')}>
                <Text style={styles.switch}>Already have an account? Log in</Text>
              </Pressable>
            </>
          ) : (
            <>
              {mode === 'register' ? (
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Display name"
                  placeholderTextColor={dash.textMuted}
                  style={styles.input}
                  autoCapitalize="words"
                />
              ) : null}
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={dash.textMuted}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password (min 6)"
                placeholderTextColor={dash.textMuted}
                style={styles.input}
                secureTextEntry
              />
              <Pressable
                onPress={onEmailSubmit}
                disabled={busy}
                style={[styles.btn, busy && styles.btnDisabled]}
              >
                {busy ? (
                  <ActivityIndicator color={dash.ctaText} />
                ) : (
                  <Text style={styles.btnText}>
                    {mode === 'login' ? 'Log in' : 'Create account'}
                  </Text>
                )}
              </Pressable>
              <Pressable onPress={() => setMode('social')}>
                <Text style={styles.switch}>All sign-in options</Text>
              </Pressable>
            </>
          )}

          {busy && mode === 'social' ? (
            <ActivityIndicator color={dash.brand} style={{ marginTop: 8 }} />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dash.bg },
  content: { paddingHorizontal: 20, gap: 12 },
  kicker: {
    color: dash.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
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
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  socialBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  appleBtn: { backgroundColor: '#111' },
  googleBtn: { backgroundColor: '#fff' },
  emailBtn: {
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.45)',
  },
  socialTextLight: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  socialTextDark: {
    color: '#111',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  guestBtn: { alignItems: 'center', paddingVertical: 8 },
  guestText: {
    color: dash.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: dash.text,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  btn: {
    backgroundColor: dash.cta,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    color: dash.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  switch: {
    color: dash.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  error: {
    color: dash.loss,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
});
