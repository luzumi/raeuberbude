/**
 * HTTP Mock-Responses für Speech API
 */

export interface TranscribeSuccessResponse {
  success: boolean;
  data: {
    provider: string;
    transcript: string;
    confidence: number;
    durationMs: number;
    language?: string;
    audioDurationMs?: number;
  };
}

export interface TranscribeErrorResponse {
  success: boolean;
  error: string;
  message?: string;
}

export interface StatusResponse {
  success: boolean;
  data?: {
    providers: Record<string, boolean>;
  };
  providers?: Record<string, boolean>;
}

/**
 * Erstellt Mock-Response für erfolgreiche Transkription
 */
export function mockTranscribeResponse(options: {
  transcript: string;
  confidence?: number;
  provider?: string;
  language?: string;
  durationMs?: number;
  audioDurationMs?: number;
}): TranscribeSuccessResponse {
  return {
    success: true,
    data: {
      provider: options.provider || 'vosk',
      transcript: options.transcript,
      confidence: options.confidence ?? 0.95,
      durationMs: options.durationMs ?? 250,
      language: options.language || 'de-DE',
      audioDurationMs: options.audioDurationMs ?? 3000
    }
  };
}

/**
 * Erstellt Mock-Response für Transkriptionsfehler
 */
export function mockTranscribeError(options: {
  error?: string;
  message?: string;
}): TranscribeErrorResponse {
  return {
    success: false,
    error: options.error || 'TRANSCRIPTION_FAILED',
    message: options.message || 'Transcription failed'
  };
}

/**
 * Erstellt Mock-Response für Status-Check
 */
export function mockStatusResponse(providers: {
  vosk?: boolean;
  whisper?: boolean;
  google?: boolean;
}): StatusResponse {
  return {
    success: true,
    data: {
      providers: {
        vosk: providers.vosk ?? true,
        whisper: providers.whisper ?? false,
        google: providers.google ?? false
      }
    }
  };
}

/**
 * Vordefinierte Mock-Szenarien für häufige Fälle
 */
export const HttpMockScenarios = {
  /**
   * Erfolgreiche deutsche Transkription mit hoher Konfidenz
   */
  successHighConfidence: () => mockTranscribeResponse({
    transcript: 'Schalte das Licht im Wohnzimmer ein',
    confidence: 0.95,
    provider: 'vosk',
    language: 'de-DE'
  }),

  /**
   * Erfolgreiche Transkription mit niedriger Konfidenz
   */
  successLowConfidence: () => mockTranscribeResponse({
    transcript: 'schalte licht wohnzimmer',
    confidence: 0.65,
    provider: 'vosk',
    language: 'de-DE'
  }),

  /**
   * Mehrdeutige Transkription
   */
  successAmbiguous: () => mockTranscribeResponse({
    transcript: 'Licht an',
    confidence: 0.85,
    provider: 'vosk',
    language: 'de-DE'
  }),

  /**
   * Leeres Transkript (keine Sprache erkannt)
   */
  successEmpty: () => mockTranscribeResponse({
    transcript: '',
    confidence: 0.0,
    provider: 'vosk',
    language: 'de-DE'
  }),

  /**
   * Audio zu kurz
   */
  errorAudioTooShort: () => mockTranscribeError({
    error: 'AUDIO_TOO_SHORT',
    message: 'Audio file is too short (< 100ms)'
  }),

  /**
   * Unsupported Format
   */
  errorUnsupportedFormat: () => mockTranscribeError({
    error: 'UNSUPPORTED_FORMAT',
    message: 'Audio format not supported'
  }),

  /**
   * Backend Timeout
   */
  errorTimeout: () => mockTranscribeError({
    error: 'TIMEOUT',
    message: 'Transcription timeout'
  }),

  /**
   * Provider nicht verfügbar
   */
  errorProviderUnavailable: () => mockTranscribeError({
    error: 'PROVIDER_UNAVAILABLE',
    message: 'All transcription providers are currently unavailable'
  }),

  /**
   * Status: Alle Provider verfügbar
   */
  statusAllAvailable: () => mockStatusResponse({
    vosk: true,
    whisper: true,
    google: true
  }),

  /**
   * Status: Nur Vosk verfügbar
   */
  statusOnlyVosk: () => mockStatusResponse({
    vosk: true,
    whisper: false,
    google: false
  }),

  /**
   * Status: Keine Provider verfügbar
   */
  statusNoneAvailable: () => mockStatusResponse({
    vosk: false,
    whisper: false,
    google: false
  })
};

/**
 * Helper: Erstellt FormData-Matcher für HttpTestingController
 */
export function expectFormDataWithAudio(req: any, expectedLanguage: string = 'de-DE'): boolean {
  if (!(req.request.body instanceof FormData)) {
    return false;
  }

  const formData = req.request.body as FormData;
  const hasAudio = formData.has('audio');
  const language = formData.get('language');

  return hasAudio && language === expectedLanguage;
}

/**
 * Helper: Validiert Transcribe-Request
 */
export function validateTranscribeRequest(req: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (req.request.method !== 'POST') {
    errors.push(`Expected POST, got ${req.request.method}`);
  }

  if (!req.request.url.includes('/api/speech/transcribe')) {
    errors.push(`Expected URL to include /api/speech/transcribe, got ${req.request.url}`);
  }

  if (!(req.request.body instanceof FormData)) {
    errors.push('Expected body to be FormData');
  } else {
    const formData = req.request.body as FormData;
    if (!formData.has('audio')) {
      errors.push('FormData missing "audio" field');
    }
    if (!formData.has('language')) {
      errors.push('FormData missing "language" field');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

