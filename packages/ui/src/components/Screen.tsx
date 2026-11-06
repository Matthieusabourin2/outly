import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
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
        // Native: the keyboard pushes the form up instead of covering it; a tap on a button
        // works even while the keyboard is open (first tap no longer just closes it).
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'web' ? undefined : 'padding'} enabled={Platform.OS !== 'web'}>
          <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
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
