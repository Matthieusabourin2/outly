import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

function browserOnline(): boolean {
  return !isWeb || typeof navigator === 'undefined' || navigator.onLine !== false;
}

/**
 * False while the browser says it has no network (airplane mode, no signal, Wi-Fi without
 * internet is NOT detected: requests then fail and screens show NETWORK_ERROR_MESSAGE).
 * Always true on native for now (store builds come later, SPEC A3).
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(browserOnline);
  useEffect(() => {
    if (!isWeb) return;
    const update = () => setOnline(browserOnline());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener: (type: 'release', cb: () => void) => void };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };

/**
 * Keeps the screen on while `active` (Screen Wake Lock API: Safari iOS 16.4+, Chrome Android).
 * The browser drops the lock whenever the page is hidden, so it is taken again on return.
 * Silently does nothing where unsupported (or on native until the store builds).
 */
export function useKeepScreenOn(active: boolean): void {
  useEffect(() => {
    if (!isWeb || !active) return;
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let disposed = false;
    const acquire = () => {
      if (disposed || sentinel || document.visibilityState !== 'visible') return;
      wakeLock
        .request('screen')
        .then((s) => {
          if (disposed) return void s.release().catch(() => undefined);
          sentinel = s;
          s.addEventListener('release', () => {
            if (sentinel === s) sentinel = null;
          });
        })
        .catch(() => undefined); // Low battery mode or no permission: the screen just locks as usual.
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', acquire);
      void sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, [active]);
}
