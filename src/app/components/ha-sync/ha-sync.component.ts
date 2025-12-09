import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HaSyncService, SyncResult } from '@services/home-assistant/ha-sync.service';

@Component({
  selector: 'app-ha-sync',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ha-sync-container">
      <h2>Home Assistant Synchronisation</h2>

      <div class="sync-status" *ngIf="lastSync">
        <p class="status-text" [class.success]="lastSync.success" [class.error]="!lastSync.success">
          {{ lastSync.message }}
        </p>
        <div *ngIf="lastSync.data" class="sync-stats">
          <div class="stat">
            <span class="label">Areas:</span>
            <span class="value">{{ lastSync.data.areas }}</span>
          </div>
          <div class="stat">
            <span class="label">Devices:</span>
            <span class="value">{{ lastSync.data.devices }}</span>
          </div>
          <div class="stat">
            <span class="label">Entities:</span>
            <span class="value">{{ lastSync.data.entities }}</span>
          </div>
        </div>
      </div>

      <div class="sync-actions">
        <button
          class="btn btn-primary"
          (click)="syncAll()"
          [disabled]="isLoading">
          <span *ngIf="!isLoading">🔄 Alle synchronisieren</span>
          <span *ngIf="isLoading">⏳ Synchronisiere...</span>
        </button>

        <div class="btn-group">
          <button class="btn btn-secondary" (click)="syncAreas()" [disabled]="isLoading">
            📍 Areas
          </button>
          <button class="btn btn-secondary" (click)="syncDevices()" [disabled]="isLoading">
            🔌 Devices
          </button>
          <button class="btn btn-secondary" (click)="syncEntities()" [disabled]="isLoading">
            🏠 Entities
          </button>
        </div>

        <button class="btn btn-info" (click)="testConnection()" [disabled]="isLoading">
          🔍 Verbindung testen
        </button>
      </div>

      <div class="connection-test" *ngIf="connectionStatus">
        <p [class.success]="connectionStatus.success" [class.error]="!connectionStatus.success">
          <span *ngIf="connectionStatus.success">
            ✅ Verbunden mit Home Assistant {{ connectionStatus.version }}
          </span>
          <span *ngIf="!connectionStatus.success">
            ❌ Verbindung fehlgeschlagen: {{ connectionStatus.error }}
          </span>
        </p>
      </div>

      <div class="domains" *ngIf="domains && domains.length > 0">
        <h3>Verfügbare Entity-Domains ({{ domains.length }})</h3>
        <div class="domain-tags">
          <span class="domain-tag" *ngFor="let domain of domains">{{ domain }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ha-sync-container {
      padding: 2rem;
      max-width: 900px;
      margin: 0 auto;
    }

    h2 {
      margin-bottom: 1.5rem;
      color: #333;
    }

    h3 {
      margin-top: 2rem;
      margin-bottom: 1rem;
      font-size: 1.2rem;
      color: #555;
    }

    .sync-status {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .status-text {
      margin: 0 0 1rem 0;
      font-weight: 500;
      font-size: 1.1rem;
    }

    .status-text.success {
      color: #28a745;
    }

    .status-text.error {
      color: #dc3545;
    }

    .sync-stats {
      display: flex;
      gap: 2rem;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat .label {
      font-size: 0.875rem;
      color: #666;
    }

    .stat .value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #007bff;
    }

    .sync-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .btn-group {
      display: flex;
      gap: 0.5rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
      flex: 1;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #545b62;
    }

    .btn-info {
      background: #17a2b8;
      color: white;
    }

    .btn-info:hover:not(:disabled) {
      background: #138496;
    }

    .connection-test {
      margin-top: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .connection-test p {
      margin: 0;
      font-weight: 500;
    }

    .connection-test .success {
      color: #28a745;
    }

    .connection-test .error {
      color: #dc3545;
    }

    .domain-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .domain-tag {
      background: #e9ecef;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      color: #495057;
      font-family: 'Courier New', monospace;
    }
  `]
})
export class HaSyncComponent implements OnInit {
  isLoading = false;
  lastSync: SyncResult | null = null;
  connectionStatus: { success: boolean; version?: string; error?: string } | null = null;
  domains: string[] = [];

  constructor(private readonly syncService: HaSyncService) {}

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

  loadDomains(): void {
    this.syncService.getDomains().subscribe({
      next: (result) => {
        if (result.success && result.domains) {
          this.domains = result.domains;
        }
      },
      error: (error) => {
        console.error('Failed to load domains:', error);
      }
    });
  }
}

