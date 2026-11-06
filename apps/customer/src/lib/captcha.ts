/** Public Turnstile site key (not a secret). Unset = no bot check, the app works as before. */
export const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? '';

/**
 * The site the Turnstile widget is registered for. The native apps serve the widget page as
 * this origin (Captcha.tsx), since Cloudflare only issues tokens on the widget's hostnames.
 */
export const CAPTCHA_ORIGIN = (process.env.EXPO_PUBLIC_CAPTCHA_ORIGIN ?? 'https://outly-sydney.com').replace(/\/+$/, '');

/** A token is required before any auth call as soon as a site key is set: website (Captcha.web.tsx) and apps (Captcha.tsx). */
export const CAPTCHA_REQUIRED = TURNSTILE_SITE_KEY.length > 0;
