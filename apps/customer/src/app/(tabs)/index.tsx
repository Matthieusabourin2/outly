import Ionicons from '@expo/vector-icons/Ionicons';
import { sydneyDay, sydneyTime, toUserMessage } from '@outly/core';
import type { Enums } from '@outly/db';
import { Avatar, Button, Card, EmptyState, Screen, SourceLabel, Text, colors, radii, spacing } from '@outly/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AttendeeRow } from '@/components/AttendeeRow';
import { Sheet } from '@/components/Sheet';
import { VisibilityChoice } from '@/components/VisibilityChoice';
import { useAuth } from '@/lib/auth';
import { useNight } from '@/lib/night';
import { supabase } from '@/lib/supabase';

export default function NightScreen() {
  const { profile } = useAuth();
  const { loading, error, night, stats, booking, attendees, offer, reload } = useNight();
  const [joinOpen, setJoinOpen] = useState(false);
  const [visibility, setVisibility] = useState<Enums<'attendee_visibility'>>('ghost');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const join = async () => {
    if (!night) return;
    setJoining(true);
    setJoinError(null);
    const { error: e } = await supabase.rpc('join_event_list', { p_guest_list_id: night.id, p_visibility: visibility });
    setJoining(false);
    if (e) return setJoinError(toUserMessage(e));
    setJoinOpen(false);
    await reload();
    router.navigate('/pass');
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      </Screen>
    );
  }

  if (!night) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon={<Ionicons name="moon-outline" size={44} color={colors.accent} />}
          title="No Outly night yet"
          message={error ?? 'The next Outly night will show up here.'}
          action={error ? <Button label="Try again" variant="secondary" onPress={reload} /> : undefined}
        />
      </Screen>
    );
  }

  const event = night.event;
  const sets = [...(event?.sets ?? [])].sort((a, b) => a.sort - b.sort);
  const full = !!stats && stats.remaining <= 0;
  const progress = stats && stats.capacity > 0 ? Math.min(1, stats.joined / stats.capacity) : 0;

  return (
    <Screen>
      <View style={styles.top}>
        <Text variant="h2">
          outly<Text variant="h2" style={{ color: colors.primary }}>.</Text>
        </Text>
        {profile ? <Avatar name={profile.username} /> : null}
      </View>

      <Card>
        <Text variant="micro" tone="accent">
          {sydneyDay(night.night).toUpperCase()}
          {event?.starts_at ? ` · FROM ${sydneyTime(event.starts_at).toUpperCase()}` : ''}
        </Text>
        <Text variant="display">{night.venue?.name ?? event?.title}</Text>
        {night.venue?.address ? <Text tone="secondary">{night.venue.address}</Text> : null}
        {event?.title && night.venue?.name ? <Text tone="secondary">{event.title}</Text> : null}
      </Card>

      <View style={styles.perk}>
        <Ionicons name="flash-outline" size={26} color={colors.accent} />
        <View style={styles.perkText}>
          <Text variant="bodyStrong">Skip the queue with Outly</Text>
          <Text variant="caption" tone="secondary">
            Got your ticket? Join the Outly list and use the fast lane. Show your Outly pass and your ticket at the door.
          </Text>
        </View>
      </View>

      {stats ? (
        <View style={styles.counter}>
          <View style={styles.counterRow}>
            <Text variant="bodyStrong">On the Outly list</Text>
            <Text tone="secondary">
              <Text variant="bodyStrong">{stats.joined}</Text> / {stats.capacity}
            </Text>
          </View>
          <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: stats.capacity, now: stats.joined }}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      ) : null}

      {booking ? (
        <Button label={booking.status === 'checked_in' ? "You're in. See your pass" : 'Show my pass'} onPress={() => router.navigate('/pass')} />
      ) : full ? (
        <Card>
          <Text variant="bodyStrong">The Outly list is full</Text>
          <Text tone="secondary">You can still get in through the normal line with your ticket.</Text>
        </Card>
      ) : (
        <Button label="Join the Outly list" onPress={() => setJoinOpen(true)} />
      )}

      {offer ? (
        <Card>
          <View style={styles.offerHead}>
            <Text variant="micro" tone="accent" style={styles.flex}>
              OFFER FROM {night.venue?.name?.toUpperCase()}
            </Text>
            <SourceLabel source={offer.source} />
          </View>
          <Text variant="bodyStrong">{offer.title}</Text>
          {offer.description ? <Text tone="secondary">{offer.description}</Text> : null}
          <Text variant="caption" tone="muted">
            Show your Outly pass at the bar. Please drink responsibly.
          </Text>
        </Card>
      ) : null}

      <View style={styles.section}>
        <Text variant="h2">Line-up</Text>
        {sets.length === 0 ? (
          <View style={styles.soon}>
            <Text tone="muted">Line-up announced soon</Text>
          </View>
        ) : (
          sets.map((s) => (
            <View key={s.id} style={styles.set}>
              <Text variant="bodyStrong" style={styles.flex}>
                {s.artist_name}
              </Text>
              {s.starts_at ? (
                <Text variant="caption" tone="secondary">
                  {sydneyTime(s.starts_at)}
                  {s.ends_at ? `–${sydneyTime(s.ends_at)}` : ''}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text variant="h2">Who’s going</Text>
        {!booking ? (
          <Notice icon="lock-closed-outline" text="Join the list in classic mode to see who else is going. Usernames only." />
        ) : booking.attendee_visibility === 'ghost' ? (
          <Notice icon="eye-off-outline" text="You're in ghost mode: nobody sees you and you don't see the list. You can switch to classic in Profile." />
        ) : attendees.length === 0 ? (
          <Notice icon="people-outline" text="Nobody else in classic mode yet. Check back later." />
        ) : (
          <Card>
            {attendees.map((a) => (
              <AttendeeRow key={a.user_id} attendee={a} onChanged={reload} />
            ))}
          </Card>
        )}
      </View>

      <Sheet visible={joinOpen} onClose={() => setJoinOpen(false)}>
        <Text variant="h2">How do you want to appear?</Text>
        <Text tone="secondary">Other guests only ever see your username. You can change this any time in Profile.</Text>
        <VisibilityChoice value={visibility} onChange={setVisibility} />
        {joinError ? <Text tone="danger">{joinError}</Text> : null}
        <Button label={`Join as ${visibility}`} onPress={join} loading={joining} />
      </Sheet>
    </Screen>
  );
}

function Notice({ icon, text }: { icon: 'lock-closed-outline' | 'eye-off-outline' | 'people-outline'; text: string }) {
  return (
    <View style={styles.notice}>
      <Ionicons name={icon} size={20} color={colors.accent} />
      <Text variant="caption" tone="secondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing[12] },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  perk: { flexDirection: 'row', gap: spacing[3], padding: spacing[4], borderRadius: radii.md, backgroundColor: colors.primarySoft },
  perkText: { flex: 1, gap: spacing[1] },
  counter: { gap: spacing[2] },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  section: { gap: spacing[3] },
  soon: { padding: spacing[4], borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  set: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  notice: { flexDirection: 'row', gap: spacing[3], alignItems: 'center', padding: spacing[4], borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  flex: { flex: 1 },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
});
