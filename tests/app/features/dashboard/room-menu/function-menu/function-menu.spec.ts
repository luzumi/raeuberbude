import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FunctionMenuComponent } from 'src/app/features/dashboard/room-menu/function-menu/function-menu'; // path adjusted after moving tests

describe('FunctionMenuComponent', () => {
  let component: FunctionMenuComponent;
  let fixture: ComponentFixture<FunctionMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FunctionMenuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FunctionMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
