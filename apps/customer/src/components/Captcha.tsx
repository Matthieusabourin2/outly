// Native apps (store builds, November): the bot check will use a WebView or the
// platform's attestation. The launch ships as a website, see Captcha.web.tsx.
export function Captcha(_props: { onToken: (token: string | null) => void; resetKey: number }) {
  return null;
}
