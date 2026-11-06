import { Text, spacing } from '@outly/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { CAPTCHA_ORIGIN, TURNSTILE_SITE_KEY } from '@/lib/captcha';

/** Turnstile tokens are ~2 KB of URL-safe characters; anything else is not a token. */
const TOKEN = /^[A-Za-z0-9._-]{20,4096}$/;

/**
 * The widget page. It is served with `baseUrl` = CAPTCHA_ORIGIN, the site the Turnstile widget
 * is registered for (Cloudflare checks the hostname), and only talks to the app through
 * window.ReactNativeWebView.postMessage. The site key is public; JSON-encoded and `</` escaped.
 */
function widgetHtml(siteKey: string): string {
  const key = JSON.stringify(siteKey).replace(/</g, '\\u003c');
  return `<!doctype html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}#w{width:100%}</style>
<script>
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
function ready(){
  try{
    turnstile.render('#w',{sitekey:${key},theme:'dark',size:'flexible',
      callback:function(t){send({type:'token',token:t});},
      'expired-callback':function(){send({type:'expired'});},
      'error-callback':function(){send({type:'error'});}});
  }catch(e){send({type:'error'});}
}
</script>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=ready" async defer onerror="send({type:'error'})"></script>
</head><body><div id="w"></div></body></html>`;
}

/**
 * Cloudflare Turnstile bot check for the native apps (docs/SECURITY.md), same contract as
 * Captcha.web.tsx: renders nothing without a site key, calls onToken with a fresh single-use
 * token or null when it expires/fails. Change `resetKey` after each auth attempt: the WebView is
 * remounted, which gives a new widget and a new token (Supabase accepts a token only once).
 */
export function Captcha({ onToken, resetKey }: { onToken: (token: string | null) => void; resetKey: number }) {
  const [failed, setFailed] = useState(false);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  const source = useMemo(() => ({ html: widgetHtml(TURNSTILE_SITE_KEY), baseUrl: `${CAPTCHA_ORIGIN}/` }), []);

  useEffect(() => {
    if (resetKey > 0) callback.current(null);
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;

  const onMessage = (event: WebViewMessageEvent) => {
    // Only the widget page itself (served as CAPTCHA_ORIGIN) can post; the Turnstile iframe cannot.
    if (!event.nativeEvent.url.startsWith(CAPTCHA_ORIGIN)) return;
    let message: { type?: unknown; token?: unknown };
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (message.type === 'token' && typeof message.token === 'string' && TOKEN.test(message.token)) {
      setFailed(false);
      callback.current(message.token);
    } else if (message.type === 'expired') {
      callback.current(null);
    } else if (message.type === 'error') {
      setFailed(true);
      callback.current(null);
    }
  };

  // The widget page never navigates. Links in the widget (Privacy, Help) open in the browser.
  const onShouldStartLoadWithRequest = (request: ShouldStartLoadRequest) => {
    const { url, isTopFrame } = request;
    if (isTopFrame === false || url === 'about:blank' || url.startsWith(`${CAPTCHA_ORIGIN}/`) || url.startsWith('https://challenges.cloudflare.com/')) {
      return true;
    }
    if (url.startsWith('https://')) void Linking.openURL(url).catch(() => undefined);
    return false;
  };

  return (
    <View style={styles.root}>
      <View style={styles.widget} accessibilityLabel="Security check">
        <WebView
          key={resetKey}
          source={source}
          originWhitelist={[`${CAPTCHA_ORIGIN}/*`, 'https://challenges.cloudflare.com/*', 'about:blank']}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onError={() => {
            setFailed(true);
            callback.current(null);
          }}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          mixedContentMode="never"
          allowFileAccess={false}
          scrollEnabled={false}
          style={styles.webview}
        />
      </View>
      {failed ? (
        <Text variant="caption" tone="danger">
          The security check could not load. Check your connection and try again.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[2] },
  widget: { height: 70 },
  webview: { backgroundColor: 'transparent' },
});
