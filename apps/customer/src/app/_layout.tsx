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
import { AuthProvider, useAuth } from '@/lib/auth';

void SplashScreen.preventAutoHideAsync();

/** Signed in, but the profile didn't load (no network): retry instead of asking to create one. */
function ProfileUnavailable() {
  const { refreshProfile, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    setBusy(true);
    await refreshProfile();
    setBusy(false);
  };
  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <EmptyState
        title="Can’t reach Outly"
        message="We couldn’t load your profile. Check your connection and try again."
        action={
          <>
            <Button label="Try again" onPress={retry} loading={busy} />
            <Button label="Log out" variant="ghost" onPress={signOut} />
          </>
        }
      />
    </Screen>
  );
}

function RootStack() {
  const { ready, session, profile, profileFailed } = useAuth();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  if (session && !profile && profileFailed) return <ProfileUnavailable />;

  const signedIn = !!session;
  const hasProfile = signedIn && !!profile;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !hasProfile}>
        <Stack.Screen name="profile-setup" />
      </Stack.Protected>
      <Stack.Protected guard={hasProfile}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
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
    <AuthProvider>
      <StatusBar style="light" />
      <RootStack />
    </AuthProvider>
  );
}
