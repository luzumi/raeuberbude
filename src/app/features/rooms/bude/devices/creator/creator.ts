import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeAssistantService, Entity } from '@services/home-assistant/home-assistant.service';
import {firstValueFrom, timeInterval} from 'rxjs';

/** PC-Befehl mit Metadaten */
interface PcCommand {
  command: string;
  description: string;
  service: string;
  domain: string;
  serviceData?: any;
  tested?: boolean;
  testSuccess?: boolean;
  bookmarked?: boolean;
  entityId?: string;
  currentState?: string;
}

@Component({
  selector: 'app-creator',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './creator.html',
  styleUrl: './creator.scss'
})
export class Creator implements OnInit, OnDestroy {
  /** Event zum Zurückkehren zum Grid. */
  @Output() back = new EventEmitter<void>();

  /** Entity-ID für den Stoppe_Spy Button */
  private readonly STOPPE_SPY_ENTITY = 'button.creator_z590_p1_stoppe_spy';
  private readonly STARTE_SPY_ENTITY = 'button.creator_z590_p1_starte_spy';

  /** Screenshot-URL - KORRIGIERT: Ohne doppelten Pfad */
  private readonly SCREENSHOT_URL = 'http://192.168.178.24:8123/local/creator_screenshots/PC-screenshot.png';

  /** Liste aller verfügbaren PC-Befehle */
  commands: PcCommand[] = [];

  /** Gefilterte Befehle (nur gebookmarkte anzeigen) */
  showOnlyBookmarked = false;

  /** Test läuft gerade */
  testingCommand: string | null = null;

  /** Lade-Status */
  loading = true;
  loadError: string | null = null;

  /** Spy-Dialog Status */
  showSpyDialog = false;
  spyScreenshotUrl = '';
  imageLoadStatus = 'Warte auf Bild...';
  imageErrorMessage = '';
  timeout: number = 2000;
  private screenshotRefreshInterval?: number;
  private errorDebounceTimer?: number;
  private consecutiveErrors = 0;

  constructor(private readonly hass: HomeAssistantService) {}

  /** Sucht nach CREATOR-Z590-P1 relevanten Entity-IDs */
  private isPcEntity(entityId: string): boolean {
    const lowerEntityId = entityId.toLowerCase();
    // Nur Entities die explizit zu CREATOR-Z590-P1 gehören
    return lowerEntityId.includes('creator_z590_p1') ||
           lowerEntityId.includes('creator-z590-p1') ||
           lowerEntityId.includes('creatorz590p1');
  }

  ngOnInit(): void {
    this.loadCommands();
  }

  /** Wird beim Zerstören der Komponente aufgerufen - stoppt Spy-Script */
  ngOnDestroy(): void {
    // Stoppe Screenshot-Refresh (synchron)
    this.stopScreenshotRefresh();

    // Stoppe Spy-Script asynchron im Hintergrund (Fire-and-Forget)
    if (this.showSpyDialog) {
      this.stopSpy().catch(error => {
        console.warn('[PC] ⚠️ Fehler beim Stoppen des Spy-Scripts während ngOnDestroy:', error);
      });
    }

    // Sende Stoppe-Befehl im Hintergrund (Fire-and-Forget)
    console.log('[PC] Komponente wird zerstört - stoppe Spy-Script...');
    firstValueFrom(
      this.hass.callService('button', 'press', {
        entity_id: this.STOPPE_SPY_ENTITY
      })
    ).then(() => {
      console.log('[PC] ✅ Spy-Script beim Zerstören gestoppt');
    }).catch(error => {
      console.warn('[PC] ⚠️ Konnte Spy-Script beim Zerstören nicht stoppen:', error);
    });
  }

  /** Lädt alle verfügbaren PC-Befehle dynamisch von Home Assistant */
  private async loadCommands(): Promise<void> {
    this.loading = true;
    this.loadError = null;

    try {
      // Hole alle Entities von Home Assistant
      const entities = await firstValueFrom(this.hass.getStatesWs());
      console.log('[PC] Alle Entities geladen:', entities.length);

      // Filtere PC-relevante Entities
      const pcEntities = entities.filter(e => this.isPcEntity(e.entity_id));
      console.log('[PC] PC-relevante Entities gefunden:', pcEntities.length, pcEntities.map(e => e.entity_id));

      if (pcEntities.length === 0) {
        this.loadError = 'Keine CREATOR-Z590-P1 Entities gefunden. Stelle sicher, dass HASS.Agent auf dem PC läuft und Entities mit "creator_z590_p1" oder "creator-z590-p1" im Namen existieren.';
        this.loading = false;
        return;
      }

      // Erstelle Befehle aus den gefundenen Entities
      this.commands = [];

      for (const entity of pcEntities) {
        const commands = this.createCommandsFromEntity(entity);
        this.commands.push(...commands);
      }

      console.log('[PC] Befehle erstellt:', this.commands.length);

      // Lade gespeicherte Bookmarks
      this.loadBookmarks();

      // Abonniere Entity-Updates für Live-Status
      this.hass.entities$.subscribe(updatedEntities => {
        this.updateCommandStates(updatedEntities);
      });

    } catch (error) {
      console.error('[PC] Fehler beim Laden der Befehle:', error);
      this.loadError = 'Fehler beim Laden der Befehle von Home Assistant: ' + (error as Error).message;
    } finally {
      this.loading = false;
    }
  }

  /** Erstellt eine lesbare Beschreibung aus der Entity-ID */
  private createHumanReadableDescription(entityId: string, friendlyName?: string): string {
    // Wenn ein Friendly Name existiert, nutze ihn
    if (friendlyName && !friendlyName.toLowerCase().includes('creator_z590_p1')) {
      return friendlyName;
    }

    // Ansonsten: Entity-ID in lesbare Form umwandeln
    // z.B. "button.creator_z590_p1_shutdown" -> "Shutdown"
    const parts = entityId.split('.');
    if (parts.length < 2) return entityId;

    let name = parts[1]; // z.B. "creator_z590_p1_shutdown"

    // Entferne PC-Präfix
    name = name.replace(/^creator[_-]?z590[_-]?p1[_-]?/i, '');

    // Ersetze Unterstriche durch Leerzeichen
    name = name.replace(/_/g, ' ');

    // Kapitalisiere jeden Wortanfang
    name = name.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    // Deutsche Übersetzungen für häufige Begriffe
    const translations: Record<string, string> = {
      'Shutdown': 'Herunterfahren',
      'Restart': 'Neu starten',
      'Sleep': 'Ruhezustand',
      'Hibernate': 'Winterschlaf',
      'Lock': 'Sperren',
      'Unlock': 'Entsperren',
      'Volume Up': 'Lautstärke +',
      'Volume Down': 'Lautstärke -',
      'Volume Mute': 'Stumm',
      'Monitor Off': 'Monitor aus',
      'Monitor On': 'Monitor an',
      'Display Off': 'Display aus',
      'Display On': 'Display an',
      'Open Browser': 'Browser öffnen',
      'Open': 'Öffnen',
      'Close': 'Schließen',
      'Start': 'Starten',
      'Stop': 'Stoppen',
      'Cpu': 'CPU',
      'Gpu': 'GPU',
      'Ram': 'RAM',
      'Temperature': 'Temperatur',
      'Usage': 'Auslastung',
      'Battery': 'Batterie',
      'Power': 'Energie',
      'Network': 'Netzwerk',
      'Wifi': 'WLAN',
      'Bluetooth': 'Bluetooth',
      'Camera': 'Kamera',
      'Microphone': 'Mikrofon',
      'Screenshot': 'Screenshot',
      'Notification': 'Benachrichtigung',
      'Media Play': 'Abspielen',
      'Media Pause': 'Pausieren',
      'Media Next': 'Nächster',
      'Media Previous': 'Vorheriger',
      'Media Stop': 'Stoppen'
    };

    // Versuche Übersetzung zu finden
    for (const [en, de] of Object.entries(translations)) {
      if (name.toLowerCase() === en.toLowerCase()) {
        return de;
      }
    }

    return name || entityId;
  }

  /** Erstellt Befehle aus einer Entity basierend auf ihrer Domain */
  private createCommandsFromEntity(entity: Entity): PcCommand[] {
    const commands: PcCommand[] = [];
    const domain = entity.entity_id.split('.')[0];
    const entityId = entity.entity_id;
    const description = this.createHumanReadableDescription(entityId, entity.attributes.friendly_name);

    switch (domain) {
      case 'button':
        commands.push({
          command: entityId,
          description: description,
          service: 'press',
          domain: 'button',
          serviceData: { entity_id: entityId },
          entityId: entityId,
          currentState: entity.state,
          bookmarked: false
        });
        break;

      case 'switch':
        commands.push(
          {
            command: `${entityId}_on`,
            description: `${description} (Ein)`,
            service: 'turn_on',
            domain: 'switch',
            serviceData: { entity_id: entityId },
            entityId: entityId,
            currentState: entity.state,
            bookmarked: false
          },
          {
            command: `${entityId}_off`,
            description: `${description} (Aus)`,
            service: 'turn_off',
            domain: 'switch',
            serviceData: { entity_id: entityId },
            entityId: entityId,
            currentState: entity.state,
            bookmarked: false
          }
        );
        break;

      case 'light':
        commands.push(
          {
            command: `${entityId}_on`,
            description: `${description} (Ein)`,
            service: 'turn_on',
            domain: 'light',
            serviceData: { entity_id: entityId },
            entityId: entityId,
            currentState: entity.state,
            bookmarked: false
          },
          {
            command: `${entityId}_off`,
            description: `${description} (Aus)`,
            service: 'turn_off',
            domain: 'light',
            serviceData: { entity_id: entityId },
            entityId: entityId,
            currentState: entity.state,
            bookmarked: false
          }
        );
        break;

      case 'script':
        commands.push({
          command: entityId,
          description: description,
          service: 'turn_on',
          domain: 'script',
          serviceData: { entity_id: entityId },
          entityId: entityId,
          currentState: entity.state,
          bookmarked: false
        });
        break;

      case 'media_player':
        commands.push(
          {
            command: `${entityId}_play_pause`,
            description: `${description} (Play/Pause)`,
            service: 'media_play_pause',
            domain: 'media_player',
            serviceData: { entity_id: entityId },
            entityId: entityId,
            currentState: entity.state,
            bookmarked: false
          },
          {
            command: `${entityId}_next`,
            description: `${description} (Nächster)`,
            service: 'media_next_track',
            domain: 'media_player',
            serviceData: { entity_id: entityId },
            entityId: entityId,
            currentState: entity.state,
            bookmarked: false
          },
          {
            command: `${entityId}_previous`,
            description: `${description} (Vorheriger)`,
            service: 'media_previous_track',
            domain: 'media_player',
            serviceData: { entity_id: entityId },
            entityId: entityId,
            currentState: entity.state,
            bookmarked: false
          }
        );
        break;

      case 'sensor':
        // Sensoren sind read-only, aber wir zeigen sie zur Info an
        const unit = entity.attributes['unit_of_measurement'] || '';
        const sensorDesc = unit ? `${description} (${entity.state} ${unit})` : `${description}`;
        commands.push({
          command: entityId,
          description: sensorDesc,
          service: 'none',
          domain: 'sensor',
          serviceData: {},
          entityId: entityId,
          currentState: entity.state,
          bookmarked: false
        });
        break;

      case 'binary_sensor':
        // Binary Sensoren sind read-only
        commands.push({
          command: entityId,
          description: description,
          service: 'none',
          domain: 'binary_sensor',
          serviceData: {},
          entityId: entityId,
          currentState: entity.state,
          bookmarked: false
        });
        break;

      default:
        // Für unbekannte Domains versuchen wir turn_on/turn_off
        commands.push({
          command: entityId,
          description: `${description} (${domain})`,
          service: 'turn_on',
          domain: domain,
          serviceData: { entity_id: entityId },
          entityId: entityId,
          currentState: entity.state,
          bookmarked: false
        });
    }

    return commands;
  }

  /** Aktualisiert den Status der Befehle basierend auf Entity-Updates */
  private updateCommandStates(entities: Entity[]): void {
    for (const cmd of this.commands) {
      if (cmd.entityId) {
        const entity = entities.find(e => e.entity_id === cmd.entityId);
        if (entity) {
          cmd.currentState = entity.state;
        }
      }
    }
  }

  /** Führt einen Befehl aus */
  async executeCommand(cmd: PcCommand): Promise<void> {
    if (this.testingCommand) return;

    // Sensoren können nicht ausgeführt werden
    if (cmd.service === 'none') {
      console.log('[PC] Sensor-Entity, keine Aktion möglich:', cmd.entityId);
      return;
    }

    // Spezialbehandlung für Starte_Spy Button (robuster Vergleich)
    if (cmd.entityId && cmd.entityId.toLowerCase().includes('starte_spy')) {
      console.log('[PC] Starte_Spy Button erkannt, öffne Dialog...');
      await this.startSpy();
      cmd.tested = true;
      cmd.testSuccess = true;
      return;
    }

    this.testingCommand = cmd.command;
    cmd.tested = true;

    try {
      console.log(`[PC] Führe Befehl aus: ${cmd.domain}.${cmd.service}`, cmd.serviceData);
      const response = await firstValueFrom(
        this.hass.callService(cmd.domain, cmd.service, cmd.serviceData || {})
      );
      cmd.testSuccess = response.success;
      console.log(`[PC] ✅ Befehl ${cmd.command} erfolgreich:`, response);
    } catch (error) {
      cmd.testSuccess = false;
      console.error(`[PC] ❌ Befehl ${cmd.command} fehlgeschlagen:`, error);
    } finally {
      this.testingCommand = null;
    }
  }

  /** Startet das Spy-Script und öffnet den Screenshot-Dialog */
  async startSpy(): Promise<void> {
    try {
      console.log('[PC] Starte Spy-Script...');

      // Sende Starte-Spy Befehl
      await firstValueFrom(
        this.hass.callService('button', 'press', {
          entity_id: this.STARTE_SPY_ENTITY
        })
      );

      console.log('[PC] ✅ Spy-Script gestartet');

      // Öffne Dialog
      console.log('[PC] Setze showSpyDialog auf true...');
      this.showSpyDialog = true;
      console.log('[PC] showSpyDialog ist jetzt:', this.showSpyDialog);

      // Starte Screenshot-Refresh (alle 500ms)
      this.startScreenshotRefresh();
      console.log('[PC] Screenshot-Refresh gestartet, URL:', this.spyScreenshotUrl);

    } catch (error) {
      console.error('[PC] ❌ Fehler beim Starten des Spy-Scripts:', error);
    }
  }

  /** Stoppt das Spy-Script */
  async stopSpy(): Promise<void> {
    try {
      console.log('[PC] Stoppe Spy-Script...');

      // Stoppe Screenshot-Refresh
      this.stopScreenshotRefresh();

      // Sende Stoppe-Spy Befehl
      await firstValueFrom(
        this.hass.callService('button', 'press', {
          entity_id: this.STOPPE_SPY_ENTITY
        })
      );

      console.log('[PC] ✅ Spy-Script gestoppt');

    } catch (error) {
      console.error('[PC] ❌ Fehler beim Stoppen des Spy-Scripts:', error);
    }
  }

  /** Startet das automatische Aktualisieren des Screenshots */
  private startScreenshotRefresh(): void {
    // Initiale URL mit Timestamp
    this.updateScreenshotUrl();

    // Aktualisiere alle 500ms
    this.screenshotRefreshInterval = window.setInterval(() => {
      this.updateScreenshotUrl();
    }, this.timeout);
  }

  /** Stoppt das automatische Aktualisieren des Screenshots */
  private stopScreenshotRefresh(): void {
    if (this.screenshotRefreshInterval) {
      clearInterval(this.screenshotRefreshInterval);
      this.screenshotRefreshInterval = undefined;
    }

    // Cleanup: Debounce-Timer und Error-Counter zurücksetzen
    if (this.errorDebounceTimer) {
      clearTimeout(this.errorDebounceTimer);
      this.errorDebounceTimer = undefined;
    }
    this.consecutiveErrors = 0;
  }

  /** Aktualisiert die Screenshot-URL mit Preloading */
  private updateScreenshotUrl(): void {
    const newUrl = `${this.SCREENSHOT_URL}?t=${Date.now()}`;

    // Preload: Lade Bild im Hintergrund, setze URL erst wenn geladen
    const preloadImg = new Image();

    preloadImg.onload = () => {
      // Bild erfolgreich geladen → setze URL
      this.spyScreenshotUrl = newUrl;
      console.log('[PC] 📸 Screenshot preloaded und aktualisiert');
    };

    preloadImg.onerror = () => {
      // Fehler beim Preload → behalte alte URL, zeige keine Fehlermeldung
      console.warn('[PC] ⚠️ Screenshot-Preload fehlgeschlagen, behalte alte URL');
    };

    // Starte Preload
    preloadImg.src = newUrl;
  }

  /** Schließt den Spy-Dialog und stoppt das Script */
  async closeSpyDialog(): Promise<void> {
    this.showSpyDialog = false;
    await this.stopSpy();
  }

  /** Togglet Bookmark-Status eines Befehls */
  toggleBookmark(cmd: PcCommand): void {
    cmd.bookmarked = !cmd.bookmarked;
    this.saveBookmarks();
  }

  /** Speichert Bookmarks in localStorage */
  private saveBookmarks(): void {
    const bookmarks = this.commands
      .filter(c => c.bookmarked)
      .map(c => c.command);
    try {
      localStorage.setItem('pc_command_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
      console.error('[PC] Fehler beim Speichern der Bookmarks:', e);
    }
  }

  /** Lädt Bookmarks aus localStorage */
  private loadBookmarks(): void {
    try {
      const stored = localStorage.getItem('pc_command_bookmarks');
      if (stored) {
        const bookmarks: string[] = JSON.parse(stored);
        this.commands.forEach(cmd => {
          cmd.bookmarked = bookmarks.includes(cmd.command);
        });
      }
    } catch (e) {
      console.error('[PC] Fehler beim Laden der Bookmarks:', e);
    }
  }

  /** Gibt gefilterte Befehle zurück */
  get filteredCommands(): PcCommand[] {
    if (this.showOnlyBookmarked) {
      return this.commands.filter(c => c.bookmarked);
    }
    return this.commands;
  }

  /** Toggle Filter für gebookmarkte Befehle */
  toggleBookmarkFilter(): void {
    this.showOnlyBookmarked = !this.showOnlyBookmarked;
  }

  /** Image Load Handler */
  onImageLoad(): void {
    this.imageLoadStatus = '✅ Bild geladen: ' + new Date().toLocaleTimeString();
    this.imageErrorMessage = ''; // Lösche Fehlermeldung bei erfolgreichem Laden
    this.consecutiveErrors = 0; // Reset Error-Counter

    // Lösche Debounce-Timer
    if (this.errorDebounceTimer) {
      clearTimeout(this.errorDebounceTimer);
      this.errorDebounceTimer = undefined;
    }

    console.log('[PC] 🖼️ Screenshot erfolgreich geladen');
  }

  /** Image Error Handler - MIT DEBOUNCING */
  onImageError(event: any): void {
    this.consecutiveErrors++;

    // Nur bei wiederholten Fehlern (3+) eine Meldung anzeigen
    // Verhindert Flackern bei kurzzeitigen Ladefehlern
    if (this.consecutiveErrors < 3) {
      console.log(`[PC] ⚠️ Bild-Ladefehler #${this.consecutiveErrors} (ignoriert, warte auf Wiederholung)`);
      return;
    }

    // Debounce: Nur alle 2 Sekunden eine Fehlermeldung aktualisieren
    if (this.errorDebounceTimer) {
      return; // Ignoriere Fehler während Debounce
    }

    this.imageLoadStatus = '❌ Fehler beim Laden';

    // Einfache Fehlermeldung OHNE zusätzlichen Fetch-Request
    const img = event.target as HTMLImageElement;
    let errorMsg = 'Screenshot konnte nicht geladen werden';

    if (!img.complete) {
      errorMsg = 'Bild wird noch geladen oder ist nicht erreichbar';
    } else if (img.naturalWidth === 0) {
      errorMsg = 'Bild ist leer oder beschädigt - Prüfe ob Screenshot-Script läuft';
    }

    this.imageErrorMessage = errorMsg;
    console.error('[PC] ❌ Screenshot Fehler:', errorMsg);
    console.error('[PC] URL:', this.spyScreenshotUrl);
    console.error('[PC] Consecutive Errors:', this.consecutiveErrors);

    // Debounce-Timer: 2 Sekunden
    this.errorDebounceTimer = window.setTimeout(() => {
      this.errorDebounceTimer = undefined;
    }, 2000);
  }

  /** Get Current Timestamp */
  getCurrentTimestamp(): string {
    return new Date().toLocaleTimeString();
  }

  /** Wird beim Zurück-Button aufgerufen - stoppt Spy-Script */
  async onBackClick(): Promise<void> {
    // Schließe Spy-Dialog falls offen
    if (this.showSpyDialog) {
      await this.closeSpyDialog();
    }

    // Versuche zusätzlich den Stoppe_Spy Button auszulösen (Sicherheit)
    try {
      console.log('[PC] Stoppe Spy-Script vor dem Zurückkehren...');
      await firstValueFrom(
        this.hass.callService('button', 'press', {
          entity_id: this.STOPPE_SPY_ENTITY
        })
      );
      console.log('[PC] ✅ Spy-Script gestoppt');
    } catch (error) {
      console.warn('[PC] ⚠️ Konnte Spy-Script nicht stoppen:', error);
      // Fehler nicht weiterwerfen, damit der Zurück-Button trotzdem funktioniert
    }

    // Dann zurück zum Grid
    this.back.emit();
  }

  protected readonly timeInterval = timeInterval;
}
