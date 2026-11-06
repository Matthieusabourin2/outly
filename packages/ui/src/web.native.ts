// Native (iOS / Android) versions of the hooks in web.ts. Metro picks this file instead of
// web.ts in the native apps; the websites keep using web.ts. Same exports, same behaviour.
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useNetworkState } from 'expo-network';
import { useEffect, useId } from 'react';

/**
 * False when the device reports no connection (airplane mode, no signal) or a network
 * without internet. Unknown states count as online: a failed request then shows its own error.
 */
export function useOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetworkState();
  return isConnected !== false && isInternetReachable !== false;
}

/** Keeps the screen on while `active` (the pass at the door and at the bar). */
export function useKeepScreenOn(active: boolean): void {
  const tag = `outly-keep-screen-on-${useId()}`;
  useEffect(() => {
    if (!active) return;
    activateKeepAwakeAsync(tag).catch(() => undefined); // Unsupported device: the screen just locks as usual.
    return () => {
      void deactivateKeepAwake(tag).catch(() => undefined);
    };
  }, [active, tag]);
}

/** Native fonts are ready once expo-font says so: nothing to preload. */
export function useFontsPreloaded(_families: readonly string[], ready: boolean, _timeoutMs = 5000): boolean {
  return ready;
}
