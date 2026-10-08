import { adminLightColors, colors, radii } from '@outly/ui/tokens';

type Palette = typeof colors | typeof adminLightColors;

/** Maps Outly tokens (packages/ui) to the CSS variables shadcn/ui reads. Single source of truth for colours. */
function shadcnVars(c: Palette): Record<string, string> {
  return {
    background: c.background,
    foreground: c.text,
    card: c.surface,
    'card-foreground': c.text,
    popover: c.surfaceRaised,
    'popover-foreground': c.text,
    primary: c.primary,
    'primary-foreground': c.textOnPrimary,
    secondary: c.surfaceRaised,
    'secondary-foreground': c.text,
    muted: c.surfaceRaised,
    'muted-foreground': c.textMuted,
    accent: c.primarySoft,
    'accent-foreground': c.text,
    destructive: c.danger,
    border: c.border,
    input: c.border,
    ring: c.accent,
    'chart-1': c.primary,
    'chart-2': c.accent,
    'chart-3': c.info,
    'chart-4': c.success,
    'chart-5': c.warning,
    sidebar: c.surface,
    'sidebar-foreground': c.text,
    'sidebar-primary': c.primary,
    'sidebar-primary-foreground': c.textOnPrimary,
    'sidebar-accent': c.primarySoft,
    'sidebar-accent-foreground': c.text,
    'sidebar-border': c.border,
    'sidebar-ring': c.accent,
    success: c.success,
    warning: c.warning,
    'source-outly-partner': c.sourceOutlyPartner,
    'source-public-listing': c.sourcePublicListing,
    'source-demo': c.sourceDemo,
  };
}

const block = (selector: string, c: Palette) =>
  `${selector}{${Object.entries(shadcnVars(c))
    .map(([k, v]) => `--${k}:${v};`)
    .join('')}}`;

export const themeCss = [
  `:root{--radius:${radii.sm / 16}rem;}`,
  block(':root', adminLightColors),
  block('.dark', colors),
].join('\n');
