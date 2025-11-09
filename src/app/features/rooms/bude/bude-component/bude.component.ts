import {NgClass} from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {SamsungTv} from '@bude/devices/samsung-tv/samsung-tv/samsung-tv';

// Minimalansichten der Geräte
import { PixelMinimal } from '@rooms/bude/devices/pixel/pixel-minimal/pixel-minimal';
import { OrangeLightMinimal } from '@rooms/bude/devices/orange-light/orange-light-minimal/orange-light-minimal';
import { LaptopMinimal } from '@rooms/bude/devices/laptop/laptop-minimal/laptop-minimal';
import { CreatorMinimal } from '@rooms/bude/devices/creator/creator-minimal/creator-minimal';
import { SamsungTvMinimal } from '@bude/devices/samsung-tv/samsung-tv-minimal/samsung-tv-minimal';
import { MenuMinimal } from '@shared/components/menu/menu-minimal';
import { AuthService } from '@services/auth.service';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { HeaderComponent } from '@shared/components/header/header.component';
import { MenuComponent } from '@shared/components/menu/menu';
import { Creator } from '@rooms/bude/devices/creator/creator';
import { Laptop } from '@rooms/bude/devices/laptop/laptop';
import { OrangeLight } from '@rooms/bude/devices/orange-light/orange-light';
import { Pixel } from '@rooms/bude/devices/pixel/pixel';
import {HoverShaderDirective} from '@shared/directives/hover-shader.directive';

interface Device {
  /** Eindeutige ID der Gerätekachel. */
  id: number;
  /** Gerätetyp bestimmt Komponente und Farbe. */
  type: 'pixel' | 'orange-light' | 'laptop' | 'creator' | 'samsung-tv';
}

@Component({
  selector: 'app-bude',
  standalone: true,
  // Alle benötigten UI-Bausteine des Raumes
  imports: [
    PixelMinimal,
    OrangeLightMinimal,
    LaptopMinimal,
    CreatorMinimal,
    SamsungTvMinimal,
    MenuMinimal,
    HeaderComponent,
    NgClass,
    MenuComponent,
    Pixel,
    OrangeLight,
    Laptop,
    Creator,
    SamsungTv,
    HoverShaderDirective,
  ],
  templateUrl: './bude.component.html',
  styleUrls: ['./bude.component.scss']
})
export class BudeComponent implements OnInit {
  /** Alle in der Bude verfügbaren Geräte. */
  devices: Device[] = [
    { id: 0, type: 'pixel' },
    { id: 1, type: 'orange-light' },
    { id: 2, type: 'laptop' },
    { id: 3, type: 'creator' },
    { id: 4, type: 'samsung-tv' },
  ];

  /** Index des aktuell geöffneten Geräts; `null` zeigt die Grid-Übersicht. */
  activeIndex: number | null = null;

  /** Öffnungszustand des Menüs. */
  menuOpen = false;

  public userName: string = 'developer';

  constructor(
    private readonly auth: AuthService,
    private readonly ha: HomeAssistantService,
  ) {}

  ngOnInit(): void {
    this.userName = this.auth.getUserName();
  }

  onClick(idx: number) {
    // Wenn Gerät angeklickt, Menü schließen und Gerät aktivieren
    this.menuOpen = false;
    this.activeIndex = this.activeIndex === idx ? null : idx;
  }

  onClickSamsung(idx: number) {
    // Samsung TV angeklickt, Menü schließen und Gerät aktivieren
    this.menuOpen = false;
    this.activeIndex = this.activeIndex === idx ? null : idx;
  }

  /**
   * Vereinheitlichte Click-Logik pro Kachel.
   * - orange-light: Click wird unterdrückt (Short/Long wird über Pointer-Events gehandhabt)
   * - samsung-tv: wie bisher separate Logik
   * - andere Geräte: öffnen Details
   */
  onTileClick(type: Device['type'], idx: number, event: Event): void {
    if (type === 'orange-light') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (type === 'samsung-tv') {
      this.onClickSamsung(idx);
    } else {
      this.onClick(idx);
    }
  }

  // --- Long-Press Support für orange-light ---
  private longPressTimer: any = null;
  private readonly longPressThreshold = 500; // ms

  onPressStart(type: Device['type'], idx: number, event: Event): void {
    if (type !== 'orange-light') return;
    event.preventDefault();
    event.stopPropagation();
    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      // Long-Press erkannt -> Komponente öffnen
      this.longPressTimer = null;
      this.menuOpen = false;
      this.activeIndex = idx;
    }, this.longPressThreshold);
  }

  onPressEnd(type: Device['type'], idx: number, event: Event): void {
    if (type !== 'orange-light') return;
    event.preventDefault();
    event.stopPropagation();
    if (this.longPressTimer) {
      // Timer noch aktiv -> Short-Press => Toggle auslösen
      this.clearLongPressTimer();
      this.toggleOrangeLight();
    }
  }

  onPressCancel(event: Event): void {
    console.log(event);
    this.clearLongPressTimer();
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * Schaltet die Orange-Light Lampe per Home Assistant um.
   * Short-Press-Action auf der Kachel.
   * Verwendet explizit turn_on/turn_off statt toggle für bessere Kontrolle.
   */
  private toggleOrangeLight(): void {
    const entityId = 'light.wiz_tunable_white_640190';

    // WICHTIG: Hole frischen State aus dem Observable, nicht aus Cache!
    const allEntities = this.ha.getEntitiesSnapshot();
    const entity = allEntities.find(e => e.entity_id === entityId);

    if (!entity) {
      console.error('❌ Orange Light Entity nicht gefunden');
      console.error('📋 Verfügbare Entities:', allEntities.map(e => e.entity_id));
      return;
    }

    const isCurrentlyOn = entity.state === 'on';
    const targetService = isCurrentlyOn ? 'turn_off' : 'turn_on';
    const optimisticState = isCurrentlyOn ? 'off' : 'on';

    console.log(`🔄 Orange Light Toggle: "${entity.state}" → ${targetService}`);

    // OPTIMISTIC UPDATE: Sofort lokalen State ändern
    const optimisticEntity = { ...entity, state: optimisticState };
    const currentIndex = allEntities.findIndex(e => e.entity_id === entityId);
    if (currentIndex >= 0) {
      allEntities[currentIndex] = optimisticEntity;
      // Trigger manual update im Service
      (this.ha as any).entitiesSubject?.next([...allEntities]);
      console.log(`⚡ Optimistic Update: State lokal auf "${optimisticState}" gesetzt`);
    }

    // Service-Call an Home Assistant
    this.ha.callService('light', targetService, { entity_id: entityId }).subscribe({
      next: (response) => {
        console.log(`✅ ${targetService} successful:`, response);
        // Nach 1 Sekunde den ECHTEN State von HA holen
        setTimeout(() => {
          console.log('🔄 Verifiziere echten State von Home Assistant...');
          this.ha.refreshEntities();
        }, 1000);
      },
      error: (err) => {
        console.error(`❌ ${targetService} failed:`, err);
        // Bei Fehler: Rollback zum Original-State
        console.log('🔙 Rollback: Stelle Original-State wieder her');
        this.ha.refreshEntities();
      }
    });
  }

  onMenuButtonClick() {
    // Klick auf den Button: Menü öffnen, alle Geräte schließen
    this.activeIndex = null;
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  /**
   * Wird von den Gerätedetails aufgerufen, um zur Übersicht zurückzukehren.
   */
  onBack(): void {
    this.activeIndex = null;
  }


  getColor(type: Device['type']): string {
    switch (type) {
      case 'pixel':        return '#e74c3c';
      case 'orange-light': return '#e67e22';
      case 'laptop':       return '#3498db';
      case 'creator':      return '#9b59b6';
      case 'samsung-tv':   return '#2ecc71';
    }
  }

  /**
   * Erzeugt einen radialen Gradient für den übergebenen Gerätetyp,
   * damit die Kacheln farblich bleiben, aber stilistisch zur Roomübersicht passen.
   */
  getGradient(type: Device['type']): string {
    return this.gradientFrom(this.getColor(type));
  }

  /**
   * Hilfsfunktion zur Erstellung eines radialen Gradients auf Basis einer Farbe.
   */
  private gradientFrom(color: string): string {
    return `radial-gradient(circle at center, ${color}, rgba(0, 0, 0, 0.8))`;
  }


  /**
   * Farbverlauf für die Menü-Kachel.
   */
  getMenuGradient(): string {
    return this.gradientFrom('#34495e');
  }

  // --- Dev helper: copy DLNA DMR commands as JSON to clipboard ---
  copyDlnaCommandsJson(): void {
    this.ha.getDlnaDmrCommandsJson().subscribe({
      next: async (json) => {
        try {
          await navigator.clipboard.writeText(json);
          console.info('[Bude] DLNA DMR commands JSON copied to clipboard.');
          console.debug(json);
        } catch (e) {
          console.warn('[Bude] Clipboard write failed, printing JSON below:', e);
          console.log(json);
        }
      },
      error: (err) => {
        console.error('[Bude] Failed to get DLNA DMR commands JSON:', err);
      }
    });
  }

  // --- Dev helper: copy FireTV commands as JSON to clipboard ---
  copyFireTvCommandsJson(): void {
    this.ha.getFireTvCommandsJson().subscribe({
      next: async (json) => {
        try {
          await navigator.clipboard.writeText(json);
          console.info('[Bude] FireTV commands JSON copied to clipboard.');
          console.debug(json);
        } catch (e) {
          console.warn('[Bude] Clipboard write failed, printing JSON below:', e);
          console.log(json);
        }
      },
      error: (err) => {
        console.error('[Bude] Failed to get FireTV commands JSON:', err);
      }
    });
  }

  // --- Dev helper: copy FireTV device actions (device_automation) as JSON ---
  copyFireTvDeviceActionsJson(): void {
    this.ha.getFireTvDeviceActionsJson().subscribe({
      next: async (json) => {
        try {
          await navigator.clipboard.writeText(json);
          console.info('[Bude] FireTV device actions JSON copied to clipboard.');
          console.debug(json);
        } catch (e) {
          console.warn('[Bude] Clipboard write failed, printing JSON below:', e);
          console.log(json);
        }
      },
      error: (err) => console.error('[Bude] Failed to get FireTV device actions JSON:', err)
    });
  }

  // --- Dev helper: copy androidtv domain services as JSON ---
  copyAndroidTvServicesJson(): void {
    this.ha.getAndroidTvServicesJson().subscribe({
      next: async (json) => {
        try {
          await navigator.clipboard.writeText(json);
          console.info('[Bude] androidtv services JSON copied to clipboard.');
          console.debug(json);
        } catch (e) {
          console.warn('[Bude] Clipboard write failed, printing JSON below:', e);
          console.log(json);
        }
      },
      error: (err) => console.error('[Bude] Failed to get androidtv services JSON:', err)
    });
  }

  // --- Dev helper: copy media_player domain services as JSON ---
  copyMediaPlayerServicesJson(): void {
    this.ha.getMediaPlayerServicesJson().subscribe({
      next: async (json) => {
        try {
          await navigator.clipboard.writeText(json);
          console.info('[Bude] media_player services JSON copied to clipboard.');
          console.debug(json);
        } catch (e) {
          console.warn('[Bude] Clipboard write failed, printing JSON below:', e);
          console.log(json);
        }
      },
      error: (err) => console.error('[Bude] Failed to get media_player services JSON:', err)
    });
  }

  // --- Dev helper: copy aggregated Fire TV capabilities JSON ---
  copyFireTvCapabilitiesJson(): void {
    this.ha.getFireTvCapabilitiesJson().subscribe({
      next: async (json) => {
        try {
          await navigator.clipboard.writeText(json);
          console.info('[Bude] Fire TV capabilities JSON copied to clipboard.');
          console.debug(json);
        } catch (e) {
          console.warn('[Bude] Clipboard write failed, printing JSON below:', e);
          console.log(json);
        }
      },
      error: (err) => console.error('[Bude] Failed to get Fire TV capabilities JSON:', err)
    });
  }
}
