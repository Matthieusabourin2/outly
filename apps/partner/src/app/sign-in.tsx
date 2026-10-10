import { Button, Screen, Text, TextField, colors, spacing } from '@outly/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { supabase } from '@/lib/supabase';

/** Staff accounts are created by Outly: email + password only. */
export default function StaffSignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (e) setError(/invalid login/i.test(e.message) ? 'Wrong email or password.' : 'Could not log in. Check your connection and try again.');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.brand}>
        <Text variant="display">
          outly<Text variant="display" style={{ color: colors.primary }}>.</Text>
        </Text>
        <Text tone="secondary">Staff</Text>
      </View>
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email" />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
      {error ? <Text tone="danger">{error}</Text> : null}
      <Button label="Log in" onPress={signIn} loading={busy} disabled={!email.trim() || !password} />
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
