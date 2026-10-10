import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text, colors, radii, spacing } from '@outly/ui';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ScanOutcome } from '@/lib/scanText';

export type ScanResult = { outcome: ScanOutcome; username?: string | null; detail?: string | null };
type Texts = Record<ScanOutcome, { title: string; body: string; tone: 'ok' | 'bad' | 'warn' }>;

const OK_AUTO_RESET_MS = 3500;
const SAME_CODE_COOLDOWN_MS = 6000;

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

/**
 * Full-screen QR scanner for door and bar. One scan at a time: the camera pauses on a result
 * until staff tap "Scan next" (accepted passes reset by themselves).
 */
export function Scanner({ title, texts, onCode }: { title: string; texts: Texts; onCode: (code: string) => Promise<ScanResult> }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const last = useRef<{ code: string; at: number } | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setResult(null);
    setChecking(false);
  }, []);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const handle = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (checking || result) return;
      const now = Date.now();
      if (last.current && last.current.code === data && now - last.current.at < SAME_CODE_COOLDOWN_MS) return;
      last.current = { code: data, at: now };
      setChecking(true);
      let next: ScanResult;
      if (isOffline()) next = { outcome: 'offline' };
      else {
        try {
          next = await onCode(data);
        } catch {
          next = { outcome: isOffline() ? 'offline' : 'error' };
        }
      }
      setChecking(false);
      setResult(next);
      buzz(next.outcome === 'ok');
      if (next.outcome === 'ok') resetTimer.current = setTimeout(reset, OK_AUTO_RESET_MS);
    },
    [checking, result, onCode, reset],
  );

  if (!permission) return <View style={styles.fill} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.fill, styles.center]}>
        <Ionicons name="camera-outline" size={48} color={colors.accent} />
        <Text variant="h2" style={styles.textCenter}>
          Allow the camera
        </Text>
        <Text tone="secondary" style={styles.textCenter}>
          The scanner needs the camera to read Outly passes.
        </Text>
        <Button label="Allow camera" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  if (result) {
    const text = texts[result.outcome];
    const tone = TONE[text.tone];
    return (
      <SafeAreaView style={[styles.fill, styles.result, { backgroundColor: tone.bg }]} accessibilityLiveRegion="assertive">
        <View style={styles.resultBody}>
          <Ionicons name={tone.icon} size={140} color={tone.fg} />
          <Text variant="display" style={styles.textCenter}>
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
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handle}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="none">
        <View style={styles.titleBar}>
          <Text variant="bodyStrong">{title}</Text>
        </View>
        <View style={styles.frame} />
        <View style={styles.titleBar}>
          <Text variant="bodyStrong">{checking ? 'Checking…' : 'Point at the Outly pass'}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing[4], padding: spacing[6] },
  textCenter: { textAlign: 'center' },
  result: { padding: spacing[5], justifyContent: 'space-between' },
  resultBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  instruction: { paddingVertical: spacing[4], paddingHorizontal: spacing[5], borderRadius: radii.lg, backgroundColor: colors.surfaceRaised },
  instructionOk: { backgroundColor: colors.warning },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'space-between', padding: spacing[5] },
  titleBar: { paddingVertical: spacing[2], paddingHorizontal: spacing[4], borderRadius: radii.pill, backgroundColor: colors.overlay },
  frame: { width: 260, height: 260, borderRadius: radii.xl, borderWidth: 4, borderColor: colors.accent },
});
