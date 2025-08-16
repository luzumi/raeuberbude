import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SamsungTvMinimal } from './samsung-tv-minimal';
import { HomeAssistantService, Entity } from '@services/home-assistant/home-assistant.service';
import { of } from 'rxjs';

/**
 * Einfacher Test zur Sicherstellung, dass die Minimal-Komponente geladen wird
 * und grundlegende Aktionen ausführt.
 */
describe('SamsungTvMinimal', () => {
  let component: SamsungTvMinimal;
  let fixture: ComponentFixture<SamsungTvMinimal>;

  const mockEntities: Entity[] = [
    {
      entity_id: 'media_player.tv_samsung',
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
    callService: jasmine.createSpy('callService').and.returnValue(of({}))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamsungTvMinimal],
      providers: [
        { provide: HomeAssistantService, useValue: mockHomeAssistant }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SamsungTvMinimal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should send volume up command', () => {
    component.volumeUp();
    expect(mockHomeAssistant.callService).toHaveBeenCalled();
  });

  it('should change source', () => {
    component.changeSource('Netflix');
    expect(mockHomeAssistant.callService).toHaveBeenCalledWith(
      'media_player',
      'select_source',
      { entity_id: 'media_player.tv_samsung', source: 'Netflix' }
    );
  });
});
