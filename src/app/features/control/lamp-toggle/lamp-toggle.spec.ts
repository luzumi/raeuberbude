import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LampToggleComponent } from './lamp-toggle';

describe('LampToggle', () => {
  let component: LampToggleComponent;
  let fixture: ComponentFixture<LampToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LampToggleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LampToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
