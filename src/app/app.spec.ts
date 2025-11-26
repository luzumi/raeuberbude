import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '@services/auth.service';
import { ConfigService } from '@services/config-service';
import { HttpClientTestingModule,  } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        AppComponent,
      ],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            load: jasmine.createSpy('load').and.returnValue(Promise.resolve()),
          },
        },
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => false,
            getToken: () => null
          }
        },
        {
          provide: HttpClient,
          useValue: {
            get: () => ({ toPromise: () => Promise.resolve(null) }),
            post: () => ({ toPromise: () => Promise.resolve(null) })
          }
        }
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
