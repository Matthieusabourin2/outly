import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../tokens';
import { Text } from './Text';

export type EmptyStateProps = { title: string; message?: string; icon?: ReactNode; action?: ReactNode };

export function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      {icon}
      <Text variant="h2" style={styles.center}>
        {title}
      </Text>
      {message ? (
        <Text tone="secondary" style={styles.center}>
          {message}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: spacing[3], paddingVertical: spacing[10], paddingHorizontal: spacing[6] },
  center: { textAlign: 'center' },
});
