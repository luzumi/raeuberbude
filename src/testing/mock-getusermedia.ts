/**
 * Mock für navigator.mediaDevices.getUserMedia
 * Simuliert verschiedene Szenarien (Success, Permission Denied, No Device, etc.)
 */

import { createMockMediaStream } from './mock-media-recorder';

export interface GetUserMediaMockOptions {
  success?: boolean;
  errorName?: 'NotAllowedError' | 'NotFoundError' | 'NotReadableError' | 'OverconstrainedError' | 'TypeError' | 'AbortError';
  errorMessage?: string;
  stream?: MediaStream;
  delay?: number;
}

/**
 * Installiert Mock für getUserMedia im globalen navigator-Objekt
 *
 * @param success - Erfolg oder Fehler simulieren
 * @param errorName - DOMException Name bei Fehler
 * @param errorMessage - Custom Error Message
 * @param stream - Optional custom MediaStream
 * @param delay - Verzögerung in ms (simuliert langsame Permission-Prompts)
 */
export function mockGetUserMedia(
  success: boolean = true,
  errorName?: string,
  errorMessage?: string,
  stream?: MediaStream,
  delay: number = 0
): void {
  const mockStream = stream || createMockMediaStream();

  const getUserMediaMock = jasmine.createSpy('getUserMedia').and.callFake(
    (constraints: MediaStreamConstraints) => {
      return new Promise<MediaStream>((resolve, reject) => {
        setTimeout(() => {
          if (success) {
            resolve(mockStream);
          } else {
            const error = new DOMException(
              errorMessage || `${errorName || 'UnknownError'}: getUserMedia failed`,
              errorName || 'UnknownError'
            );
            reject(error);
          }
        }, delay);
      });
    }
  );

  // Mock navigator.mediaDevices wenn nicht vorhanden
  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {},
      writable: true,
      configurable: true
    });
  }

  Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
    value: getUserMediaMock,
    writable: true,
    configurable: true
  });
}

/**
 * Entfernt getUserMedia Mock
 */
export function unmockGetUserMedia(): void {
  // Restore original falls vorhanden
  if (navigator.mediaDevices) {
    delete (navigator.mediaDevices as any).getUserMedia;
  }
}

/**
 * Vordefinierte Mock-Szenarien
 */
export const GetUserMediaScenarios = {
  /**
   * Erfolgreiche Mikrofonfreigabe
   */
  success: () => mockGetUserMedia(true),

  /**
   * User verweigert Mikrofonzugriff
   */
  permissionDenied: () =>
    mockGetUserMedia(false, 'NotAllowedError', 'Permission denied by user'),

  /**
   * Kein Mikrofon gefunden
   */
  noDevice: () =>
    mockGetUserMedia(false, 'NotFoundError', 'No audio input device found'),

  /**
   * Mikrofon wird bereits verwendet
   */
  deviceInUse: () =>
    mockGetUserMedia(false, 'NotReadableError', 'Device is already in use'),

  /**
   * Constraints nicht erfüllbar
   */
  overConstrained: () =>
    mockGetUserMedia(false, 'OverconstrainedError', 'Constraints could not be satisfied'),

  /**
   * Langsame Permission (simuliert User-Interaktion)
   */
  slowPermission: (delayMs: number = 2000) =>
    mockGetUserMedia(true, undefined, undefined, undefined, delayMs),

  /**
   * getUserMedia nicht unterstützt (alter Browser)
   */
  notSupported: () => {
    if (navigator.mediaDevices) {
      delete (navigator.mediaDevices as any).getUserMedia;
    }
  }
};

/**
 * Erstellt einen Mock MediaStream mit konfigurierbaren Tracks
 */
export { createMockMediaStream } from './mock-media-recorder';

/**
 * Helper: Check ob getUserMedia gemockt ist
 */
export function isGetUserMediaMocked(): boolean {
  return !!(navigator.mediaDevices?.getUserMedia as any)?.and?.callFake;
}

