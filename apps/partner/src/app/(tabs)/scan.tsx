import { sydneyTime } from '@outly/core';
import { useCallback } from 'react';
import { Scanner, type ScanResult } from '@/components/Scanner';
import { DOOR_TEXT } from '@/lib/scanText';
import { useStaff } from '@/lib/staff';
import { supabase } from '@/lib/supabase';

/** Door: the Outly pass gives the fast lane; staff always check the ticket too (SPEC A4). */
export default function DoorScanScreen() {
  const { current } = useStaff();
  const venueId = current?.venueId;

  const onCode = useCallback(
    async (code: string): Promise<ScanResult> => {
      if (!venueId) return { outcome: 'error' };
      const { data, error } = await supabase.rpc('scan_pass', { p_venue_id: venueId, p_code: code });
      if (error) throw error;
      const r = data[0];
      if (!r) return { outcome: 'error' };
      return {
        outcome: r.result,
        username: r.username,
        detail: r.result === 'already_used' && r.checked_in_at ? `Scanned at ${sydneyTime(r.checked_in_at)}.` : null,
      };
    },
    [venueId],
  );

  return <Scanner title={`${current?.venueName ?? 'Door'} · Fast lane`} texts={DOOR_TEXT} onCode={onCode} />;
}
