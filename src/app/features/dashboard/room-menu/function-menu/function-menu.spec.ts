import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FunctionMenu } from './function-menu';

describe('FunctionMenu', () => {
  let component: FunctionMenu;
  let fixture: ComponentFixture<FunctionMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FunctionMenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FunctionMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
