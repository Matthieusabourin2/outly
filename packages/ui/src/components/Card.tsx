import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radii, shadow, spacing } from '../tokens';

export type CardProps = ViewProps & { raised?: boolean };

export function Card({ raised = false, style, ...rest }: CardProps) {
  return <View style={[styles.card, raised && shadow.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[2],
  },
});
