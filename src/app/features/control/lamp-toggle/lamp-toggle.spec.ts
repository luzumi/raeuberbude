import { TestBed } from '@angular/core/testing';
import { LampToggleComponent } from './lamp-toggle';
import { HomeAssistant } from '../../../core/home-assistant';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {provideHttpClient} from '@angular/common/http';

describe('LampToggleComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LampToggleComponent],
      providers: [
        provideHttpClient(),           // ← neu! wichtig für Injection-Token
        provideHttpClientTesting(),   // ← ersetzt Transport intern
        HomeAssistant
      ]

    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LampToggleComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
