import { Text, spacing } from '@outly/ui';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TURNSTILE_SITE_KEY } from '@/lib/captcha';

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<Turnstile> | null = null;

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile bot check (docs/SECURITY.md). Renders nothing when no site key
 * is configured. Calls onToken with a fresh single-use token, or null when it expires.
 * Change `resetKey` after each auth attempt: Supabase accepts a token only once.
 */
export function Captcha({ onToken, resetKey }: { onToken: (token: string | null) => void; resetKey: number }) {
  const host = useRef<View>(null);
  const widget = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadTurnstile()
      .then((t) => {
        const el = host.current as unknown as HTMLElement | null;
        if (cancelled || !el || widget.current) return;
        widget.current = t.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          size: 'flexible',
          callback: (token: string) => callback.current(token),
          'expired-callback': () => callback.current(null),
          'error-callback': () => callback.current(null),
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey > 0 && widget.current && window.turnstile) {
      callback.current(null);
      window.turnstile.reset(widget.current);
    }
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <View style={styles.root}>
      <View ref={host} style={styles.widget} accessibilityLabel="Security check" />
      {failed ? (
        <Text variant="caption" tone="danger">
          The security check could not load. Check your connection and reload the page.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[2] },
  widget: { minHeight: 65 },
});
