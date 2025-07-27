import { TestBed } from '@angular/core/testing';
import { HomeAssistantWs } from './home-assistant-ws';

describe('HomeAssistantWs', () => {
  it('should be created', () => {
    const service = TestBed.inject(HomeAssistantWs);
    expect(service).toBeTruthy();
  });
});
