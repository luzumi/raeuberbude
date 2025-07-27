import { TestBed } from '@angular/core/testing';
import { RoomMenuComponent } from './room-menu';
import { HomeAssistantWs } from '../../../core/home-assistant-ws';

describe('RoomMenuComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomMenuComponent],
      providers: [HomeAssistantWs]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(RoomMenuComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
