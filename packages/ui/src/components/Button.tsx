import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { colors, layout, radii, spacing, type as typeScale } from '../tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
};

const background: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.surfaceRaised,
  ghost: 'transparent',
  danger: colors.danger,
};

export function Button({ label, variant = 'primary', loading, fullWidth, disabled, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed && variant === 'primary' ? colors.primaryPressed : background[variant] },
        variant === 'secondary' && styles.bordered,
        fullWidth && styles.fullWidth,
        pressed && variant !== 'primary' && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.textOnPrimary} />
      ) : (
        <Text style={[typeScale.bodyStrong, { color: variant === 'ghost' ? colors.accent : colors.textOnPrimary }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouch + 4,
    paddingHorizontal: spacing[5],
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bordered: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
