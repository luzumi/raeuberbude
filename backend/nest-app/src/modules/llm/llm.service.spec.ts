import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { LlmService } from './llm.service';
import { ValidateIntentDto } from './dto/validate-intent.dto';

describe('LlmService', () => {
  let service: LlmService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        LLM_URL: 'http://localhost:1234/v1/chat/completions',
        LLM_MODEL: 'mistralai/mistral-7b-instruct-v0.3',
        LLM_TIMEOUT_MS: 10000,
        LLM_ENABLED: true,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateIntent', () => {
    it('should validate a simple greeting successfully', async () => {
      const dto: ValidateIntentDto = {
        transcript: 'Hallo',
        confidence: 0.9,
      };

      const mockLLMResponse = {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  isValid: true,
                  confidence: 0.95,
                  hasAmbiguity: false,
                  clarificationNeeded: false,
                  intent: {
                    type: 'greeting',
                    summary: 'Begrüßung',
                    keywords: ['hallo'],
                  },
                }),
              },
              finish_reason: 'stop',
            },
          ],
          model: 'mistralai/mistral-7b-instruct-v0.3',
        },
      };

      mockHttpService.post.mockReturnValue(of(mockLLMResponse));

      const result = await service.validateIntent(dto);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.intent?.intent).toBe('greeting');
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.objectContaining({
          model: 'mistralai/mistral-7b-instruct-v0.3',
          messages: expect.any(Array),
          temperature: 0.3,
          max_tokens: 500,
          stream: false,
        }),
        expect.any(Object),
      );
    });

    it('should handle empty transcript', async () => {
      const dto: ValidateIntentDto = {
        transcript: '',
        confidence: 0.5,
      };

      const result = await service.validateIntent(dto);

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.clarificationNeeded).toBe(true);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should use fallback when LLM is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'LLM_ENABLED') return false;
        return defaultValue;
      });

      // Re-create service with disabled LLM
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LlmService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: HttpService,
            useValue: mockHttpService,
          },
        ],
      }).compile();

      const disabledService = module.get<LlmService>(LlmService);

      const dto: ValidateIntentDto = {
        transcript: 'Test input',
        confidence: 0.8,
      };

      const result = await disabledService.validateIntent(dto);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeLessThan(0.8); // Reduced confidence
      expect(result.hasAmbiguity).toBe(true);
      expect(result.issues).toContain('LLM nicht erreichbar - Fallback verwendet');
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should use fallback when LLM request fails', async () => {
      const dto: ValidateIntentDto = {
        transcript: 'Test',
        confidence: 0.85,
      };

      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = await service.validateIntent(dto);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeLessThan(0.85);
      expect(result.hasAmbiguity).toBe(true);
      expect(result.issues).toContain('LLM nicht erreichbar - Fallback verwendet');
    });

    it('should recognize home assistant command intent', async () => {
      const dto: ValidateIntentDto = {
        transcript: 'Schalte das Licht aus',
        confidence: 0.92,
      };

      const mockLLMResponse = {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  isValid: true,
                  confidence: 0.94,
                  hasAmbiguity: false,
                  clarificationNeeded: false,
                  intent: {
                    type: 'home_assistant_command',
                    summary: 'Licht ausschalten',
                    keywords: ['licht', 'aus'],
                    homeAssistant: {
                      action: 'turn_off',
                      entityType: 'light',
                    },
                  },
                }),
              },
              finish_reason: 'stop',
            },
          ],
        },
      };

      mockHttpService.post.mockReturnValue(of(mockLLMResponse));

      const result = await service.validateIntent(dto);

      expect(result.isValid).toBe(true);
      expect(result.intent?.intent).toBe('home_assistant_command');
      expect(result.intent?.homeAssistant).toBeDefined();
      expect(result.intent?.homeAssistant?.action).toBe('turn_off');
      expect(result.intent?.homeAssistant?.entityType).toBe('light');
    });
  });

  describe('checkHealth', () => {
    it('should return available when LLM is reachable', async () => {
      mockHttpService.get.mockReturnValue(
        of({ status: 200, data: { data: [] } }),
      );

      const result = await service.checkHealth();

      expect(result.available).toBe(true);
      expect(result.url).toBe('http://localhost:1234/v1/chat/completions');
      expect(result.model).toBe('mistralai/mistral-7b-instruct-v0.3');
    });

    it('should return unavailable when LLM is not reachable', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Connection error')),
      );

      const result = await service.checkHealth();

      expect(result.available).toBe(false);
    });

    it('should return unavailable when LLM is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'LLM_ENABLED') return false;
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LlmService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: HttpService,
            useValue: mockHttpService,
          },
        ],
      }).compile();

      const disabledService = module.get<LlmService>(LlmService);

      const result = await disabledService.checkHealth();

      expect(result.available).toBe(false);
    });
  });
});
