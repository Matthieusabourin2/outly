import Ionicons from '@expo/vector-icons/Ionicons';
import type { Enums } from '@outly/db';
import { Text, colors, radii, spacing } from '@outly/ui';
import { Pressable, StyleSheet, View } from 'react-native';

type Visibility = Enums<'attendee_visibility'>;

const OPTIONS: { value: Visibility; title: string; body: string; icon: 'eye-off-outline' | 'hand-left-outline' }[] = [
  { value: 'ghost', title: 'Ghost', body: "Nobody sees you on the list. You don't see the list either, only the count.", icon: 'eye-off-outline' },
  { value: 'classic', title: 'Classic', body: 'Your username shows on the list, and you see everyone else who chose classic.', icon: 'hand-left-outline' },
];

export function VisibilityChoice({ value, onChange, disabled }: { value: Visibility; onChange: (v: Visibility) => void; disabled?: boolean }) {
  return (
    <View style={styles.root} accessibilityRole="radiogroup">
      {OPTIONS.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            aria-checked={selected}
            aria-disabled={!!disabled}
            accessibilityLabel={`${o.title}. ${o.body}`}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[styles.option, selected && styles.optionOn]}
          >
            <Ionicons name={o.icon} size={26} color={colors.accent} />
            <View style={styles.text}>
              <Text variant="bodyStrong">{o.title}</Text>
              <Text variant="caption" tone="secondary">
                {o.body}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[3] },
  option: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
    padding: spacing[4],
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  text: { flex: 1, gap: spacing[1] },
});
