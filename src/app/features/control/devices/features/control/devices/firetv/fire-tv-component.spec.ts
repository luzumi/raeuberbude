import { ComponentFixture, TestBed } from '@angular/core/testing';
import {Firetv} from './fire-tv-component';


describe('Firetv', () => {
  let component: Firetv;
  let fixture: ComponentFixture<Firetv>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Firetv]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Firetv);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
