import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, OfflineBanner, Text, colors, radii, spacing, useKeepScreenOn } from '@outly/ui';
import { CameraView, type BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraAccess, useCameraSession, type CameraAccess } from '@/lib/cameraAccess';
import { prepareQrReader } from '@/lib/qrReader';
import { OFFLINE_STAFF_MESSAGE, type ScanOutcome } from '@/lib/scanText';

export type ScanResult = { outcome: ScanOutcome; username?: string | null; detail?: string | null };
type Texts = Record<ScanOutcome, { title: string; body: string; tone: 'ok' | 'bad' | 'warn' }>;

const OK_AUTO_RESET_MS = 3500;
/** The same code is ignored for this long after its result is dismissed (guest still holding the phone up). */
const SAME_CODE_COOLDOWN_MS = 6000;
/** No answer from the server after this long: say so instead of "Checking…" forever on club 4G. */
const SCAN_TIMEOUT_MS = 8000;
/** Outcomes where the pass was not checked (network): rescanning the same pass is the fix. */
const RETRYABLE = new Set<ScanOutcome>(['offline', 'slow', 'error']);

const TONE = {
  ok: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' as const },
  bad: { bg: colors.dangerSoft, fg: colors.danger, icon: 'close-circle' as const },
  warn: { bg: colors.warningSoft, fg: colors.warning, icon: 'cloud-offline' as const },
};

function isOffline(): boolean {
  return Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false;
}

function buzz(ok: boolean) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(ok ? 60 : [120, 60, 120]);
  }
}

class ScanTimeout extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ScanTimeout()), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** True while the app/tab is in the foreground (AppState follows document visibility on the web). */
function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

/**
 * Full-screen QR scanner for door and bar. One scan at a time: scanning pauses on a result
 * until staff tap "Scan next" (accepted passes reset by themselves). The camera only runs
 * while this tab is on screen and the phone is unlocked, and stays on between scans.
 */
export function Scanner({ title, texts, onCode }: { title: string; texts: Texts; onCode: (code: string) => Promise<ScanResult> }) {
  const { access, request, reportError } = useCameraAccess();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [readerFailed, setReaderFailed] = useState(false);

  // expo-camera's web scan loop keeps the first callback it was given, so everything the
  // handler needs is read through refs (venue, offer, busy state), never from a closure.
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);
  const busy = useRef(false);
  const last = useRef<{ code: string; at: number } | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const cameraOn = access === 'granted' && focused && appActive;
  useKeepScreenOn(cameraOn);
  useCameraSession(cameraOn);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  // Download the QR decoder (Safari) while the camera starts, not at the first pass.
  useEffect(() => {
    if (access !== 'granted') return;
    let cancelled = false;
    void prepareQrReader().then((ok) => !cancelled && setReaderFailed(!ok));
    return () => {
      cancelled = true;
    };
  }, [access]);

  const reset = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = null;
    // The cooldown starts now: the guest is often still holding the same pass up.
    if (last.current) last.current.at = Date.now();
    busy.current = false;
    setResult(null);
    setChecking(false);
  }, []);

  // Leaving the tab or locking the phone dismisses a result: the next guest starts clean.
  const showing = useRef(false);
  useEffect(() => {
    showing.current = result !== null;
  }, [result]);
  const dismissIfShowing = useCallback(() => {
    if (showing.current) reset();
  }, [reset]);
  useFocusEffect(useCallback(() => dismissIfShowing, [dismissIfShowing]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && dismissIfShowing());
    return () => sub.remove();
  }, [dismissIfShowing]);

  const handle = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (busy.current) return;
      const now = Date.now();
      if (last.current && last.current.code === data && now - last.current.at < SAME_CODE_COOLDOWN_MS) return;
      busy.current = true;
      last.current = { code: data, at: now };
      setChecking(true);
      let next: ScanResult;
      if (isOffline()) next = { outcome: 'offline' };
      else {
        try {
          next = await withTimeout(onCodeRef.current(data), SCAN_TIMEOUT_MS);
        } catch (e) {
          next = { outcome: isOffline() ? 'offline' : e instanceof ScanTimeout ? 'slow' : 'error' };
        }
      }
      if (!mounted.current) return;
      // A connection problem says "scan again": the same pass is then read straight away
      // instead of being ignored for the cooldown.
      last.current = RETRYABLE.has(next.outcome) ? null : { code: data, at: Date.now() };
      setChecking(false);
      setResult(next);
      buzz(next.outcome === 'ok');
      if (next.outcome === 'ok') resetTimer.current = setTimeout(reset, OK_AUTO_RESET_MS);
    },
    [reset],
  );

  if (access !== 'granted') return <CameraAccessHelp access={access} onRequest={request} />;

  const text = result ? texts[result.outcome] : null;
  const tone = text ? TONE[text.tone] : null;

  return (
    <View style={styles.fill}>
      {cameraOn ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          // Paused while a result is on screen; resumes on "Scan next".
          onBarcodeScanned={result || checking ? undefined : handle}
          onMountError={reportError}
        />
      ) : null}
      <SafeAreaView style={styles.overlay} pointerEvents="none">
        <View style={styles.titleBar}>
          <Text variant="bodyStrong">{title}</Text>
        </View>
        <View style={styles.frame} />
        <View style={styles.bottom}>
          <OfflineBanner message={OFFLINE_STAFF_MESSAGE} />
          {readerFailed ? (
            <View style={styles.titleBar}>
              <Text variant="bodyStrong" tone="danger">
                The QR reader didn’t load. Check the connection, then reload the page.
              </Text>
            </View>
          ) : null}
          <View style={styles.titleBar} accessibilityLiveRegion="polite">
            <Text variant="bodyStrong">{checking ? 'Checking…' : 'Point at the Outly pass'}</Text>
          </View>
        </View>
      </SafeAreaView>

      {result && text && tone ? (
        <SafeAreaView style={[styles.result, { backgroundColor: tone.bg }]} accessibilityLiveRegion="assertive">
          <View style={styles.resultBody}>
            <Ionicons name={tone.icon} size={140} color={tone.fg} />
            <Text variant="display" style={styles.textCenter} accessibilityRole="header">
              {text.title}
            </Text>
            {result.username ? (
              <Text variant="h2" style={[styles.textCenter, { color: tone.fg }]}>
                @{result.username}
              </Text>
            ) : null}
            {text.tone === 'ok' && result.outcome === 'ok' && result.detail ? (
              <Text variant="bodyStrong" style={styles.textCenter}>
                {result.detail}
              </Text>
            ) : null}
            <View style={[styles.instruction, text.tone === 'ok' && styles.instructionOk]}>
              <Text variant="h3" style={[styles.textCenter, text.tone === 'ok' && { color: colors.background }]}>
                {text.body}
              </Text>
            </View>
            {result.outcome !== 'ok' && result.detail ? (
              <Text tone="secondary" style={styles.textCenter}>
                {result.detail}
              </Text>
            ) : null}
          </View>
          <Button label="Scan next" onPress={reset} fullWidth />
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const HELP: Record<Exclude<CameraAccess, 'granted' | 'checking' | 'prompt'>, { title: string; body: string }> = {
  denied: {
    title: 'Camera blocked',
    body: 'This browser is blocking the camera for the staff site. Allow it, then reload the page. Until then, send guests to the normal line.',
  },
  insecure: {
    title: 'Camera not available',
    body: 'The camera only works on the secure (https) address of the staff site. Open it from the link the Outly team sent you.',
  },
  unsupported: {
    title: 'Camera not available',
    body: 'This browser can’t use the camera. Open the staff site in Safari on iPhone or Chrome on Android.',
  },
  'no-camera': {
    title: 'No camera found',
    body: 'This device has no camera the scanner can use. Use a phone with a back camera.',
  },
  'in-use': {
    title: 'Camera didn’t start',
    body: 'Another app may be using the camera. Close it (video calls, camera app), then try again.',
  },
};

/** Before the camera runs: ask for it, or explain exactly how to fix what's blocking it. */
function CameraAccessHelp({ access, onRequest }: { access: CameraAccess; onRequest: () => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  const ask = async () => {
    setAsking(true);
    await onRequest();
    setAsking(false);
  };
  const reload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload();
  };

  if (access === 'checking' || access === 'granted') return <View style={styles.fill} />;

  if (access === 'prompt') {
    return (
      <SafeAreaView style={[styles.fill, styles.center]}>
        <Ionicons name="camera-outline" size={48} color={colors.accent} />
        <Text variant="h2" style={styles.textCenter} accessibilityRole="header">
          Allow the camera
        </Text>
        <Text tone="secondary" style={styles.textCenter}>
          The scanner needs the camera to read Outly passes. When your phone asks, tap Allow.
        </Text>
        <Button label="Allow camera" onPress={ask} loading={asking} />
      </SafeAreaView>
    );
  }

  const help = HELP[access];
  return (
    <SafeAreaView style={styles.fill}>
      <ScrollView contentContainerStyle={styles.help}>
        <Ionicons name={access === 'denied' ? 'videocam-off-outline' : 'camera-outline'} size={48} color={colors.accent} style={styles.selfCenter} />
        <Text variant="h2" style={styles.textCenter} accessibilityRole="header">
          {help.title}
        </Text>
        <Text tone="secondary" style={styles.textCenter}>
          {help.body}
        </Text>
        {access === 'denied' ? (
          <>
            <View style={styles.steps}>
              <Text variant="bodyStrong">iPhone (Safari)</Text>
              <Text tone="secondary">1. Tap the page menu (aA) next to the web address.</Text>
              <Text tone="secondary">2. Tap Website Settings, then Camera, then Allow.</Text>
              <Text tone="secondary">Not there? Open Settings › Apps › Safari › Camera and choose Allow.</Text>
            </View>
            <View style={styles.steps}>
              <Text variant="bodyStrong">Android (Chrome)</Text>
              <Text tone="secondary">1. Tap the icon to the left of the web address.</Text>
              <Text tone="secondary">2. Tap Permissions (or Site settings), then Camera, then Allow.</Text>
            </View>
            <Button label="Reload the page" onPress={reload} />
          </>
        ) : access === 'in-use' ? (
          <Button label="Try again" onPress={ask} loading={asking} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing[4], padding: spacing[6] },
  help: { flexGrow: 1, justifyContent: 'center', gap: spacing[4], padding: spacing[6] },
  steps: { gap: spacing[1], padding: spacing[4], borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  selfCenter: { alignSelf: 'center' },
  textCenter: { textAlign: 'center' },
  result: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, padding: spacing[5], justifyContent: 'space-between' },
  resultBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  instruction: { paddingVertical: spacing[4], paddingHorizontal: spacing[5], borderRadius: radii.lg, backgroundColor: colors.surfaceRaised },
  instructionOk: { backgroundColor: colors.warning },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'space-between', padding: spacing[5] },
  bottom: { alignItems: 'center', gap: spacing[2] },
  titleBar: { paddingVertical: spacing[2], paddingHorizontal: spacing[4], borderRadius: radii.pill, backgroundColor: colors.overlay },
  frame: { width: 260, height: 260, borderRadius: radii.xl, borderWidth: 4, borderColor: colors.accent },
});
