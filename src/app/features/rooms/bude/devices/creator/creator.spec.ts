import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { Creator } from './creator';

describe('Creator', () => {
  let component: Creator;
  let fixture: ComponentFixture<Creator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Creator, HttpClientTestingModule]
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
