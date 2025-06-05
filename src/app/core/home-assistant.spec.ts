import { TestBed } from '@angular/core/testing';
import { HomeAssistant } from './home-assistant';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';

describe('HomeAssistantService', () => {
  let service: HomeAssistant;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HomeAssistant,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(HomeAssistant);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should retrieve entity state via GET', () => {
    const dummyResponse = { entity_id: 'light.xyz', state: 'on' };
    const id = 'light.test_device';

    service.getState(id).subscribe(res => {
      expect(res).toEqual(dummyResponse);
    });

    const req = httpMock.expectOne(`/api/states/${id}`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toContain('Bearer');
    req.flush(dummyResponse);
  });

  it('should call service via POST', () => {
    const domain = 'light';
    const action = 'turn_off';
    const id = 'light.test_device';

    service.callService(domain, action, id).subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(`/api/services/${domain}/${action}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ entity_id: id });
    expect(req.request.headers.get('Authorization')).toContain('Bearer');
    req.flush({ result: 'ok' });
  });
});
