import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pixel } from './pixel';

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
