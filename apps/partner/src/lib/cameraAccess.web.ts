import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { CameraAccess } from './cameraAccess';

export type { CameraAccess } from './cameraAccess';

/** Maps a getUserMedia failure to something door staff can act on. */
export function cameraErrorToAccess(error: unknown): CameraAccess {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'no-camera';
  return 'in-use'; // NotReadableError, AbortError, TrackStartError: another app holds the camera, or it crashed
}

/** What can be known without asking the browser (synchronous). */
function initialAccess(): CameraAccess {
  if (typeof window === 'undefined') return 'checking';
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
  if (!navigator.permissions?.query) return 'prompt';
  return 'checking';
}

/**
 * Browser camera access, without expo-camera's permission hook: that hook leaves the screen
 * blank when navigator.permissions is missing (older iOS) and can't tell "blocked" from
 * "no camera" or "not https". Follows permission changes made in the browser settings.
 */
export function useCameraAccess(): { access: CameraAccess; request: () => Promise<void>; reportError: (error: unknown) => void } {
  const [access, setAccess] = useState<CameraAccess>(initialAccess);

  useEffect(() => {
    if (initialAccess() !== 'checking') return;
    let status: PermissionStatus | null = null;
    let cancelled = false;
    const apply = (state: PermissionState) =>
      // A camera re-allowed in the browser settings comes back here without a reload (Chrome).
      setAccess((prev) => (state === 'granted' ? (prev === 'in-use' || prev === 'no-camera' ? prev : 'granted') : state === 'denied' ? 'denied' : 'prompt'));
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        apply(s.state);
        s.onchange = () => apply(s.state);
      })
      .catch(() => !cancelled && setAccess('prompt')); // Firefox: "camera" is not a known permission name
    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);

  const request = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((t) => t.stop());
      setAccess('granted');
    } catch (e) {
      setAccess(cameraErrorToAccess(e));
    }
  }, []);

  const reportError = useCallback((error: unknown) => setAccess(cameraErrorToAccess(error)), []);

  return { access, request, reportError };
}

/**
 * expo-camera (web) asks for the camera when its view mounts and stops the streams it holds
 * when it unmounts, but a stream that arrives AFTER the unmount (staff leave the Door tab or
 * lock the phone while the camera is still starting) is never stopped: the camera stays on
 * until the page is reloaded. Each scanner camera is a "session"; a stream requested during a
 * session that has ended by the time it arrives is stopped at once. Streams requested outside
 * a session (the "Allow camera" prompt) are left alone.
 */
let session = 0;
let lastSession = 0;
let patched = false;

function patchGetUserMedia() {
  const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  if (patched || !media?.getUserMedia) return;
  patched = true;
  const original = media.getUserMedia.bind(media);
  media.getUserMedia = async (constraints?: MediaStreamConstraints) => {
    const owner = session;
    const stream = await original(constraints);
    if (owner !== 0 && owner !== session) stream.getTracks().forEach((t) => t.stop());
    return stream;
  };
}

/** Call with true while the scanner's camera view is mounted (layout effect: before expo-camera asks). */
export function useCameraSession(on: boolean): void {
  useLayoutEffect(() => {
    if (!on) return;
    patchGetUserMedia();
    const id = ++lastSession;
    session = id;
    return () => {
      if (session === id) session = 0;
    };
  }, [on]);
}
