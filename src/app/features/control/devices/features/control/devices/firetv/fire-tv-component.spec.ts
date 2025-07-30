import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiretvComponent } from './fire-tv-component';


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
