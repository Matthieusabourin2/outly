import { z } from 'zod';

/** D5: every deal / event carries a source and must always show its label. */
export const contentSourceSchema = z.enum(['public_listing', 'outly_partner', 'demo']);
export type ContentSource = z.infer<typeof contentSourceSchema>;

export const SOURCE_LABELS: Record<ContentSource, string> = {
  outly_partner: 'Outly deal',
  public_listing: 'Venue offer · check with venue',
  demo: 'Demo',
};

/** A public_listing is hidden once its verification is older than this (SPEC §5). */
export const PUBLIC_LISTING_MAX_AGE_DAYS = 30;
