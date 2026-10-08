import { z } from 'zod';

export const partnerStatusSchema = z.enum(['listed', 'pending', 'partner', 'inactive']);
export type PartnerStatus = z.infer<typeof partnerStatusSchema>;

/** D5: booking, guest list, QR pass and Outly Pay only at partner venues. */
export function canBook(status: PartnerStatus): boolean {
  return status === 'partner';
}
