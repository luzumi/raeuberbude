import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, BehaviorSubject } from 'rxjs';

import { HeaderComponent } from './header.component';
import { SpeechService } from '../../../core/services/speech.service';
import { TerminalService } from '../../../core/services/terminal.service';

describe('Header', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  const mockSpeechService = {
    isRecording$: new BehaviorSubject<boolean>(false),
    lastInput$: of(''),
    setValidationEnabled: jasmine.createSpy('setValidationEnabled'),
    setTTSEnabled: jasmine.createSpy('setTTSEnabled'),
    startRecording: jasmine.createSpy('startRecording').and.returnValue(Promise.resolve()),
    stopRecording: jasmine.createSpy('stopRecording').and.returnValue(Promise.resolve()),
    abortCurrentOperation: jasmine.createSpy('abortCurrentOperation')
  } as unknown as SpeechService;

  const mockTerminalService = {
    getMyTerminal: jasmine.createSpy('getMyTerminal').and.returnValue(Promise.resolve({ success: true, data: { terminalId: 'test-terminal' } }))
  } as unknown as TerminalService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, RouterTestingModule],
      providers: [
        { provide: SpeechService, useValue: mockSpeechService },
        { provide: TerminalService, useValue: mockTerminalService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
