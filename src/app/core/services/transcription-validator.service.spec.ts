import { TestBed } from '@angular/core/testing';
import { TranscriptionValidatorService, ValidationResult } from './transcription-validator.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TranscriptionValidatorService', () => {
  let service: TranscriptionValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TranscriptionValidatorService]
    });
    service = TestBed.inject(TranscriptionValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateLocally', () => {
    it('should validate a good German sentence', async () => {
      const result = await service.validateLocally(
        'Schalte das Licht im Wohnzimmer ein',
        0.95
      );

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.clarificationNeeded).toBe(false);
    });

    it('should reject empty transcript', async () => {
      const result = await service.validateLocally('', 0.9);

      expect(result.isValid).toBe(false);
      expect(result.clarificationNeeded).toBe(true);
      expect(result.clarificationQuestion).toContain('nicht verstehen');
    });

    it('should reject very short transcript', async () => {
      const result = await service.validateLocally('ab', 0.9);

      expect(result.isValid).toBe(false);
      expect(result.clarificationNeeded).toBe(true);
    });

    it('should detect low confidence', async () => {
      const result = await service.validateLocally(
        'Schalte das Licht ein',
        0.5
      );

      expect(result.hasAmbiguity).toBe(true);
      expect(result.issues).toContain('Niedrige STT-Konfidenz');
    });

    it('should detect nonsense patterns - only umlauts', async () => {
      const result = await service.validateLocally('äöü ßß', 0.8);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Ungewöhnliches Muster erkannt');
    });

    it('should detect nonsense patterns - repeated characters', async () => {
      const result = await service.validateLocally('haaaaaaallo', 0.8);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Ungewöhnliches Muster erkannt');
    });

    it('should detect too few meaningful words', async () => {
      const result = await service.validateLocally('der die das', 0.8);

      expect(result.hasAmbiguity).toBe(true);
      expect(result.issues).toContain('Zu wenige sinnvolle Wörter');
    });

    it('should detect missing verb', async () => {
      const result = await service.validateLocally(
        'das Licht im Wohnzimmer',
        0.75
      );

      expect(result.hasAmbiguity).toBe(true);
      expect(result.clarificationNeeded).toBe(true);
      expect(result.clarificationQuestion).toContain('Was möchten Sie damit machen');
    });

    it('should recognize common German verbs', async () => {
      const verbs = [
        'Mache das Licht an',
        'Schalte den Fernseher ein',
        'Öffne die Tür',
        'Zeige mir das Wetter',
        'Spiele Musik ab'
      ];

      for (const sentence of verbs) {
        const result = await service.validateLocally(sentence, 0.85);
        expect(result.isValid).toBe(true, `Failed for: ${sentence}`);
      }
    });

    it('should ask for confirmation on medium confidence', async () => {
      const result = await service.validateLocally(
        'Schalte das Licht ein',
        0.65
      );

      expect(result.clarificationNeeded).toBe(true);
      expect(result.clarificationQuestion).toContain('richtig verstanden');
    });

    it('should handle incomplete sentences', async () => {
      const result = await service.validateLocally(
        'das Licht im',
        0.7
      );

      expect(result.hasAmbiguity).toBe(true);
      expect(result.issues).toContain('Möglicherweise unvollständiger Satz');
    });

    it('should validate sentence with good structure', async () => {
      const result = await service.validateLocally(
        'Ich möchte das Licht im Wohnzimmer einschalten.',
        0.9
      );

      expect(result.isValid).toBe(true);
      expect(result.hasAmbiguity).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return local validation for high confidence valid input', async () => {
      const result = await service.validate(
        'Schalte das Licht ein',
        0.9,
        false
      );

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.85);
    });

    it('should include context in validation', async () => {
      const result = await service.validate(
        'Schalte das Licht ein',
        0.75,
        false,
        {
          location: '/dashboard',
          userId: 'test-user'
        }
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('getSuggestions', () => {
    it('should provide suggestions for homophones', () => {
      const suggestions1 = service.getSuggestions('Ich will meer haben');
      expect(suggestions1).toContain('mehr');

      const suggestions2 = service.getSuggestions('auf der seite');
      expect(suggestions2.length).toBeGreaterThan(0);
    });

    it('should return empty array for good text', () => {
      const suggestions = service.getSuggestions('Schalte das Licht ein');
      expect(suggestions).toEqual([]);
    });
  });
});

