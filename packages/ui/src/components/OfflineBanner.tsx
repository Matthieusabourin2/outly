import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../tokens';
import { useOnline } from '../web';
import { Text } from './Text';

/** Shown only while the device is offline. `message` says what to do instead. */
export function OfflineBanner({ message }: { message: string }) {
  const online = useOnline();
  if (online) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text variant="bodyStrong" style={styles.text}>
        No connection
      </Text>
      <Text variant="caption" style={styles.text}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing[1],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radii.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  text: { color: colors.warning },
});
