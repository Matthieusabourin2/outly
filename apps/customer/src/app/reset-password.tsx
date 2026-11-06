import { isNetworkError, toUserMessage } from '@outly/core';
import { Button, FormError, Screen, Text, TextField, spacing } from '@outly/ui';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/** Landing page of the password-reset email: the link signs the person in, then they pick a new password. */
export default function ResetPasswordScreen() {
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  // Same rule as Supabase Auth (letters_digits, 8+ characters): the button and Enter both use it.
  const valid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

  const save = async () => {
    if (!valid || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.updateUser({ password });
    inFlight.current = false;
    setBusy(false);
    if (e) {
      setError(isNetworkError(e) ? toUserMessage(e) : 'Could not update your password. Ask for a new reset link and try again.');
    } else router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="h1" accessibilityRole="header">
          Choose a new password
        </Text>
        {!session ? <Text tone="secondary">This reset link has expired. Ask for a new one from the log-in screen.</Text> : null}
      </View>
      {session ? (
        <>
          <TextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="At least 8 characters"
            hint="Use letters and numbers."
            returnKeyType="go"
            onSubmitEditing={() => void save()}
          />
          <FormError>{error}</FormError>
          <Button label="Save password" onPress={save} loading={busy} disabled={!valid} />
        </>
      ) : (
        <Button label="Back to log in" onPress={() => router.replace('/')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { gap: spacing[2], paddingTop: spacing[6] } });
