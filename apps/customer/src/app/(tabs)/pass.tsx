import Ionicons from '@expo/vector-icons/Ionicons';
import { makePassCode, sydneyDay, sydneyTime } from '@outly/core';
import { Avatar, Button, Card, EmptyState, Screen, Text, colors, radii, spacing } from '@outly/ui';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '@/lib/auth';
import { useNight } from '@/lib/night';

export default function PassScreen() {
  const { profile } = useAuth();
  const { loading, night, booking } = useNight();

  if (loading) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      </Screen>
    );
  }

  if (!night || !booking) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon={<Ionicons name="qr-code-outline" size={44} color={colors.accent} />}
          title="No pass yet"
          message="Join the Outly list for the night to get your fast-lane pass."
          action={night ? <Button label="Go to the night" onPress={() => router.navigate('/')} /> : undefined}
        />
      </Screen>
    );
  }

  const venue = night.venue?.name ?? night.event?.title ?? 'Outly night';

  if (booking.status === 'checked_in') {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon={<Ionicons name="checkmark-circle" size={64} color={colors.success} />}
          title="You're in!"
          message={`Checked in at ${venue}${booking.checked_in_at ? ` at ${sydneyTime(booking.checked_in_at)}` : ''}. Have a great night.`}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="micro" tone="accent">
          YOUR OUTLY PASS
        </Text>
        <Text variant="h1">
          {venue} · {sydneyDay(night.night)}
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.qr} accessibilityRole="image" accessibilityLabel="QR code of your Outly pass">
          <QRCode value={makePassCode(booking.id, booking.qr_nonce)} size={220} color={colors.qrDark} backgroundColor={colors.qrLight} ecl="M" />
        </View>
        {profile ? (
          <View style={styles.who}>
            <Avatar name={profile.username} size={32} />
            <Text variant="h3">@{profile.username}</Text>
          </View>
        ) : null}
        <View style={styles.badge}>
          <Text variant="micro" tone="success">
            FAST LANE · VALID ALL NIGHT
          </Text>
        </View>
      </Card>

      <View style={styles.notice}>
        <Ionicons name="ticket-outline" size={22} color={colors.warning} />
        <Text variant="caption" tone="secondary" style={styles.flex}>
          Show this pass <Text variant="caption">and your event ticket</Text> at the fast lane. The pass works once.
        </Text>
      </View>
      <Text variant="caption" tone="muted" style={styles.center}>
        Turn your screen brightness up at the door.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing[12] },
  header: { gap: spacing[1] },
  card: { alignItems: 'center', gap: spacing[4], paddingVertical: spacing[6] },
  qr: { padding: spacing[4], borderRadius: radii.md, backgroundColor: colors.qrLight },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  badge: { paddingHorizontal: spacing[3], paddingVertical: spacing[1] + 2, borderRadius: radii.sm, backgroundColor: colors.successSoft },
  notice: { flexDirection: 'row', gap: spacing[3], padding: spacing[4], borderRadius: radii.md, backgroundColor: colors.surfaceRaised },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});
