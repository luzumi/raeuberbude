import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Laptop } from './laptop';

describe('Laptop', () => {
  let component: Laptop;
  let fixture: ComponentFixture<Laptop>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Laptop]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Laptop);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
