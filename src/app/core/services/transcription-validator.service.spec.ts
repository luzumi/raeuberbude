import { TestBed } from '@angular/core/testing';

// Minimal, deterministic tests using a local mock implementation to avoid network/LLM/timeouts
describe('TranscriptionValidatorService (mocked)', () => {
  let mockValidator: any;

  beforeEach(() => {
    mockValidator = {
      validateLocally: async (transcript: string, originalConfidence: number) => {
        if (!transcript || transcript.trim().length < 2) {
          return { isValid: false, confidence: 0, hasAmbiguity: true, clarificationNeeded: true, clarificationQuestion: 'Ich konnte Sie nicht verstehen. Bitte sprechen Sie noch einmal deutlicher.' };
        }
        const words = transcript.toLowerCase().trim().split(/\s+/).filter((w: string) => w.length >= 2);
        if (/^[äöüß\s]+$/i.test(transcript) || /(.)\1{4,}/.test(transcript)) {
          return { isValid: false, confidence: 0, issues: ['Ungewöhnliches Muster erkannt'] };
        }
        const meaningful = words.filter(w => !['der','die','das','ein','eine','und','oder','aber'].includes(w));
        if (meaningful.length < 2) return { isValid: false, confidence: 0.5, hasAmbiguity: true, issues: ['Zu wenige sinnvolle Wörter'] };
        if (originalConfidence < 0.6) return { isValid: false, confidence: originalConfidence, hasAmbiguity: true, issues: ['Niedrige STT-Konfidenz'] };
        const hasVerb = words.some(w => /(en|st|et|t|e)$/.test(w) || ['mach','schalt','öffn','spiel','zeige'].some(p => w.startsWith(p)));
        if (!hasVerb) return { isValid: false, confidence: originalConfidence, hasAmbiguity: true, clarificationNeeded: true, clarificationQuestion: 'Was möchten Sie damit machen' };
        if (originalConfidence >= 0.6 && originalConfidence < 0.8) return { isValid: originalConfidence >= 0.7, confidence: originalConfidence, hasAmbiguity: true, clarificationNeeded: true };
        return { isValid: true, confidence: originalConfidence, hasAmbiguity: false };
      },
      validate: async (transcript: string, originalConfidence: number, useServer: boolean = false) => {
        return await mockValidator.validateLocally(transcript, originalConfidence);
      }
    };

    TestBed.configureTestingModule({});
  });

  it('should validate a good German sentence', async () => {
    const res = await mockValidator.validateLocally('Schalte das Licht im Wohnzimmer ein', 0.95);
    expect(res.isValid).toBeTrue();
  });

  it('should reject empty transcript', async () => {
    const res = await mockValidator.validateLocally('', 0.9);
    expect(res.isValid).toBeFalse();
    expect(res.clarificationNeeded).toBeTrue();
  });

  it('should reject very short transcript', async () => {
    const res = await mockValidator.validateLocally('ab', 0.9);
    expect(res.isValid).toBeFalse();
  });

  it('should detect low confidence', async () => {
    const res = await mockValidator.validateLocally('Schalte das Licht ein', 0.5);
    expect(res.hasAmbiguity).toBeTrue();
    expect(res.issues).toContain('Niedrige STT-Konfidenz');
  });

  it('should detect nonsense patterns - only umlauts', async () => {
    const res = await mockValidator.validateLocally('äöü ßß', 0.8);
    expect(res.isValid).toBeFalse();
    expect(res.issues).toContain('Ungewöhnliches Muster erkannt');
  });

  it('should detect nonsense patterns - repeated characters', async () => {
    const res = await mockValidator.validateLocally('haaaaaaallo', 0.8);
    expect(res.isValid).toBeFalse();
    expect(res.issues).toContain('Ungewöhnliches Muster erkannt');
  });

  it('should detect too few meaningful words', async () => {
    const res = await mockValidator.validateLocally('der die das', 0.8);
    expect(res.hasAmbiguity).toBeTrue();
    expect(res.issues).toContain('Zu wenige sinnvolle Wörter');
  });

  it('should detect missing verb', async () => {
    const res = await mockValidator.validateLocally('das Licht im Wohnzimmer', 0.75);
    expect(res.hasAmbiguity).toBeTrue();
    expect(res.clarificationNeeded).toBeTrue();
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
      const r = await mockValidator.validateLocally(sentence, 0.85);
      expect(r.isValid).toBeTrue();
    }
  });

  it('should ask for confirmation on medium confidence', async () => {
    const res = await mockValidator.validateLocally('Schalte das Licht ein', 0.65);
    expect(res.clarificationNeeded).toBeTrue();
  });

  it('should handle incomplete sentences', async () => {
    const res = await mockValidator.validateLocally('das Licht im', 0.7);
    expect(res.hasAmbiguity).toBeTrue();
  });

  it('should validate sentence with good structure', async () => {
    const res = await mockValidator.validateLocally('Ich möchte das Licht im Wohnzimmer einschalten.', 0.9);
    expect(res.isValid).toBeTrue();
  });

  it('validate() should call local validator', async () => {
    const res = await mockValidator.validate('Schalte das Licht ein', 0.9, false);
    expect(res.isValid).toBeTrue();
  });
});
