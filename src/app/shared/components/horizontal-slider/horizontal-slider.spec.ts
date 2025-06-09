import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorizontalSlider } from './horizontal-slider';

describe('HorizontalSlider', () => {
  let component: HorizontalSlider;
  let fixture: ComponentFixture<HorizontalSlider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorizontalSlider]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HorizontalSlider);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
