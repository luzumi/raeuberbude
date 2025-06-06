import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamsungTv } from './samsung-tv';

describe('SamsungTv', () => {
  let component: SamsungTv;
  let fixture: ComponentFixture<SamsungTv>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamsungTv]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SamsungTv);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
