import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pixel } from 'src/app/features/control/devices/features/control/devices/pixel/pixel'; // path adjusted after moving tests

describe('Pixel', () => {
  let component: Pixel;
  let fixture: ComponentFixture<Pixel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pixel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pixel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
