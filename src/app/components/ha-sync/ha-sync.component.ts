import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';

import {HaDomainEntitiesDialogComponent} from '@components/ha-sync/HaDomainEntitiesDialogComponent';
import { HaSyncService, SyncResult } from '@services/home-assistant/ha-sync.service';
import { HomeAssistantService } from '../../core/services/homeassistant.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-ha-sync',
  standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="sync-content">
      <!-- Sync Status Card -->
      <div class="status-card" *ngIf="lastSync">
        <div class="status-header">
          <mat-icon [class.success]="lastSync.success" [class.error]="!lastSync.success">
            {{ lastSync.success ? 'check_circle' : 'error' }}
          </mat-icon>
          <span class="status-text" [class.success]="lastSync.success" [class.error]="!lastSync.success">
            {{ lastSync.message }}
          </span>
        </div>
        <div *ngIf="lastSync.data" class="sync-stats">
          <div class="stat-item">
            <span class="stat-value">{{ lastSync.data.areas ?? '-' }}</span>
            <span class="stat-label">Areas</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ lastSync.data.devices ?? '-' }}</span>
            <span class="stat-label">Devices</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ lastSync.data.entities ?? '-' }}</span>
            <span class="stat-label">Entities</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ lastSync.data.automations ?? '-' }}</span>
            <span class="stat-label">Automations</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ lastSync.data.persons ?? '-' }}</span>
            <span class="stat-label">Persons</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ lastSync.data.zones ?? '-' }}</span>
            <span class="stat-label">Zones</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ lastSync.data.media_players ?? '-' }}</span>
            <span class="stat-label">Media Players</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ lastSync.data.services ?? '-' }}</span>
            <span class="stat-label">Services</span>
          </div>
        </div>
      </div>

        <!-- Sync Actions -->
      <div class="action-section">
        <button
          mat-raised-button
          color="primary"
          (click)="syncAll()"
          [disabled]="isLoading"
          class="sync-btn-primary">
          <mat-icon>sync</mat-icon>
          <span *ngIf="!isLoading">Alle synchronisieren</span>
          <span *ngIf="isLoading">Synchronisiere...</span>
        </button>

        <div class="btn-group">
          <button mat-raised-button (click)="syncAreas()" [disabled]="isLoading">
            <mat-icon>place</mat-icon>
            Areas
          </button>
          <button mat-raised-button (click)="syncDevices()" [disabled]="isLoading">
            <mat-icon>devices</mat-icon>
            Devices
          </button>
          <button mat-raised-button (click)="syncEntities()" [disabled]="isLoading">
            <mat-icon>home</mat-icon>
            Entities
          </button>
          <button mat-raised-button (click)="syncAutomations()" [disabled]="isLoading">
            <mat-icon>autorenew</mat-icon>
            Automations
          </button>
          <button mat-raised-button (click)="syncPersons()" [disabled]="isLoading">
            <mat-icon>person</mat-icon>
            Persons
          </button>
          <button mat-raised-button (click)="syncZones()" [disabled]="isLoading">
            <mat-icon>place</mat-icon>
            Zones
          </button>
          <button mat-raised-button (click)="syncMediaPlayers()" [disabled]="isLoading">
            <mat-icon>cast</mat-icon>
            Media Players
          </button>
          <button mat-raised-button (click)="syncServices()" [disabled]="isLoading">
            <mat-icon>build</mat-icon>
            Services
          </button>
        </div>

          <!-- Connection Status -->
          <div class="connection-card" *ngIf="connectionStatus">
              <mat-icon [class.success]="connectionStatus.success" [class.error]="!connectionStatus.success">
                  {{ connectionStatus.success ? 'cloud_done' : 'cloud_off' }}
              </mat-icon>
              <span *ngIf="connectionStatus.success" class="success">
          Verbunden mit Home Assistant {{ connectionStatus.version }}
        </span>
              <span *ngIf="!connectionStatus.success" class="error">
          Verbindung fehlgeschlagen: {{ connectionStatus.error }}
        </span>
        <button
          mat-stroked-button
          color="warn"
          (click)="testConnection()"
          [matTooltip] = "'Verbindung testen'"
          [disabled]="isLoading">
          <mat-icon
          >wifi_find</mat-icon>
        </button>
          </div>
      </div>

      <!-- Domain Chips Section -->
      <div class="domains-section" *ngIf="domainsList && domainsList.length > 0">
        <div class="section-header">
          <h3>Verfügbare Entity-Domains ({{ domainsList.length }})</h3>
          <p class="section-hint">Klicke auf eine Domain, um alle Entities anzuzeigen</p>
        </div>
        <div class="domain-chips">
          <button
            class="domain-chip"
            *ngFor="let domainInfo of domainsList"
            (click)="openDomainDialog(domainInfo.domain)">
            <span class="domain-icon">{{ getDomainIcon(domainInfo.domain) }}</span>
            <span class="domain-name">{{ domainInfo.domain }}</span>
            <span class="domain-count">{{ domainInfo.count }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Main Content Container */
    .sync-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 24px 0;
    }

    /* Status Card */
    .status-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
      border-left: 4px solid #667eea;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }

    .status-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .status-header mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .status-header mat-icon.success {
      color: #28a745;
    }

    .status-header mat-icon.error {
      color: #dc3545;
    }

    .status-text {
      font-size: 1.1rem;
      font-weight: 500;
    }

    .status-text.success {
      color: #28a745;
    }

    .status-text.error {
      color: #dc3545;
    }

    .sync-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 20px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 8px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #667eea;
      line-height: 1;
    }

    .stat-label {
      margin-top: 8px;
      font-size: 0.875rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Connection Card */
    .connection-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .connection-card mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .connection-card mat-icon.success {
      color: #28a745;
    }

    .connection-card mat-icon.error {
      color: #dc3545;
    }

    .connection-card .success {
      color: #28a745;
      font-weight: 500;
    }

    .connection-card .error {
      color: #dc3545;
      font-weight: 500;
    }

    /* Action Section */
    .action-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .sync-btn_primary {
      width: 100%;
      height: 56px;
      font-size: 1.1rem;
      font-weight: 500;
    }

    .sync-btn_primary mat-icon {
      margin-right: 8px;
    }

    .btn-group {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
    }

    .btn-group button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
    }

    .btn-group button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    button[mat-raised-button][color="accent"] {
      width: 100%;
    }

    /* Domains Section */
    .domains-section {
      margin-top: 20px;
    }

    .section-header {
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e0e0e0;
    }

    .section-header h3 {
      margin: 0 0 8px 0;
      font-size: 1.3rem;
      color: #333;
      font-weight: 500;
    }

    .section-hint {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
      font-style: italic;
    }

    .domain-chips {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 6px;
    }

    .domain-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 14px 16px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 2px solid #dee2e6;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
    }

    .domain-chip::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: #667eea;
      transform: scaleY(0);
      transition: transform 0.25s ease;
    }

    .domain-chip:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.25);
    }

    .domain-chip:hover::before {
      transform: scaleY(1);
    }

    .domain-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .domain-name {
      flex: 1;
      font-weight: 500;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      color: #333;
    }

    .domain-count {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4px 4px;
      border-radius: 6px;
      font-size: 0.5rem;
      font-weight: bold;
      min-width: 8px;
      text-align: center;
      flex-shrink: 0;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sync-content {
        padding: 16px 0;
        gap: 16px;
      }

      .sync-stats {
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 12px;
      }

      .stat-value {
        font-size: 1.5rem;
      }

      .stat-label {
        font-size: 0.75rem;
      }

      .btn-group {
        grid-template-columns: 1fr;
      }

      .domain-chips {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 10px;
      }

      .domain-chip {
        padding: 12px;
      }

      .domain-name {
        font-size: 0.8rem;
      }
    }
  `]
})
export class HaSyncComponent implements OnInit {
  isLoading = false;
  lastSync: SyncResult | null = null;
  connectionStatus: { success: boolean; version?: string; error?: string } | null = null;
  domains: string[] = [];
  domainsList: { domain: string; count: number }[] = [];

  constructor(
    private readonly syncService: HaSyncService,
    private readonly haService: HomeAssistantService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Initial connection test
    this.testConnection();
    this.loadDomains();
  }

  syncAll(): void {
    this.isLoading = true;
    this.syncService.syncAll().subscribe({
      next: (result) => {
        this.lastSync = result;
        // Wenn Backend jetzt erweiterte Datenfelder zurückgibt, übernehmen wir sie in die Anzeige
        if (result?.data) {
          // Normalisieren der Felder für Anzeige
          result.data.automations = result.data.automations ?? result.data['automations'];
          result.data.persons = result.data.persons ?? result.data['persons'];
          result.data.zones = result.data.zones ?? result.data['zones'];
          result.data.media_players = result.data.media_players ?? result.data['media_players'];
          result.data.services = result.data.services ?? result.data['services'];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Sync failed:', error);
        this.lastSync = {
          success: false,
          error: error.message || 'Unknown error'
        };
        this.isLoading = false;
      }
    });
  }

  syncAreas(): void {
    this.isLoading = true;
    this.syncService.syncAreas().subscribe({
      next: (result) => {
        this.lastSync = result;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Area sync failed:', error);
        this.isLoading = false;
      }
    });
  }

  syncDevices(): void {
    this.isLoading = true;
    this.syncService.syncDevices().subscribe({
      next: (result) => {
        this.lastSync = result;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Device sync failed:', error);
        this.isLoading = false;
      }
    });
  }

  syncEntities(): void {
    this.isLoading = true;
    this.syncService.syncEntities().subscribe({
      next: (result) => {
        this.lastSync = result;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Entity sync failed:', error);
        this.isLoading = false;
      }
    });
  }

  // Neue spezifische Sync-Methoden
  syncAutomations(): void {
    this.isLoading = true;
    this.syncService.syncAutomations().subscribe({
      next: (result) => {
        this.lastSync = result;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Automations sync failed:', error);
        this.isLoading = false;
      }
    });
  }

  syncPersons(): void {
    this.isLoading = true;
    this.syncService.syncPersons().subscribe({
      next: (result) => {
        this.lastSync = result;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Persons sync failed:', error);
        this.isLoading = false;
      }
    });
  }

  syncZones(): void {
    this.isLoading = true;
    this.syncService.syncZones().subscribe({
      next: (result) => {
        this.lastSync = result;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Zones sync failed:', error);
        this.isLoading = false;
      }
    });
  }

  syncMediaPlayers(): void {
    this.isLoading = true;
    this.syncService.syncMediaPlayers().subscribe({
      next: (result) => {
        this.lastSync = result;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Media players sync failed:', error);
        this.isLoading = false;
      }
    });
  }

  syncServices(): void {
    this.isLoading = true;
    this.syncService.syncServices().subscribe({
      next: (result) => {
        this.lastSync = result;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Services sync failed:', error);
        this.isLoading = false;
      }
    });
  }

  testConnection(): void {
    this.syncService.testConnection().subscribe({
      next: (result) => {
        this.connectionStatus = result;
      },
      error: (error) => {
        console.error('Connection test failed:', error);
        this.connectionStatus = {
          success: false,
          error: error.message || 'Unknown error'
        };
      }
    });
  }

  async loadDomains(): Promise<void> {
    console.log('🔍 Loading domains...');
    try {
      // Load detailed domain info with counts from the correct service
      const response = await firstValueFrom(this.haService.getAllDomains());
      console.log('📦 API Response:', response);

      if (response?.success && response.domainCounts) {
        this.domainsList = response.domainCounts;
        console.log('✅ Loaded', this.domainsList.length, 'domains with counts:', this.domainsList);
      } else {
        console.error('❌ Invalid response format:', response);
      }
    } catch (error) {
      console.error('❌ Failed to load domain counts:', error);
    }
  }

  openDomainDialog(domain: string): void {
    console.log('🔵 Opening dialog for domain:', domain);
    this.dialog.open(HaDomainEntitiesDialogComponent, {
      data: {
        domains: this.domainsList,
        selectedDomain: domain
      },
      width: '90vw',
      maxWidth: '1400px',
      height: '90vh',
      maxHeight: '900px',
      panelClass: 'ha-domain-dialog-large',
    });
  }

  getDomainIcon(domain: string): string {
    const icons: Record<string, string> = {
      light: '💡',
      switch: '🔌',
      sensor: '📊',
      binary_sensor: '🚪',
      automation: '🤖',
      media_player: '🔊',
      climate: '🌡️',
      camera: '📹',
      lock: '🔒',
      cover: '🪟',
      fan: '🌀',
      person: '👤',
      device_tracker: '📍',
      zone: '📌',
      script: '💻',
      button: '🔘',
      number: '🔢',
      select: '⬇️',
      input_boolean: '🔄',
      input_number: '🔢',
      input_select: '📋',
      calendar: '📅',
      weather: '☀️',
      update: '🔄',
      todo: '☑️',
      tts: '🗣️',
      stt: '🎤',
      conversation: '💬',
      event: '📅',
      image: '🖼️',
      sun: '☀️',
      remote: '📡',
    };
    return icons[domain] || '🏠';
  }
}
