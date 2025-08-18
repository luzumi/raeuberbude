import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SamsungTvMinimal } from './samsung-tv-minimal';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';

describe('SamsungTvMinimal', () => {
  let component: SamsungTvMinimal;
  let fixture: ComponentFixture<SamsungTvMinimal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamsungTvMinimal],
      providers: [
        {
          provide: HomeAssistantService,
          useValue: { entities$: of([]), callService: () => of(null) }
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
