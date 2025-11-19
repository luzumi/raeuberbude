import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { SamsungTvMinimal } from './samsung-tv-minimal';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';

describe('SamsungTvMinimal', () => {
  let component: SamsungTvMinimal;
  let fixture: ComponentFixture<SamsungTvMinimal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamsungTvMinimal, HttpClientTestingModule],
      providers: [
        {
          provide: HomeAssistantService,
          useValue: { entities$: of([]), callService: () => of(null), listFireTvCommands: jasmine.createSpy('listFireTvCommands').and.returnValue(of([])) }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SamsungTvMinimal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
