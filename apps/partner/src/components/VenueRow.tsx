import { canBook } from '@outly/core';
import { Card, Text, colors, radii, spacing } from '@outly/ui';
import { StyleSheet, View } from 'react-native';
import type { VenueListItem } from '@/lib/useDemoVenues';

export function VenueRow({ venue }: { venue: VenueListItem }) {
  const bookable = canBook(venue.partner_status);
  return (
    <Card>
      <View style={styles.header}>
        <Text variant="h3" style={styles.name} numberOfLines={1}>
          {venue.name}
        </Text>
        {bookable && (
          <View style={styles.badge}>
            <Text variant="micro" tone="success">
              BOOK ON OUTLY
            </Text>
          </View>
        )}
      </View>
      <Text variant="caption" tone="muted">
        {[...(venue.categories ?? []), ...(venue.vibe_tags ?? [])].map((t) => t.replace(/_/g, ' ')).join(' · ')}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  name: { flex: 1 },
  badge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
});
