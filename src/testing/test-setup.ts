// Central test setup helper to aggregate and re-export common test providers and helpers.
// This file aggregates provider factories from `test-helpers` so the language service
// recognises them as used and reduces "unused" warnings.

import provideMockTtsService, {
  provideMockSpeechService,
  provideMockValidatorService,
  provideMockTranscriptionService,
  provideMockRecorderService,
  provideMockIntentActionService
} from './test-helpers';

// Instantiate providers here so the analyzer sees the exports are in-use.
export const commonTestProviders = [
  provideMockSpeechService(),
  provideMockTtsService(),
  provideMockValidatorService(),
  provideMockTranscriptionService(),
  provideMockRecorderService(),
  provideMockIntentActionService()
];

export function applyCommonProviders(config?: { imports?: any[]; providers?: any[] }) {
  const cfg = config ?? { imports: [], providers: [] };
  cfg.providers = cfg.providers || [];
  cfg.providers.push(...commonTestProviders);
  return cfg;
}

// Re-export useful helpers directly from test-helpers to keep imports in specs simple
export { flushTerminalRegisterIfAny, createFakeAudioBlob, waitForObservable, collectObservableEmissions, FakeTimer, muteConsole } from './test-helpers';
