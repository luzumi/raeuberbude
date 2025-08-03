import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiretvComponent } from 'src/app/features/control/devices/features/control/devices/firetv/fire-tv-component'; // path adjusted after moving tests


describe('FiretvComponent', () => {
  let component: FiretvComponent;
  let fixture: ComponentFixture<FiretvComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiretvComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FiretvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
