import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '@services/auth.service';
import { ConfigService } from '@services/config-service';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        AppComponent,
      ],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            load: jasmine.createSpy('load').and.returnValue(Promise.resolve()),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render a router-outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should have AuthService injected and accessible', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const auth = TestBed.inject(AuthService);
    expect(app.auth).toBe(auth);
    // By default, without a token in localStorage, user is not logged in
    expect(auth.isLoggedIn()).toBeFalse();
  });
});
