import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SamsungTv } from './samsung-tv';
import { HomeAssistantService, Entity } from '../../../../../../../services/home-assistant/home-assistant.service';
import { of } from 'rxjs';

describe('SamsungTv', () => {
  let component: SamsungTv;
  let fixture: ComponentFixture<SamsungTv>;

  const mockEntities: Entity[] = [
    {
      entity_id: 'media_player.samsung',
      state: 'on',
      attributes: {
        source: 'HDMI1',
        source_list: ['HDMI1', 'Netflix'],
        volume_level: 0.35,
        friendly_name: 'Samsung TV'
      }
    }
  ];

  const mockHomeAssistant = {
    entities$: of(mockEntities),
    callService: jasmine.createSpy('callService')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamsungTv],
      providers: [
        { provide: HomeAssistantService, useValue: mockHomeAssistant }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SamsungTv);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load Samsung TV entity', () => {
    expect(component.samsung?.entity_id).toBe('media_player.samsung');
    expect(component.samsung?.attributes.source).toBe('HDMI1');
  });

  it('should call togglePower() with correct service', () => {
    component.togglePower();
    expect(mockHomeAssistant.callService).toHaveBeenCalledWith(
      'media_player',
      'turn_off',
      'media_player.samsung'
    );
  });

  it('should call setVolume() with correct payload', () => {
    component.setVolume(50);
    expect(mockHomeAssistant.callService).toHaveBeenCalledWith(
      'media_player',
      'volume_set',
      { entity_id: 'media_player.samsung', volume_level: 0.5 }
    );
  });

  it('should call selectSource() with correct payload', () => {
    component.selectSource('Netflix');
    expect(mockHomeAssistant.callService).toHaveBeenCalledWith(
      'media_player',
      'select_source',
      { entity_id: 'media_player.samsung', source: 'Netflix' }
    );
  });
});
