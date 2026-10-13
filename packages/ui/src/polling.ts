import { AppState, type AppStateStatus } from 'react-native';

/**
 * Calls `load` now and every `intervalMs` while the app is in the foreground.
 * Pauses when the tab is hidden / the phone is locked (AppState maps to
 * document.visibilityState on the web) and refreshes at once on return.
 * Returns a cleanup function — designed to be returned from useFocusEffect, so
 * polling also stops when the user leaves the screen.
 */
export function startVisiblePolling(load: () => void, intervalMs: number): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  const start = () => {
    if (timer) return;
    load();
    timer = setInterval(load, intervalMs);
  };
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  const onChange = (state: AppStateStatus) => (state === 'active' ? start() : stop());

  if (AppState.currentState === 'background') stop();
  else start();
  const subscription = AppState.addEventListener('change', onChange);
  return () => {
    stop();
    subscription.remove();
  };
}
