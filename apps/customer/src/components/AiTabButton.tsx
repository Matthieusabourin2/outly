import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, shadow } from '@outly/ui';
import type { BottomTabBarButtonProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';

const SIZE = 58;

/** The raised centre "AI" button of the customer tab bar (D11). */
export function AiTabButton({ onPress, onLongPress, accessibilityState }: BottomTabBarButtonProps) {
  const selected = !!accessibilityState?.selected;
  return (
    <View style={styles.slot}>
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="Outly AI"
        accessibilityState={{ selected }}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.button, shadow.glow, pressed && { backgroundColor: colors.primaryPressed }]}
      >
        <Ionicons name={selected ? 'sparkles' : 'sparkles-outline'} size={26} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1, alignItems: 'center' },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    marginTop: -SIZE / 3,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
