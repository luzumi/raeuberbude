import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamsungTvMinimal } from './samsung-tv-minimal';

describe('SamsungTvMinimal', () => {
  let component: SamsungTvMinimal;
  let fixture: ComponentFixture<SamsungTvMinimal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamsungTvMinimal]
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
