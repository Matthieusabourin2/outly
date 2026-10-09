import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fonts, layout } from '@outly/ui';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { canScanBar, canScanDoor, useStaff } from '@/lib/staff';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(active: IconName, inactive: IconName) {
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? active : inactive} color={color} size={size} />;
  }
  return TabIcon;
}

/** Tabs filtered by role: door = Tonight + Scan, bar staff = Tonight + Bar, managers = all. */
export default function TabsLayout() {
  const { current } = useStaff();
  const role = current?.role ?? 'venue_door';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: layout.tabBarHeight },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Tonight', tabBarIcon: icon('stats-chart', 'stats-chart-outline') }} />
      <Tabs.Screen name="scan" options={{ title: 'Door', href: canScanDoor(role) ? undefined : null, tabBarIcon: icon('scan', 'scan-outline') }} />
      <Tabs.Screen name="bar" options={{ title: 'Bar', href: canScanBar(role) ? undefined : null, tabBarIcon: icon('wine', 'wine-outline') }} />
    </Tabs>
  );
}
