import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Creator } from 'src/app/features/control/devices/features/control/devices/creator/creator'; // path adjusted after moving tests

describe('Creator', () => {
  let component: Creator;
  let fixture: ComponentFixture<Creator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Creator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Creator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
