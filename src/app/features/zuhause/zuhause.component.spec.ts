import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ZuhauseComponent } from './zuhause.component';

describe('ZuhauseComponent', () => {
  let component: ZuhauseComponent;
  let fixture: ComponentFixture<ZuhauseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZuhauseComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ZuhauseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
