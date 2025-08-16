import { TestBed } from '@angular/core/testing';
import { SamsungTvMinimal } from './samsung-tv-minimal';

// Basic creation test for the minimal Samsung TV component
describe('SamsungTvMinimal', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamsungTvMinimal]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SamsungTvMinimal);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
