import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { FiretvComponent } from './fire-tv-component';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';


describe('FiretvComponent', () => {
  let component: FiretvComponent;
  let fixture: ComponentFixture<FiretvComponent>;

  // Minimaler Stub für HomeAssistantService
  class HassStub {
    entities$ = of([]);
    getStatesWs() { return of([]); }
    callService() { return of({}); }
    listFireTvCommands() { return of([]); }
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiretvComponent, HttpClientTestingModule],
      providers: [{ provide: HomeAssistantService, useClass: HassStub }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FiretvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
