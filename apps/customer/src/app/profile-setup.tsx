import { displayNameSchema, isAdult, parseDateOfBirth, toIsoDate, toUserMessage, usernameSchema } from '@outly/core';
import { Button, Screen, Text, TextField, spacing } from '@outly/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
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

  const save = async () => {
    const next: Errors = {};
    const n = displayNameSchema.safeParse(name);
    const u = usernameSchema.safeParse(username);
    const dob = parseDateOfBirth(day, month, year);
    if (!n.success) next.name = n.error.issues[0]?.message;
    if (!u.success) next.username = u.error.issues[0]?.message;
    if (!dob) next.dob = 'Enter a real date of birth.';
    else if (!isAdult(dob)) next.dob = 'Outly is for people aged 18 and over.';
    setErrors(next);
    if (Object.keys(next).length > 0 || !session || !dob || !n.success || !u.success) return;

    setBusy(true);
    const { error } = await supabase.from('profiles').insert({
      id: session.user.id,
      display_name: n.data,
      username: u.data,
      date_of_birth: toIsoDate(dob),
    });
    setBusy(false);
    if (error) {
      if (error.code === '23505') setErrors({ username: 'That username is taken. Try another one.' });
      else setErrors({ form: toUserMessage(error) });
      return;
    }
    await refreshProfile();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="h1">Create your profile</Text>
        <Text tone="secondary">Other guests only ever see your username, never your name.</Text>
      </View>

      <TextField label="First name" value={name} onChangeText={setName} autoComplete="given-name" error={errors.name} />
      <TextField
        label="Username"
        value={username}
        onChangeText={(t) => setUsername(t.replace(/^@/, ''))}
        autoCapitalize="none"
        autoComplete="username"
        placeholder="jessnights"
        error={errors.username}
        hint="Letters, numbers, dots and underscores."
      />

      <View style={styles.dobBlock}>
        <Text variant="caption" tone="secondary">
          Date of birth
        </Text>
        <View style={styles.dobRow}>
          <View style={styles.dobPart}>
            <TextField label="Day" value={day} onChangeText={setDay} placeholder="DD" keyboardType="number-pad" inputMode="numeric" maxLength={2} />
          </View>
          <View style={styles.dobPart}>
            <TextField label="Month" value={month} onChangeText={setMonth} placeholder="MM" keyboardType="number-pad" inputMode="numeric" maxLength={2} />
          </View>
          <View style={styles.dobYear}>
            <TextField label="Year" value={year} onChangeText={setYear} placeholder="YYYY" keyboardType="number-pad" inputMode="numeric" maxLength={4} />
          </View>
        </View>
        {errors.dob ? (
          <Text variant="caption" tone="danger">
            {errors.dob}
          </Text>
        ) : (
          <Text variant="caption" tone="muted">
            You must be 18 or over to use Outly.
          </Text>
        )}
      </View>

      {errors.form ? <Text tone="danger">{errors.form}</Text> : null}
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
