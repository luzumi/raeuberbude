import { Test } from '@nestjs/testing';
import { LoggingController } from 'src/modules/logging/logging.controller';
import { LoggingService } from 'src/modules/logging/logging.service';
import { LlmInstancesService } from 'src/modules/llm/llm-instances.service';
import { LlmValidationService } from 'src/modules/llm/llm-validation.service';
import { ValidateTranscriptDto } from 'src/modules/llm/dto/validate-transcript.dto';

describe('POST /api/speech/validate (Controller Unit)', () => {
  it('delegates to LlmValidationService and returns its result', async () => {
    const llmValidationMock = {
      validateTranscript: jest.fn(async (dto: ValidateTranscriptDto) => ({
        isValid: true,
        confidence: dto.confidence ?? 0.9,
        hasAmbiguity: false,
        intent: {
          intent: 'greeting',
          confidence: dto.confidence ?? 0.9,
          originalTranscript: dto.transcript,
          summary: 'Hallo',
          keywords: [],
        },
        model: 'mock-model',
      })),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [LoggingController],
      providers: [
        { provide: LoggingService, useValue: {} },
        { provide: LlmInstancesService, useValue: {} },
        { provide: LlmValidationService, useValue: llmValidationMock },
      ],
    }).compile();

    const controller = moduleRef.get(LoggingController);

    const body: ValidateTranscriptDto = {
      transcript: 'Licht im Wohnzimmer an',
      confidence: 0.95,
      context: { location: '/' },
    };

    const result = await controller.validateSpeechTranscript(body);

    expect(llmValidationMock.validateTranscript).toHaveBeenCalledTimes(1);
    expect(llmValidationMock.validateTranscript).toHaveBeenCalledWith(body);

    expect(result).toEqual(
      expect.objectContaining({
        isValid: true,
        confidence: 0.95,
        hasAmbiguity: false,
        model: 'mock-model',
      })
    );
    expect((result as any).intent).toEqual(
      expect.objectContaining({
        intent: 'greeting',
        originalTranscript: 'Licht im Wohnzimmer an',
      })
    );
  });
});

