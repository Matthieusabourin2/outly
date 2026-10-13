import { Platform } from 'react-native';

/** Public Turnstile site key (not a secret). Unset = no bot check, the site works as before. */
export const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? '';

/** The bot check only runs on the website for now (Captcha.web.tsx). */
export const CAPTCHA_REQUIRED = Platform.OS === 'web' && TURNSTILE_SITE_KEY.length > 0;
