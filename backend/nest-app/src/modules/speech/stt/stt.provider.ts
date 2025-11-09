import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoskProvider } from './vosk.provider';
import { WhisperProvider } from './whisper.provider';

export interface TranscriptionResult {
  provider: string;
  transcript: string;
  confidence: number;
  durationMs: number;
  language?: string;
  error?: string;
}

export interface STTProvider {
  name: string;
  transcribe(audioBuffer: Buffer, mimeType: string, language?: string): Promise<TranscriptionResult>;
  isAvailable(): Promise<boolean>;
}

@Injectable()
export class STTProviderService {
  private readonly logger = new Logger(STTProviderService.name);
  private providers: Map<string, STTProvider> = new Map();
  private primaryProvider: string;
  private secondaryProvider: string;
  private enabled: boolean;

  constructor(
    private configService: ConfigService,
    private voskProvider: VoskProvider,
    private whisperProvider: WhisperProvider,
  ) {
    this.initializeProviders();
  }

  private initializeProviders() {
    this.enabled = this.configService.get<boolean>('STT_ENABLED', true);
    this.primaryProvider = this.configService.get<string>('STT_PRIMARY', 'vosk');
    this.secondaryProvider = this.configService.get<string>('STT_SECONDARY', 'whisper');

    if (!this.enabled) {
      this.logger.warn('STT is disabled via configuration');
      return;
    }

    // Register available providers
    this.providers.set('vosk', this.voskProvider);
    this.providers.set('whisper', this.whisperProvider);

    this.logger.log(`STT initialized - Primary: ${this.primaryProvider}, Secondary: ${this.secondaryProvider}`);
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    language?: string,
    maxDurationMs?: number,
  ): Promise<TranscriptionResult> {
    if (!this.enabled) {
      throw new Error('STT is disabled');
    }

    const startTime = Date.now();
    const configuredLanguage = language || this.configService.get<string>('STT_LANG', 'de-DE');
    const maxDuration = maxDurationMs || this.configService.get<number>('STT_MAX_DURATION_MS', 30000);

    // Try primary provider first
    const primary = this.providers.get(this.primaryProvider);
    if (primary) {
      try {
        const isAvailable = await Promise.race([
          primary.isAvailable(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000))
        ]);

        if (isAvailable) {
          this.logger.debug(`Attempting transcription with primary provider: ${this.primaryProvider}`);
          const result = await Promise.race([
            primary.transcribe(audioBuffer, mimeType, configuredLanguage),
            new Promise<TranscriptionResult>((_, reject) => 
              setTimeout(() => reject(new Error('Primary provider timeout')), maxDuration)
            )
          ]);
          
          result.durationMs = Date.now() - startTime;
          this.logger.log(`Transcription successful with ${result.provider} in ${result.durationMs}ms`);
          return result;
        }
      } catch (error) {
        this.logger.warn(`Primary provider ${this.primaryProvider} failed: ${error.message}`);
      }
    }

    // Try secondary provider if primary failed
    if (this.secondaryProvider && this.secondaryProvider !== 'none') {
      const secondary = this.providers.get(this.secondaryProvider);
      if (secondary) {
        try {
          const isAvailable = await Promise.race([
            secondary.isAvailable(),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000))
          ]);

          if (isAvailable) {
            this.logger.debug(`Falling back to secondary provider: ${this.secondaryProvider}`);
            const result = await Promise.race([
              secondary.transcribe(audioBuffer, mimeType, configuredLanguage),
              new Promise<TranscriptionResult>((_, reject) => 
                setTimeout(() => reject(new Error('Secondary provider timeout')), maxDuration)
              )
            ]);
            
            result.durationMs = Date.now() - startTime;
            this.logger.log(`Transcription successful with ${result.provider} in ${result.durationMs}ms`);
            return result;
          }
        } catch (error) {
          this.logger.error(`Secondary provider ${this.secondaryProvider} failed: ${error.message}`);
        }
      }
    }

    // Both providers failed
    throw new Error('All STT providers failed or unavailable');
  }

  async getProvidersStatus(): Promise<{ [key: string]: boolean }> {
    const status: { [key: string]: boolean } = {};
    
    for (const [name, provider] of this.providers) {
      try {
        status[name] = await Promise.race([
          provider.isAvailable(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000))
        ]);
      } catch {
        status[name] = false;
      }
    }
    
    return status;
  }
}
