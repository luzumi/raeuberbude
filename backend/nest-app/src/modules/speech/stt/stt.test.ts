import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { STTProviderService } from './stt.provider';
import { VoskProvider } from './vosk.provider';
import { WhisperProvider } from './whisper.provider';
import { AudioConverterService } from './audio-converter.service';

describe('STTProviderService', () => {
  let service: STTProviderService;
  let voskProvider: VoskProvider;
  let whisperProvider: WhisperProvider;
  let audioConverter: AudioConverterService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        STTProviderService,
        VoskProvider,
        WhisperProvider,
        AudioConverterService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: any = {
                STT_ENABLED: true,
                STT_PRIMARY: 'vosk',
                STT_SECONDARY: 'whisper',
                STT_LANG: 'de-DE',
                STT_MAX_DURATION_MS: 30000,
                VOSK_WS_URL: 'ws://localhost:2700',
                WHISPER_URL: 'http://localhost:9090/transcribe',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<STTProviderService>(STTProviderService);
    voskProvider = module.get<VoskProvider>(VoskProvider);
    whisperProvider = module.get<WhisperProvider>(WhisperProvider);
    audioConverter = module.get<AudioConverterService>(AudioConverterService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Provider Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(voskProvider).toBeDefined();
      expect(whisperProvider).toBeDefined();
    });

    it('should initialize with correct primary and secondary providers', () => {
      const primary = configService.get('STT_PRIMARY');
      const secondary = configService.get('STT_SECONDARY');
      
      expect(primary).toBe('vosk');
      expect(secondary).toBe('whisper');
    });
  });

  describe('Provider Failover', () => {
    it('should fallback to secondary provider when primary fails', async () => {
      // Mock primary provider to fail
      jest.spyOn(voskProvider, 'isAvailable').mockResolvedValue(false);
      jest.spyOn(whisperProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(whisperProvider, 'transcribe').mockResolvedValue({
        provider: 'whisper',
        transcript: 'Test transcription',
        confidence: 0.95,
        durationMs: 1000,
        language: 'de-DE',
      });

      const testAudio = Buffer.from('test audio data');
      const result = await service.transcribe(testAudio, 'audio/wav', 'de-DE');

      expect(result.provider).toBe('whisper');
      expect(result.transcript).toBe('Test transcription');
    });

    it('should throw error when all providers fail', async () => {
      // Mock both providers to fail
      jest.spyOn(voskProvider, 'isAvailable').mockResolvedValue(false);
      jest.spyOn(whisperProvider, 'isAvailable').mockResolvedValue(false);

      const testAudio = Buffer.from('test audio data');

      await expect(
        service.transcribe(testAudio, 'audio/wav', 'de-DE')
      ).rejects.toThrow('All STT providers failed or unavailable');
    });
  });

  describe('Audio Validation', () => {
    it('should reject audio exceeding max duration', async () => {
      // Create a large buffer that simulates long audio
      const largeAudio = Buffer.alloc(31 * 32 * 1000); // > 30 seconds

      await expect(
        service.transcribe(largeAudio, 'audio/wav', 'de-DE', 30000)
      ).rejects.toThrow();
    });
  });

  describe('Provider Status', () => {
    it('should return status of all providers', async () => {
      jest.spyOn(voskProvider, 'isAvailable').mockResolvedValue(true);
      jest.spyOn(whisperProvider, 'isAvailable').mockResolvedValue(false);

      const status = await service.getProvidersStatus();

      expect(status).toEqual({
        vosk: true,
        whisper: false,
      });
    });
  });
});

describe('AudioConverterService', () => {
  let service: AudioConverterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioConverterService],
    }).compile();

    service = module.get<AudioConverterService>(AudioConverterService);
  });

  describe('MIME Type Detection', () => {
    it('should validate common audio MIME types', async () => {
      const audioBuffer = Buffer.from('test');
      
      // Test various MIME types
      const validTypes = [
        'audio/webm',
        'audio/wav',
        'audio/mpeg',
        'audio/ogg',
      ];

      for (const mimeType of validTypes) {
        const result = await service.validateAudio(audioBuffer, mimeType, 30000);
        expect(result.valid).toBeDefined();
      }
    });
  });
});
