import { toUserMessage } from '@outly/core';
import { Button, FormError, Screen, Text, TextField, colors, spacing } from '@outly/ui';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';

/** Staff accounts are created by Outly: email + password only. */
export default function StaffSignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const passwordInput = useRef<TextInput>(null);
  const canSubmit = !busy && email.trim().length > 0 && password.length > 0;

  const signIn = async () => {
    if (!canSubmit || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    inFlight.current = false;
    setBusy(false);
    if (!e) return;
    if (/invalid login/i.test(e.message)) setError('Wrong email or password.');
    else if (/rate limit|too many/i.test(e.message)) setError('Too many attempts. Wait a minute and try again.');
    else setError(toUserMessage(e));
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.brand}>
        <Text variant="display">
          outly<Text variant="display" style={{ color: colors.primary }}>.</Text>
        </Text>
        <Text tone="secondary">Staff</Text>
      </View>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        inputMode="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordInput.current?.focus()}
      />
      <TextField
        ref={passwordInput}
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={() => void signIn()}
      />
      <FormError>{error}</FormError>
      <Button label="Log in" onPress={signIn} loading={busy} disabled={!canSubmit} />
      <Text variant="caption" tone="muted" style={styles.center}>
        No account or forgot your password? Ask your manager or the Outly team.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { gap: spacing[1], paddingTop: spacing[8] },
  center: { textAlign: 'center' },
});
