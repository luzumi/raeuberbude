import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudeComponent } from './bude.component';

describe('BudeComponent', () => {
  let component: BudeComponent;
  let fixture: ComponentFixture<BudeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BudeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one button per device', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button.device-button');
    expect(buttons.length).toBe(component.devices.length);
  });
});
