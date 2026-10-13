import { Text, type TextProps } from './Text';

/**
 * An error under a form or action. Announced by screen readers when it appears
 * (role alert + live region). Pass text from toUserMessage, never a raw error.
 */
export function FormError({ children, ...rest }: Omit<TextProps, 'tone'> & { children: string | null | undefined | false }) {
  if (!children) return null;
  return (
    <Text tone="danger" accessibilityRole="alert" accessibilityLiveRegion="polite" {...rest}>
      {children}
    </Text>
  );
}
