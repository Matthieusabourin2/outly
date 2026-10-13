import Ionicons from '@expo/vector-icons/Ionicons';
import { toUserMessage } from '@outly/core';
import { Avatar, Button, FormError, Text, TextField, colors, layout, radii, spacing } from '@outly/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import type { Attendee } from '@/lib/night';
import { supabase } from '@/lib/supabase';
import { Sheet } from './Sheet';

type Step = 'menu' | 'report' | 'block' | 'done';

/**
 * One attendee, with report and block (CLAUDE.md non-negotiable 8).
 * After a block the person leaves the list, and this row (with its sheet) unmounts on the
 * next refresh, so the confirmation is shown by the parent: `onBlocked` closes this sheet
 * and hands over the username.
 */
export function AttendeeRow({ attendee, onBlocked }: { attendee: Attendee; onBlocked: (username: string) => void }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneText, setDoneText] = useState('');
  const me = session?.user.id;

  const close = () => {
    setOpen(false);
    setStep('menu');
    setReason('');
    setError(null);
  };

  const report = async () => {
    if (!me || busy) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from('reports').insert({ reporter_id: me, reported_user_id: attendee.user_id, reason: reason.trim() });
    setBusy(false);
    if (e) return setError(toUserMessage(e));
    setDoneText(`Thanks. The Outly team will look at your report about @${attendee.username}.`);
    setStep('done');
  };

  const block = async () => {
    if (!me || busy) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from('blocks').insert({ blocker_id: me, blocked_id: attendee.user_id });
    setBusy(false);
    if (e && e.code !== '23505') return setError(toUserMessage(e));
    close();
    onBlocked(attendee.username);
  };

  return (
    <>
      <View style={styles.row}>
        <Avatar name={attendee.username} />
        <Text variant="bodyStrong" style={styles.name} numberOfLines={1}>
          @{attendee.username}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Options for @${attendee.username}`} onPress={() => setOpen(true)} style={styles.more}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Sheet visible={open} onClose={close}>
        <Text variant="h3">@{attendee.username}</Text>
        {step === 'menu' ? (
          <>
            <Button label="Report" variant="secondary" onPress={() => setStep('report')} />
            <Button label="Block" variant="danger" onPress={() => setStep('block')} />
            <Button label="Cancel" variant="ghost" onPress={close} />
          </>
        ) : step === 'report' ? (
          <>
            <TextField label="What happened?" value={reason} onChangeText={setReason} multiline placeholder="Tell us briefly" style={styles.multiline} />
            <FormError>{error}</FormError>
            <Button label="Send report" onPress={report} loading={busy} disabled={reason.trim().length < 3} />
            <Button label="Back" variant="ghost" onPress={() => setStep('menu')} />
          </>
        ) : step === 'block' ? (
          <>
            <Text tone="secondary">You won’t see each other on attendee lists. They are not told you blocked them.</Text>
            <FormError>{error}</FormError>
            <Button label={`Block @${attendee.username}`} variant="danger" onPress={block} loading={busy} />
            <Button label="Back" variant="ghost" onPress={() => setStep('menu')} />
          </>
        ) : (
          <>
            <Text tone="secondary">{doneText}</Text>
            <Button label="Done" onPress={close} />
          </>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] },
  name: { flex: 1 },
  more: { width: layout.minTouch, height: layout.minTouch, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  multiline: { minHeight: 96, paddingTop: spacing[3], textAlignVertical: 'top' },
});
