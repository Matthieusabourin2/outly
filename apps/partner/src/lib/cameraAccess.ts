import { useCameraPermissions } from 'expo-camera';
import { useCallback } from 'react';

/** Everything that can stand between door staff and a working camera. */
export type CameraAccess = 'checking' | 'prompt' | 'granted' | 'denied' | 'insecure' | 'unsupported' | 'no-camera' | 'in-use';

/** Native (store builds): expo-camera's own permission flow. The web version is cameraAccess.web.ts. */
export function useCameraAccess(): { access: CameraAccess; request: () => Promise<void>; reportError: (error: unknown) => void } {
  const [permission, requestPermission] = useCameraPermissions();
  const access: CameraAccess = !permission
    ? 'checking'
    : permission.granted
      ? 'granted'
      : permission.canAskAgain
        ? 'prompt'
        : 'denied';
  const request = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);
  const reportError = useCallback((_error: unknown) => undefined, []);
  return { access, request, reportError };
}

/** Web only (see cameraAccess.web.ts): native camera streams are managed by the OS. */
export function useCameraSession(_on: boolean): void {}
