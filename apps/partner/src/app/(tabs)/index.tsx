import Ionicons from '@expo/vector-icons/Ionicons';
import { sydneyTime } from '@outly/core';
import { Button, Card, Chip, FormError, OfflineBanner, Screen, Text, colors, radii, spacing } from '@outly/ui';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { OFFLINE_STAFF_MESSAGE, RESULT_LABELS } from '@/lib/scanText';
import { ROLE_LABELS, canScanBar, canScanDoor, canSeeVenueStats, useStaff } from '@/lib/staff';
import { useTonight } from '@/lib/tonight';

export default function TonightScreen() {
  const { current, memberships, selectVenue, signOut } = useStaff();
  const { loading, error, guestListId, counter, live, scans, offer, reload } = useTonight();
  if (!current) return null;
  const manager = canSeeVenueStats(current.role);

  return (
    <Screen>
      <OfflineBanner message={OFFLINE_STAFF_MESSAGE} />
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="micro" tone="accent">
            OUTLY STAFF · {ROLE_LABELS[current.role].toUpperCase()}
          </Text>
          <Text variant="h1" accessibilityRole="header">
            Tonight at {current.venueName}
          </Text>
        </View>
        <Button label="Log out" variant="ghost" onPress={signOut} />
      </View>

      {memberships.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {memberships.map((m) => (
            <Chip key={m.venueId} label={m.venueName} selected={m.venueId === current.venueId} onPress={() => selectVenue(m.venueId)} />
          ))}
        </ScrollView>
      ) : null}

      {loading ? <ActivityIndicator color={colors.accent} accessibilityLabel="Loading" /> : null}
      {error ? (
        <View style={styles.errorRow}>
          <FormError style={styles.flex}>{error}</FormError>
          <Button label="Try again" variant="secondary" onPress={reload} />
        </View>
      ) : null}

      {!loading && !error && !guestListId ? (
        <Card>
          <Text variant="bodyStrong">No Outly guest list tonight</Text>
          <Text tone="secondary">Outly passes for this venue will show up here on the night.</Text>
        </Card>
      ) : null}

      {guestListId ? (
        <View style={styles.grid}>
          <Stat label="On the Outly list" value={counter ? `${counter.joined}` : '–'} suffix={counter ? ` / ${counter.capacity}` : undefined} />
          {manager && live ? (
            <>
              <Stat label="In via fast lane" value={`${live.checked_in}`} />
              <Stat label="Chose classic" value={live.joined ? `${Math.round((live.classic_count / live.joined) * 100)}%` : '–'} />
              <Stat label="Refused scans" value={`${live.scans_failed}`} danger={live.scans_failed > 0} />
            </>
          ) : null}
        </View>
      ) : null}

      {canScanDoor(current.role) ? (
        <Button label="Open door scanner" onPress={() => router.navigate('/scan')} />
      ) : null}
      {canScanBar(current.role) && offer ? (
        <Button label={`Bar scanner · ${offer.title}`} variant="secondary" onPress={() => router.navigate('/bar')} />
      ) : null}

      <View style={styles.section}>
        <Text variant="h3" accessibilityRole="header">
          {manager ? 'Latest scans' : 'Your latest scans'}
        </Text>
        {scans.length === 0 ? (
          <Text tone="muted">No scans yet.</Text>
        ) : (
          scans.map((s) => (
            <View key={s.id} style={styles.scan}>
              <Ionicons
                name={s.result === 'ok' ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={s.result === 'ok' ? colors.success : colors.danger}
              />
              <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                {s.username ? `@${s.username}` : 'Unknown pass'}
              </Text>
              <Text variant="caption" tone="secondary">
                {s.kind === 'bar' ? 'Bar · ' : ''}
                {RESULT_LABELS[s.result]}
              </Text>
              <Text variant="caption" tone="muted">
                {sydneyTime(s.created_at)}
              </Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

function Stat({ label, value, suffix, danger }: { label: string; value: string; suffix?: string; danger?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <Text variant="h1" tone={danger ? 'danger' : 'default'}>
        {value}
        {suffix ? (
          <Text variant="bodyStrong" tone="muted">
            {suffix}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  flex: { flex: 1 },
  chips: { gap: spacing[2] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: spacing[1],
    padding: spacing[4],
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: { gap: spacing[2] },
  scan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
});
