import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, Chip, Screen, SourceLabel, Text, colors, radii, spacing } from '@outly/ui';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { VenueRow } from '@/components/VenueRow';
import { useDemoVenues } from '@/lib/useDemoVenues';

const CATEGORIES = ['Bars', 'Rooftops', 'Restaurants', 'Clubs', 'Live music'] as const;

export default function HomeScreen() {
  const { venues, error, loading, reload } = useDemoVenues();
  const [category, setCategory] = useState<string | null>(null);

  return (
    <Screen>
      <View style={styles.greeting}>
        <Text variant="caption" tone="accent">
          GOOD TIMES, ANYTIME.
        </Text>
        <Text variant="display">Where to tonight?</Text>
      </View>

      <Pressable accessibilityRole="search" style={styles.search} disabled>
        <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
        <Text tone="muted">Ask Outly AI for ideas…</Text>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(category === c ? null : c)} />
        ))}
      </ScrollView>

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
            <Text variant="caption" tone="muted">
              Is local Supabase running? Run: supabase start
            </Text>
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
  greeting: { gap: spacing[1], paddingTop: spacing[2] },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    height: 48,
  },
  chips: { gap: spacing[2] },
  section: { gap: spacing[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
