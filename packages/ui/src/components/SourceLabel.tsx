import { SOURCE_LABELS, type ContentSource } from '@outly/core';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../tokens';
import { Text } from './Text';

const sourceColor: Record<ContentSource, string> = {
  outly_partner: colors.sourceOutlyPartner,
  public_listing: colors.sourcePublicListing,
  demo: colors.sourceDemo,
};

/** D5: must be rendered on every deal and event. */
export function SourceLabel({ source }: { source: ContentSource }) {
  const color = sourceColor[source];
  return (
    <View style={[styles.pill, { borderColor: color }]} accessibilityLabel={`Source: ${SOURCE_LABELS[source]}`}>
      <Text variant="micro" style={{ color }}>
        {SOURCE_LABELS[source].toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.xs,
    borderWidth: 1,
  },
});
