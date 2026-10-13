import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, EmptyState, Screen, colors, fonts, useFontsPreloaded } from '@outly/ui';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StaffProvider, useStaff } from '@/lib/staff';

void SplashScreen.preventAutoHideAsync();

/** Signed in, but the venues didn't load (no network): retry instead of "no venue on this account". */
function VenuesUnavailable() {
  const { retry, signOut } = useStaff();
  const [busy, setBusy] = useState(false);
  const again = async () => {
    setBusy(true);
    await retry();
    setBusy(false);
  };
  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <EmptyState
        title="Can’t reach Outly"
        message="We couldn’t load your venue. Check your connection and try again. Meanwhile, use the normal line."
        action={
          <>
            <Button label="Try again" onPress={again} loading={busy} />
            <Button label="Log out" variant="ghost" onPress={signOut} />
          </>
        }
      />
    </Screen>
  );
}

function RootStack() {
  const { ready, session, current, memberships, loadFailed } = useStaff();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  if (session && loadFailed && memberships.length === 0) return <VenuesUnavailable />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !current}>
        <Stack.Screen name="no-access" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !!current}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Ionicons is registered here too: expo-font re-inserts its <style> on every registration,
  // which resets the fonts already downloaded. All registrations first, then the preload.
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Every weight downloaded before the first screen: it may be needed later without network.
  const fontsReady = useFontsPreloaded([...Object.values(fonts), ...Object.keys(Ionicons.font)], fontsLoaded || !!fontError);
  if (!fontsReady) return null;

  return (
    <StaffProvider>
      <StatusBar style="light" />
      <RootStack />
    </StaffProvider>
  );
}
