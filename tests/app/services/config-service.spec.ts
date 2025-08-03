import { TestBed } from '@angular/core/testing';

import { ConfigService } from 'src/app/services/config-service'; // path adjusted after moving tests

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
