import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, type as typeScale } from '../tokens';

type Variant = keyof typeof typeScale;
type Tone = 'default' | 'secondary' | 'muted' | 'accent' | 'danger' | 'success';

const toneColor: Record<Tone, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  accent: colors.accent,
  danger: colors.danger,
  success: colors.success,
};

export type TextProps = RNTextProps & { variant?: Variant; tone?: Tone };

export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  return <RNText style={[typeScale[variant], { color: toneColor[tone] }, style]} {...rest} />;
}
