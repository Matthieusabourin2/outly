import { Button, Screen, Text, spacing } from '@outly/ui';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LEGAL_UPDATED, type LegalSection } from '@/content/legal';

export function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <Screen edges={['top', 'bottom']}>
      <Button label="Back" variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <Text variant="h1" accessibilityRole="header">
        {title}
      </Text>
      {sections.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text variant="h3" accessibilityRole="header">
            {s.heading}
          </Text>
          {s.body.map((p) => (
            <Text key={p} tone="secondary">
              {p}
            </Text>
          ))}
        </View>
      ))}
      <Text variant="caption" tone="muted">
        Last updated {LEGAL_UPDATED}.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({ section: { gap: spacing[2] } });
