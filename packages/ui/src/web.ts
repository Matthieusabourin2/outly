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

/**
 * On iPhone/Safari, expo-font registers the fonts but does not wait for them (its loader is
 * disabled on WebKit), so the browser downloads each weight the first time it is drawn. A
 * weight first needed offline (the door result title, 800) then falls back to a serif font.
 * This forces every family to download up front. Returns true once they are in (or after
 * `timeoutMs`, so a slow network never blocks the app). Native: returns `ready` as is.
 */
export function useFontsPreloaded(families: readonly string[], ready: boolean, timeoutMs = 5000): boolean {
  const supported = isWeb && typeof document !== 'undefined' && 'fonts' in document;
  const [done, setDone] = useState(false);
  const key = families.join('|');
  useEffect(() => {
    if (!supported || !ready) return;
    let cancelled = false;
    const all = Promise.all(key.split('|').map((family) => document.fonts.load(`16px "${family}"`).catch(() => [])));
    const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
    void Promise.race([all, timeout]).then(() => !cancelled && setDone(true));
    return () => {
      cancelled = true;
    };
  }, [supported, ready, key, timeoutMs]);
  return supported ? ready && done : ready;
}
