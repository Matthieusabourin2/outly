import { Button, Card, Screen, SourceLabel, Text, colors, spacing } from '@outly/ui';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { VenueRow } from '@/components/VenueRow';
import { useDemoVenues } from '@/lib/useDemoVenues';

export default function TodayScreen() {
  const { venues, error, loading, reload } = useDemoVenues();

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="caption" tone="accent">
          OUTLY PARTNER
        </Text>
        <Text variant="h1">Today</Text>
        <Text tone="secondary">{"Tonight's guest list and table requests will live here (slice 4)."}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="h2">Demo venues</Text>
          <SourceLabel source="demo" />
        </View>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : error ? (
          <Card>
            <Text tone="danger">{error}</Text>
            <Button label="Try again" variant="secondary" onPress={reload} />
          </Card>
        ) : (
          venues.map((v) => <VenueRow key={v.id} venue={v} />)
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing[1], paddingTop: spacing[2] },
  section: { gap: spacing[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
