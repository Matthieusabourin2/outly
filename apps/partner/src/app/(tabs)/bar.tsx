import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, EmptyState, Screen, colors, spacing } from '@outly/ui';
import { useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import { Scanner, type ScanResult } from '@/components/Scanner';
import { BAR_TEXT } from '@/lib/scanText';
import { useStaff } from '@/lib/staff';
import { supabase } from '@/lib/supabase';
import { useTonight } from '@/lib/tonight';

/** Bar: one Outly drinks offer per pass per night, only while the offer is switched on. */
export default function BarScanScreen() {
  const { current } = useStaff();
  const { offer, loading, error, reload } = useTonight();
  const venueId = current?.venueId;
  const offerId = offer?.id;

  const onCode = useCallback(
    async (code: string): Promise<ScanResult> => {
      if (!venueId || !offerId) return { outcome: 'error' };
      const { data, error } = await supabase.rpc('redeem_offer', { p_venue_id: venueId, p_deal_id: offerId, p_code: code });
      if (error) throw error;
      const r = data[0];
      return r ? { outcome: r.result, username: r.username, detail: offer?.title } : { outcome: 'error' };
    },
    [venueId, offerId, offer?.title],
  );

  if (!offer) {
    return (
      <Screen scroll={false}>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing[12] }} accessibilityLabel="Loading" />
        ) : error ? (
          <EmptyState
            icon={<Ionicons name="cloud-offline-outline" size={44} color={colors.accent} />}
            title="Can’t load tonight’s offer"
            message={error}
            action={<Button label="Try again" variant="secondary" onPress={reload} />}
          />
        ) : (
          <EmptyState
            icon={<Ionicons name="wine-outline" size={44} color={colors.accent} />}
            title="No Outly drinks offer tonight"
            message="When the venue switches on an Outly drinks offer, you can scan passes here."
          />
        )}
      </Screen>
    );
  }

  return <Scanner title={`Bar · ${offer.title}`} texts={BAR_TEXT} onCode={onCode} />;
}
