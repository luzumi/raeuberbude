import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyPadComponent } from 'src/app/shared/components/key-pad-component/key-pad.component'; // path adjusted after moving tests

describe('KeyPadComponent', () => {
  let component: KeyPadComponent;
  let fixture: ComponentFixture<KeyPadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyPadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KeyPadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
