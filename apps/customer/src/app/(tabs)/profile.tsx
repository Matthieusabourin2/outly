import { toUserMessage } from '@outly/core';
import type { Enums } from '@outly/db';
import { Avatar, Button, Card, Screen, Text, colors, spacing } from '@outly/ui';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Sheet } from '@/components/Sheet';
import { VisibilityChoice } from '@/components/VisibilityChoice';
import { useAuth } from '@/lib/auth';
import { useNight } from '@/lib/night';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const { night, booking, reload } = useNight();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const changeVisibility = async (v: Enums<'attendee_visibility'>) => {
    if (!booking || v === booking.attendee_visibility) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.rpc('set_attendee_visibility', { p_booking_id: booking.id, p_visibility: v });
    setSaving(false);
    if (e) setError(toUserMessage(e));
    await reload();
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    const { error: e } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    setDeleting(false);
    if (e) return setDeleteError(toUserMessage({ message: 'OUTLY_DELETE_FAILED' }));
    await signOut();
  };

  if (!profile) return null;

  return (
    <Screen>
      <View style={styles.identity}>
        <Avatar name={profile.username} size={64} />
        <Text variant="h1">@{profile.username}</Text>
        <Text tone="secondary">{profile.display_name}</Text>
      </View>

      {booking && night ? (
        <Card>
          <Text variant="h3">On the list for {night.venue?.name ?? 'tonight'}</Text>
          <Text variant="caption" tone="secondary">
            Choose how you appear to other guests.
          </Text>
          <VisibilityChoice value={booking.attendee_visibility} onChange={changeVisibility} />
          {saving ? (
            <Text variant="caption" tone="muted">
              Saving…
            </Text>
          ) : null}
          {error ? <Text tone="danger">{error}</Text> : null}
        </Card>
      ) : null}

      <Card>
        <Link href="/privacy" style={styles.link}>
          <Text tone="accent">Privacy Policy</Text>
        </Link>
        <Link href="/terms" style={styles.link}>
          <Text tone="accent">Terms of Use</Text>
        </Link>
      </Card>

      <Button label="Log out" variant="secondary" onPress={signOut} />
      <Button label="Delete my account" variant="ghost" onPress={() => setDeleteOpen(true)} />

      <Sheet visible={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <Text variant="h2">Delete your account?</Text>
        <Text tone="secondary">
          Your profile, your passes and your choices are deleted for good. This can’t be undone.
        </Text>
        {deleteError ? <Text tone="danger">{deleteError}</Text> : null}
        <Button label="Delete my account" variant="danger" onPress={deleteAccount} loading={deleting} />
        <Button label="Keep my account" variant="ghost" onPress={() => setDeleteOpen(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: spacing[2], paddingTop: spacing[4] },
  link: { paddingVertical: spacing[2], color: colors.accent },
});
