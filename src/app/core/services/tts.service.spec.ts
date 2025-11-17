import { TestBed } from '@angular/core/testing';
import { TtsService } from './tts.service';

describe('TtsService', () => {
  let service: TtsService;
  let mockSynthesis: any;

  beforeEach(() => {
    // Mock speechSynthesis API
    mockSynthesis = {
      speak: jasmine.createSpy('speak'),
      cancel: jasmine.createSpy('cancel'),
      pause: jasmine.createSpy('pause'),
      resume: jasmine.createSpy('resume'),
      speaking: false,
      paused: false,
      getVoices: jasmine.createSpy('getVoices').and.returnValue([
        { name: 'German Voice', lang: 'de-DE' }
      ])
    };

    (globalThis as any).speechSynthesis = mockSynthesis;

    TestBed.configureTestingModule({
      providers: [TtsService]
    });
    service = TestBed.inject(TtsService);
  });

  afterEach(() => {
    delete (globalThis as any).speechSynthesis;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check if TTS is available', () => {
    expect(service.isAvailable()).toBe(true);
  });

  it('should cancel speech', () => {
    mockSynthesis.speaking = true;
    service.cancel();
    expect(mockSynthesis.cancel).toHaveBeenCalled();
  });

  it('should pause speech when speaking', () => {
    mockSynthesis.speaking = true;
    mockSynthesis.paused = false;
    service.pause();
    expect(mockSynthesis.pause).toHaveBeenCalled();
  });

  it('should resume paused speech', () => {
    mockSynthesis.paused = true;
    service.resume();
    expect(mockSynthesis.resume).toHaveBeenCalled();
  });

  it('should get available voices', () => {
    const voices = service.getVoices();
    expect(voices.length).toBeGreaterThan(0);
  });

  it('should not speak empty text', async () => {
    await service.speak('');
    expect(mockSynthesis.speak).not.toHaveBeenCalled();
  });
});

