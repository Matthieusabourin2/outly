import Ionicons from '@expo/vector-icons/Ionicons';
import { toUserMessage } from '@outly/core';
import { Button, Screen, Text, TextField, colors, radii, spacing } from '@outly/ui';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GOOGLE_SIGN_IN_ENABLED, authRedirectUrl, supabase } from '@/lib/supabase';

type Mode = 'signup' | 'login' | 'code';

/** Same rule as Supabase Auth (password_requirements = letters_digits, 8+ characters). */
function isStrongEnough(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

/** Supabase auth errors are worded for developers: map the ones people actually hit. */
function authMessage(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
  if (/already registered|already exists/i.test(message)) return 'This email already has an account. Log in instead.';
  if (/password should (be at least|contain)/i.test(message)) return 'Use at least 8 characters, with letters and numbers.';
  if (/only request this after|security purposes/i.test(message)) return 'Wait a minute before asking for another code.';
  if (/token has expired|invalid.*otp|otp.*invalid/i.test(message)) return 'That code is wrong or has expired. Ask for a new one.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Wait a minute and try again.';
  if (/unable to validate email|invalid email/i.test(message)) return 'Check your email address.';
  return toUserMessage(error);
}

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setCodeSent(false);
    setCode('');
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = () =>
    run(async () => {
      const trimmed = email.trim();
      const { error: e } =
        mode === 'signup'
          ? await supabase.auth.signUp({ email: trimmed, password })
          : await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (e) throw e;
    });

  const sendCode = () =>
    run(async () => {
      const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (e) throw e;
      setCodeSent(true);
      setInfo(`We sent a 6-digit code to ${email.trim()}.`);
    });

  const verifyCode = () =>
    run(async () => {
      const { error: e } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (e) throw e;
    });

  const resetPassword = () =>
    run(async () => {
      if (!email.trim()) throw new Error('Enter your email first.');
      const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: authRedirectUrl('/reset-password'),
      });
      if (e) throw e;
      setInfo('If an account exists for this email, a reset link is on its way.');
    });

  const google = () =>
    run(async () => {
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: authRedirectUrl('/') },
      });
      if (e) throw e;
    });

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.brand}>
        <Text variant="display">
          outly<Text variant="display" style={{ color: colors.primary }}>.</Text>
        </Text>
        <Text tone="secondary">Good times, anytime.</Text>
      </View>

      <View style={styles.segment} accessibilityRole="tablist">
        {(['signup', 'login'] as const).map((m) => {
          const selected = mode === m || (mode === 'code' && m === 'signup');
          return (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => switchMode(m)}
              style={[styles.segmentItem, selected && styles.segmentItemOn]}
            >
              <Text variant="bodyStrong" tone={selected ? 'default' : 'secondary'}>
                {m === 'signup' ? 'Sign up' : 'Log in'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          editable={!codeSent}
        />

        {mode === 'code' ? (
          codeSent ? (
            <>
              <TextField
                label="6-digit code"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
              <Button label="Continue" onPress={verifyCode} loading={busy} disabled={code.trim().length !== 6} />
              <Button label="Send a new code" variant="ghost" onPress={sendCode} disabled={busy} />
            </>
          ) : (
            <Button label="Email me a code" onPress={sendCode} loading={busy} disabled={!email.trim()} />
          )
        ) : (
          <>
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'signup' ? 'At least 8 characters' : undefined}
              hint={mode === 'signup' ? 'Use at least 8 characters, with letters and numbers.' : undefined}
              secureTextEntry
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            <Button
              label={mode === 'signup' ? 'Create account' : 'Log in'}
              onPress={submitPassword}
              loading={busy}
              disabled={!email.trim() || (mode === 'signup' ? !isStrongEnough(password) : password.length === 0)}
            />
          </>
        )}

        {error ? (
          <Text tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        {info ? (
          <Text tone="success" accessibilityLiveRegion="polite">
            {info}
          </Text>
        ) : null}

        <View style={styles.links}>
          {mode === 'code' ? (
            <Button label="Use a password instead" variant="ghost" onPress={() => switchMode('signup')} />
          ) : (
            <Button label="Email me a code instead" variant="ghost" onPress={() => switchMode('code')} />
          )}
          {mode === 'login' ? <Button label="Forgot password?" variant="ghost" onPress={resetPassword} disabled={busy} /> : null}
        </View>
      </View>

      {GOOGLE_SIGN_IN_ENABLED ? (
        <>
          <View style={styles.divider}>
            <View style={styles.rule} />
            <Text variant="caption" tone="muted">
              or
            </Text>
            <View style={styles.rule} />
          </View>
          <Pressable accessibilityRole="button" onPress={google} disabled={busy} style={styles.google}>
            <Ionicons name="logo-google" size={18} color={colors.text} />
            <Text variant="bodyStrong">Continue with Google</Text>
          </Pressable>
        </>
      ) : null}

      <Text variant="caption" tone="muted" style={styles.legal}>
        Outly is for people aged 18 and over. By continuing you agree to the{' '}
        <Link href="/terms" style={{ color: colors.accent }}>
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" style={{ color: colors.accent }}>
          Privacy Policy
        </Link>
        .
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { gap: spacing[1], paddingTop: spacing[8] },
  segment: {
    flexDirection: 'row',
    padding: spacing[1],
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: { flex: 1, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  segmentItemOn: { backgroundColor: colors.primary },
  form: { gap: spacing[4] },
  links: { alignItems: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  google: {
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  legal: { textAlign: 'center' },
});
