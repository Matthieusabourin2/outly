import { StyleSheet, View } from 'react-native';
import { colors } from '../tokens';
import { Text } from './Text';

/** V1 has no photos (SPEC A5): a generated initial on a brand tint. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.root, { width: size, height: size, borderRadius: size / 2 }]} accessibilityElementsHidden importantForAccessibility="no">
      <Text variant="bodyStrong" style={{ color: colors.accent, fontSize: Math.round(size * 0.4) }}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
