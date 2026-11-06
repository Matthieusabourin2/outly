import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radii, spacing, type as typeScale } from '../tokens';
import { Text } from './Text';

export type TextFieldProps = TextInputProps & { label: string; hint?: string; error?: string | null };

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, style, ...rest },
  ref,
) {
  return (
    <View style={styles.root}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: spacing[1] + 2 },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing[4],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: typeScale.body.fontSize,
  },
  inputError: { borderColor: colors.danger },
});
