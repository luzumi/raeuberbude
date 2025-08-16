import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrangeLight } from './orange-light';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';

describe('OrangeLight', () => {
  let component: OrangeLight;
  let fixture: ComponentFixture<OrangeLight>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrangeLight],
      providers: [
        {
          provide: HomeAssistantService,
          useValue: { entities$: of([]), callService: () => of({}) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrangeLight);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
