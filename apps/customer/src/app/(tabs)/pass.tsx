import Ionicons from '@expo/vector-icons/Ionicons';
import { OUTLY_ERROR_MESSAGES, isNightOver, passQrValue, sydneyDay, sydneyTime } from '@outly/core';
import { Avatar, Button, Card, EmptyState, OfflineBanner, Screen, Text, colors, layout, radii, spacing, useKeepScreenOn } from '@outly/ui';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '@/lib/auth';
import { OFFLINE_GUEST_MESSAGE, useNight } from '@/lib/night';

/** Biggest QR that fits the card on any phone, capped for tablets and desktops. */
const QR_MAX = 280;
/** Quiet zone = QR size / 8, i.e. a bit more than the 4 modules the QR standard asks for (33 modules). */
const QUIET_ZONE_RATIO = 1 / 8;

export default function PassScreen() {
  const { profile } = useAuth();
  const { loading, error, night, booking, reload } = useNight();
  const { width } = useWindowDimensions();
  const suspended = !!profile?.suspended_at;
  const over = !!night && isNightOver(night.event?.starts_at, night.event?.ends_at);
  const showingPass = !!night && !!booking && booking.status !== 'checked_in' && !over && !suspended;
  // Keep the phone awake while the guest waits in the queue with the pass open.
  useKeepScreenOn(showingPass);

  if (loading) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      </Screen>
    );
  }

  if (!night && error) {
    return (
      <Screen scroll={false}>
        <OfflineBanner message={OFFLINE_GUEST_MESSAGE} />
        <EmptyState
          icon={<Ionicons name="cloud-offline-outline" size={44} color={colors.accent} />}
          title="Can’t load your pass"
          message={error}
          action={<Button label="Try again" variant="secondary" onPress={reload} />}
        />
      </Screen>
    );
  }

  if (suspended) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={44} color={colors.accent} />}
          title="Pass not available"
          message={OUTLY_ERROR_MESSAGES.OUTLY_SUSPENDED}
        />
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

  if (over) {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon={<Ionicons name="moon-outline" size={44} color={colors.accent} />}
          title="This night is over"
          message="Your pass is no longer valid. See you at the next Outly night."
        />
      </Screen>
    );
  }

  // Screen minus the side gutters and the card padding, then minus the quiet zone on both sides.
  const qrSize = Math.floor(Math.min(QR_MAX, (width - 2 * layout.screenGutter - 2 * spacing[4]) / (1 + 2 * QUIET_ZONE_RATIO)));
  const quietZone = Math.ceil(qrSize * QUIET_ZONE_RATIO);

  return (
    <Screen>
      <OfflineBanner message={OFFLINE_GUEST_MESSAGE} />
      <View style={styles.header}>
        <Text variant="micro" tone="accent">
          YOUR OUTLY PASS
        </Text>
        <Text variant="h1" accessibilityRole="header">
          {venue} · {sydneyDay(night.night)}
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={[styles.qr, { padding: quietZone }]} accessibilityRole="image" accessibilityLabel="QR code of your Outly pass">
          <QRCode value={passQrValue(booking.id, booking.qr_nonce)} size={qrSize} color={colors.qrDark} backgroundColor={colors.qrLight} ecl="M" />
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
  qr: { borderRadius: radii.md, backgroundColor: colors.qrLight },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  badge: { paddingHorizontal: spacing[3], paddingVertical: spacing[1] + 2, borderRadius: radii.sm, backgroundColor: colors.successSoft },
  notice: { flexDirection: 'row', gap: spacing[3], padding: spacing[4], borderRadius: radii.md, backgroundColor: colors.surfaceRaised },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});
