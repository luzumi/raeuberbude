import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrangeLight } from './orange-light';

describe('OrangeLight', () => {
  let component: OrangeLight;
  let fixture: ComponentFixture<OrangeLight>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrangeLight]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrangeLight);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
