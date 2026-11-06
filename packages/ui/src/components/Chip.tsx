import { Platform, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { colors, layout, radii, spacing } from '../tokens';
import { Text } from './Text';

export type ChipProps = Omit<PressableProps, 'children' | 'style'> & { label: string; selected?: boolean };

export function Chip({ label, selected = false, ...rest }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      // A toggle button: aria-pressed on the web (aria-selected isn't allowed on role=button there),
      // aria-selected on native, where aria-pressed doesn't exist.
      {...(Platform.OS === 'web' ? { 'aria-pressed': selected } : { 'aria-selected': selected })}
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
    // 44 px: hitSlop doesn't exist on the web, so the chip itself is the touch target.
    minHeight: layout.minTouch,
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
