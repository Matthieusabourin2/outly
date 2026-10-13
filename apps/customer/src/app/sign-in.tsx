import Ionicons from '@expo/vector-icons/Ionicons';
import { toUserMessage } from '@outly/core';
import { Button, FormError, Screen, Text, TextField, colors, layout, radii, spacing } from '@outly/ui';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { Captcha } from '@/components/Captcha';
import { CAPTCHA_REQUIRED } from '@/lib/captcha';
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
  if (/captcha/i.test(message)) return 'Complete the security check and try again.';
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
  // Bot check (Turnstile): each token works once, so the widget is reset after every attempt.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const captchaMissing = CAPTCHA_REQUIRED && !captchaToken;
  const captcha = captchaToken ? { captchaToken } : {};
  // One auth request at a time: a double tap or Enter + tap must not send two (and burn the CAPTCHA token).
  const inFlight = useRef(false);
  const passwordInput = useRef<TextInput>(null);
  const codeInput = useRef<TextInput>(null);

  // The same rules disable the buttons and the Enter key.
  const hasEmail = email.trim().length > 0;
  const canSubmitPassword = !busy && !captchaMissing && hasEmail && (mode === 'signup' ? isStrongEnough(password) : password.length > 0);
  const canSendCode = !busy && !captchaMissing && hasEmail;
  const canVerifyCode = !busy && code.trim().length === 6;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setCodeSent(false);
    setCode('');
  };

  const run = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
    } catch (e) {
      setError(authMessage(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
      if (CAPTCHA_REQUIRED) setCaptchaReset((n) => n + 1);
    }
  };

  const submitPassword = () =>
    run(async () => {
      const trimmed = email.trim();
      const { error: e } =
        mode === 'signup'
          ? await supabase.auth.signUp({ email: trimmed, password, options: { ...captcha } })
          : await supabase.auth.signInWithPassword({ email: trimmed, password, options: { ...captcha } });
      if (e) throw e;
    });

  const sendCode = () =>
    run(async () => {
      const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, ...captcha } });
      if (e) throw e;
      setCodeSent(true);
      setInfo(`We sent a 6-digit code to ${email.trim()}.`);
    });

  const verifyCode = () =>
    run(async () => {
      const { error: e } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (e) throw e;
    });

  const resetPassword = () => {
    if (!hasEmail) {
      setInfo(null);
      setError('Enter your email first.');
      return;
    }
    return run(async () => {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: authRedirectUrl('/reset-password'),
        ...captcha,
      });
      if (e) throw e;
      setInfo('If an account exists for this email, a reset link is on its way.');
    });
  };

  const onEmailSubmit = () => {
    if (mode !== 'code') passwordInput.current?.focus();
    else if (codeSent) codeInput.current?.focus();
    else if (canSendCode) void sendCode();
  };

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
              accessibilityLabel={m === 'signup' ? 'Sign up' : 'Log in'}
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
          returnKeyType={mode === 'code' ? 'send' : 'next'}
          onSubmitEditing={onEmailSubmit}
        />

        {mode === 'code' ? (
          codeSent ? (
            <TextField
              ref={codeInput}
              label="6-digit code"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
              placeholder="123456"
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              returnKeyType="go"
              onSubmitEditing={() => canVerifyCode && void verifyCode()}
            />
          ) : null
        ) : (
          <TextField
            ref={passwordInput}
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'signup' ? 'At least 8 characters' : undefined}
            hint={mode === 'signup' ? 'Use at least 8 characters, with letters and numbers.' : undefined}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            returnKeyType="go"
            onSubmitEditing={() => canSubmitPassword && void submitPassword()}
          />
        )}

        {/* One widget, before the buttons: keyboard and screen-reader users reach the check first. */}
        <Captcha onToken={setCaptchaToken} resetKey={captchaReset} />

        {mode === 'code' ? (
          codeSent ? (
            <>
              <Button label="Continue" onPress={verifyCode} loading={busy} disabled={!canVerifyCode} />
              <Button label="Send a new code" variant="ghost" onPress={sendCode} disabled={!canSendCode} />
            </>
          ) : (
            <Button label="Email me a code" onPress={sendCode} loading={busy} disabled={!canSendCode} />
          )
        ) : (
          <Button label={mode === 'signup' ? 'Create account' : 'Log in'} onPress={submitPassword} loading={busy} disabled={!canSubmitPassword} />
        )}

        <FormError>{error}</FormError>
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
          {mode === 'login' ? <Button label="Forgot password?" variant="ghost" onPress={resetPassword} disabled={busy || captchaMissing} /> : null}
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
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            onPress={google}
            disabled={busy}
            style={({ pressed }) => [styles.google, (pressed || busy) && styles.dimmed]}
          >
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
  segmentItem: { flex: 1, minHeight: layout.minTouch, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
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
  dimmed: { opacity: 0.6 },
  legal: { textAlign: 'center' },
});
