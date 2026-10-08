import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { colors, layout, radii, spacing } from '../tokens';
import { Text } from './Text';

export type ChipProps = Omit<PressableProps, 'children' | 'style'> & { label: string; selected?: boolean };

export function Chip({ label, selected = false, ...rest }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={(layout.minTouch - 34) / 2}
      style={({ pressed }) => [styles.base, selected && styles.selected, pressed && styles.pressed]}
      {...rest}
    >
      <Text variant="caption" tone={selected ? 'default' : 'secondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 34,
    paddingHorizontal: spacing[4],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
});
