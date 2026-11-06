import {
  displayNameSchema,
  isAdult,
  isUniqueViolation,
  normaliseUsername,
  parseDateOfBirth,
  toIsoDate,
  toUserMessage,
  usernameSchema,
} from '@outly/core';
import { Button, FormError, Screen, Text, TextField, spacing } from '@outly/ui';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Errors = Partial<Record<'name' | 'username' | 'dob' | 'form', string>>;

export default function ProfileSetupScreen() {
  const { session, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const usernameInput = useRef<TextInput>(null);
  const dayInput = useRef<TextInput>(null);
  const monthInput = useRef<TextInput>(null);
  const yearInput = useRef<TextInput>(null);

  const save = async () => {
    if (inFlight.current) return;
    const next: Errors = {};
    const n = displayNameSchema.safeParse(name);
    const u = usernameSchema.safeParse(normaliseUsername(username));
    const dob = parseDateOfBirth(day, month, year);
    if (!n.success) next.name = n.error.issues[0]?.message;
    if (!u.success) next.username = u.error.issues[0]?.message;
    if (!dob) next.dob = 'Enter a real date of birth.';
    else if (!isAdult(dob)) next.dob = 'Outly is for people aged 18 and over.';
    setErrors(next);
    if (Object.keys(next).length > 0 || !session || !dob || !n.success || !u.success) return;

    inFlight.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.from('profiles').insert({
        id: session.user.id,
        display_name: n.data,
        username: u.data,
        date_of_birth: toIsoDate(dob),
      });
      // Usernames are unique whatever the case ("Jess" = "jess", citext).
      if (isUniqueViolation(error, 'profiles_username_key')) {
        setErrors({ username: 'That username is taken. Try another one.' });
        return;
      }
      // profiles_pkey: the profile was already created (other tab, or a retry after a lost answer).
      if (error && !isUniqueViolation(error, 'profiles_pkey')) {
        setErrors({ form: toUserMessage(error) });
        return;
      }
      await refreshProfile();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="h1" accessibilityRole="header">
          Create your profile
        </Text>
        <Text tone="secondary">Other guests only ever see your username, never your name.</Text>
      </View>

      <TextField
        label="First name"
        value={name}
        onChangeText={setName}
        autoComplete="given-name"
        error={errors.name}
        returnKeyType="next"
        onSubmitEditing={() => usernameInput.current?.focus()}
      />
      <TextField
        ref={usernameInput}
        label="Username"
        value={username}
        onChangeText={(t) => setUsername(t.replace(/^\s*@+/, ''))}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        placeholder="jessnights"
        error={errors.username}
        hint="Letters, numbers, dots and underscores."
        returnKeyType="next"
        onSubmitEditing={() => dayInput.current?.focus()}
      />

      <View style={styles.dobBlock}>
        <Text variant="caption" tone="secondary">
          Date of birth
        </Text>
        <View style={styles.dobRow}>
          <View style={styles.dobPart}>
            <TextField
              ref={dayInput}
              label="Day"
              value={day}
              onChangeText={setDay}
              placeholder="DD"
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="birthdate-day"
              maxLength={2}
              returnKeyType="next"
              onSubmitEditing={() => monthInput.current?.focus()}
            />
          </View>
          <View style={styles.dobPart}>
            <TextField
              ref={monthInput}
              label="Month"
              value={month}
              onChangeText={setMonth}
              placeholder="MM"
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="birthdate-month"
              maxLength={2}
              returnKeyType="next"
              onSubmitEditing={() => yearInput.current?.focus()}
            />
          </View>
          <View style={styles.dobYear}>
            <TextField
              ref={yearInput}
              label="Year"
              value={year}
              onChangeText={setYear}
              placeholder="YYYY"
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="birthdate-year"
              maxLength={4}
              returnKeyType="go"
              onSubmitEditing={() => void save()}
            />
          </View>
        </View>
        {errors.dob ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {errors.dob}
          </Text>
        ) : (
          <Text variant="caption" tone="muted">
            You must be 18 or over to use Outly.
          </Text>
        )}
      </View>

      <FormError>{errors.form}</FormError>
      <Button label="Continue" onPress={save} loading={busy} />
      <Button label="Log out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing[2], paddingTop: spacing[6] },
  dobBlock: { gap: spacing[2] },
  dobRow: { flexDirection: 'row', gap: spacing[3] },
  dobPart: { flex: 1 },
  dobYear: { flex: 1.5 },
});
