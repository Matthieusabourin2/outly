/**
 * Outly design tokens (D11). Derived from the 7 mockup boards, normalised.
 * Apps are dark-only. Admin (Next.js) maps these to CSS variables + shadcn theme.
 */

export const colors = {
  // Brand
  primary: '#7C3AED',        // violet — buttons, active tab, links
  primaryPressed: '#6D28D9',
  primarySoft: '#2A1B4F',    // selected chip background
  accent: '#A78BFA',         // highlights, icons, glow
  accentGlow: 'rgba(167, 139, 250, 0.35)',

  // Surfaces (night)
  background: '#0B0B1E',
  surface: '#14142B',        // cards
  surfaceRaised: '#1C1C3A',  // sheets, inputs
  border: '#2A2A4A',
  overlay: 'rgba(5, 5, 20, 0.72)',

  // Text
  text: '#FFFFFF',
  textSecondary: '#B8B8D1',
  textMuted: '#7A7A99',
  textOnPrimary: '#FFFFFF',

  // Semantic
  success: '#22C55E',        // confirmed, checked in, open now
  successSoft: '#0F2E1D',
  warning: '#F59E0B',        // pending, scheduled
  warningSoft: '#33240A',
  danger: '#EF4444',         // declined, delete, report
  dangerSoft: '#3A1414',
  info: '#38BDF8',
  rating: '#FACC15',

  // Deal source labels (D5) — must always be visible on a deal
  sourceOutlyPartner: '#A78BFA', // "Outly deal"
  sourcePublicListing: '#94A3B8',// "Venue offer · check with venue"
  sourceDemo: '#F472B6',         // "Demo" — demo env only
} as const;

export const radii = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const spacing = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

export const fonts = {
  // Load via expo-font / next/font. Script font is marketing-only, never in UI.
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  h1:      { fontFamily: fonts.bold,      fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  h2:      { fontFamily: fonts.bold,      fontSize: 20, lineHeight: 26 },
  h3:      { fontFamily: fonts.semibold,  fontSize: 17, lineHeight: 22 },
  body:    { fontFamily: fonts.regular,   fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.medium,    fontSize: 12, lineHeight: 16 },
  micro:   { fontFamily: fonts.semibold,  fontSize: 10, lineHeight: 12, letterSpacing: 0.4 },
} as const;

export const shadow = {
  glow: { shadowColor: colors.accent, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  card: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
} as const;

export const layout = {
  screenGutter: 16,
  tabBarHeight: 64,
  minTouch: 44,
} as const;

export const tokens = { colors, radii, spacing, fonts, type, shadow, layout };
export type Tokens = typeof tokens;
