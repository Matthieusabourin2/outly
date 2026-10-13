/** Native camera builds decode QR codes themselves: nothing to load. See qrReader.web.ts. */
export function prepareQrReader(): Promise<boolean> {
  return Promise.resolve(true);
}
