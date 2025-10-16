import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrangeLightMinimal } from './orange-light-minimal';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { BehaviorSubject } from 'rxjs';

describe('OrangeLightMinimal', () => {
  let component: OrangeLightMinimal;
  let fixture: ComponentFixture<OrangeLightMinimal>;
  let mockHomeAssistantService: jasmine.SpyObj<HomeAssistantService>;
  let entitiesSubject: BehaviorSubject<any[]>;

  beforeEach(async () => {
    // Mock HomeAssistantService mit BehaviorSubject
    entitiesSubject = new BehaviorSubject([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'off' }
    ]);
    
    mockHomeAssistantService = jasmine.createSpyObj('HomeAssistantService', [], {
      entities$: entitiesSubject.asObservable()
    });

    await TestBed.configureTestingModule({
      imports: [OrangeLightMinimal],
      providers: [
        { provide: HomeAssistantService, useValue: mockHomeAssistantService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrangeLightMinimal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  // TC-01: Komponente wird erstellt
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TC-02: Lampenbild wird angezeigt
  it('should display lamp image', () => {
    const compiled = fixture.nativeElement;
    const img = compiled.querySelector('img.lamp-icon');
    expect(img).toBeTruthy();
    expect(img.src).toContain('orange-light-lamp.svg');
    expect(img.alt).toBe('Orange Light');
  });

  // TC-03: Label wird angezeigt
  it('should display lamp label', () => {
    const compiled = fixture.nativeElement;
    const label = compiled.querySelector('.lamp-label');
    expect(label).toBeTruthy();
    expect(label.textContent).toContain('Orange Light');
  });

  // TC-04: Off-Zustand hat korrekte CSS-Klasse
  it('should have "off" class when lamp is off', () => {
    entitiesSubject.next([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'off' }
    ]);
    fixture.detectChanges();
    
    const img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('off')).toBe(true);
    expect(img.classList.contains('on')).toBe(false);
    expect(img.classList.contains('unavailable')).toBe(false);
    
    expect(component.isOn).toBe(false);
    expect(component.isAvailable).toBe(true);
  });

  // TC-05: On-Zustand hat korrekte CSS-Klasse
  it('should have "on" class when lamp is on', () => {
    entitiesSubject.next([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'on' }
    ]);
    fixture.detectChanges();
    
    const img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('on')).toBe(true);
    expect(img.classList.contains('off')).toBe(false);
    expect(img.classList.contains('unavailable')).toBe(false);
    
    expect(component.isOn).toBe(true);
    expect(component.isAvailable).toBe(true);
  });

  // TC-06: Unavailable-Zustand hat Graustufen-Klasse
  it('should have "unavailable" class when lamp is unavailable', () => {
    entitiesSubject.next([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'unavailable' }
    ]);
    fixture.detectChanges();
    
    const img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('unavailable')).toBe(true);
    expect(img.classList.contains('on')).toBe(false);
    
    expect(component.isOn).toBe(false);
    expect(component.isAvailable).toBe(false);
  });

  // TC-07: State-Änderung von OFF zu ON aktualisiert Darstellung
  it('should update display when state changes from off to on', (done) => {
    // Start: off
    entitiesSubject.next([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'off' }
    ]);
    fixture.detectChanges();
    
    let img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('off')).toBe(true);
    expect(component.isOn).toBe(false);
    
    // Change to on
    entitiesSubject.next([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'on' }
    ]);
    fixture.detectChanges();
    
    img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('on')).toBe(true);
    expect(component.isOn).toBe(true);
    done();
  });

  // TC-08: State-Änderung von ON zu OFF aktualisiert Darstellung
  it('should update display when state changes from on to off', (done) => {
    // Start: on
    entitiesSubject.next([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'on' }
    ]);
    fixture.detectChanges();
    
    expect(component.isOn).toBe(true);
    
    // Change to off
    entitiesSubject.next([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'off' }
    ]);
    fixture.detectChanges();
    
    const img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('off')).toBe(true);
    expect(component.isOn).toBe(false);
    done();
  });

  // TC-09: Entity nicht gefunden zeigt unavailable
  it('should show unavailable when entity not found', () => {
    entitiesSubject.next([]); // Keine Entities
    fixture.detectChanges();
    
    const img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('unavailable')).toBe(true);
    expect(component.isAvailable).toBe(false);
  });

  // TC-10: Subscription wird beim Destroy aufgeräumt
  it('should unsubscribe on destroy', () => {
    spyOn(component['sub']!, 'unsubscribe');
    component.ngOnDestroy();
    expect(component['sub']!.unsubscribe).toHaveBeenCalled();
  });

  // TC-11: Komponente verwendet korrekte Entity-ID
  it('should use correct entity ID', () => {
    expect(component.entityId).toBe('light.wiz_tunable_white_640190');
  });
});
