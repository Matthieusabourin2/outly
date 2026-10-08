import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, layout, spacing } from '../tokens';

export type ScreenProps = {
  children: ReactNode;
  /** Scrollable content (default true). */
  scroll?: boolean;
  /** Safe-area edges to pad. Tab screens skip the bottom edge (the tab bar handles it). */
  edges?: Edge[];
};

export function Screen({ children, scroll = true, edges = ['top'] }: ScreenProps) {
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenGutter, paddingVertical: spacing[4], gap: spacing[4] },
  fill: { flex: 1 },
});
