import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { firstValueFrom } from 'rxjs';
import { HomeAssistantService } from '../../../core/services/homeassistant.service';

@Component({
  selector: 'app-ha-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatDividerModule,
  ],
  template: `
    <div class="dialog-container">
      <mat-card class="detail-header">
        <mat-card-header>
          <mat-card-title>{{ getTitle() }}</mat-card-title>
          <mat-card-subtitle>{{ getSubtitle() }}</mat-card-subtitle>
        </mat-card-header>
      </mat-card>

      <mat-tab-group>
        <!-- Overview Tab -->
        <mat-tab label="Übersicht">
          <div class="tab-content">
            <div class="detail-grid">
              <ng-container *ngFor="let item of getOverviewItems()">
                <div class="detail-item" *ngIf="item.value">
                  <span class="detail-label">{{ item.label }}:</span>
                  <span class="detail-value">{{ item.value }}</span>
                </div>
              </ng-container>
            </div>
          </div>
        </mat-tab>

        <!-- JSON Tab -->
        <mat-tab label="Raw Data">
          <div class="tab-content">
            <pre class="json-display">{{ data | json }}</pre>
          </div>
        </mat-tab>

        <!-- History Tab (für Entities) -->
        <mat-tab label="Verlauf" *ngIf="data.entityId && !data.serviceId">
          <div class="tab-content">
            <div *ngIf="loadingHistory" class="loading-container">
              <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
            </div>
            <div *ngIf="!loadingHistory && history.length === 0" class="empty-message">
              Kein Verlauf verfügbar
            </div>
            <div *ngIf="!loadingHistory && history.length > 0" class="history-list">
              <div *ngFor="let entry of history" class="history-item">
                <span class="history-time">{{ entry.createdAt | date: 'medium' }}</span>
                <span class="history-state">State: {{ entry.state }}</span>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 20px;
      min-width: 500px;
      max-height: 600px;
      overflow: auto;
    }

    .detail-header {
      margin-bottom: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      mat-card-title, mat-card-subtitle {
        color: white;
      }
    }

    .tab-content {
      padding: 20px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;

      .detail-label {
        font-weight: 600;
        color: #333;
        font-size: 12px;
        text-transform: uppercase;
      }

      .detail-value {
        color: #666;
        word-break: break-word;
        margin-top: 4px;
      }
    }

    .json-display {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      overflow: auto;
      max-height: 400px;
      font-size: 12px;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }

    .empty-message {
      text-align: center;
      padding: 32px;
      color: #999;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .history-item {
      display: flex;
      gap: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;
      border-left: 3px solid #667eea;

      .history-time {
        font-weight: 600;
        color: #667eea;
        min-width: 180px;
      }

      .history-state {
        color: #666;
      }
    }
  `],
})
export class HaDetailDialogComponent implements OnInit {
  history: any[] = [];
  loadingHistory = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private haService: HomeAssistantService
  ) {}

  ngOnInit(): void {
    if (this.data.entityId) {
      this.loadHistory();
    }
  }

  private async loadHistory(): Promise<void> {
    this.loadingHistory = true;
    try {
      this.history = await firstValueFrom(
        this.haService.getEntityHistory(this.data.entityId)
      );
    } catch (error) {
      console.error('Fehler beim Laden des Verlaufs:', error);
      this.history = [];
    } finally {
      this.loadingHistory = false;
    }
  }

  getTitle(): string {
    return (
      this.data.friendlyName ||
      this.data.name ||
      this.data.alias ||
      this.data.entityId ||
      this.data.deviceId ||
      this.data.areaId ||
      'Details'
    );
  }

  getSubtitle(): string {
    if (this.data.entityType) return `Type: ${this.data.entityType}`;
    if (this.data.domain) return `Domain: ${this.data.domain}`;
    if (this.data.manufacturer) return `${this.data.manufacturer} ${this.data.model || ''}`.trim();
    return '';
  }

  getOverviewItems(): { label: string; value: string }[] {
    const items: { label: string; value: string }[] = [];

    // Entity-spezifische Felder
    if (this.data.entityId) {
      items.push({ label: 'Entity ID', value: this.data.entityId });
      items.push({ label: 'Type', value: this.data.entityType });
      items.push({ label: 'Domain', value: this.data.domain });
      items.push({ label: 'Object ID', value: this.data.objectId });
    }

    // Device-spezifische Felder
    if (this.data.deviceId) {
      items.push({ label: 'Device ID', value: this.data.deviceId });
      items.push({ label: 'Name', value: this.data.name });
      items.push({ label: 'Manufacturer', value: this.data.manufacturer });
      items.push({ label: 'Model', value: this.data.model });
      items.push({ label: 'Software Version', value: this.data.swVersion });
    }

    // Area-spezifische Felder
    if (this.data.areaId) {
      items.push({ label: 'Area ID', value: this.data.areaId });
      items.push({ label: 'Name', value: this.data.name });
      items.push({ label: 'Floor', value: this.data.floor });
      items.push({ label: 'Icon', value: this.data.icon });
    }

    // Automation-spezifische Felder
    if (this.data.automationId) {
      items.push({ label: 'Automation ID', value: this.data.automationId });
      items.push({ label: 'Alias', value: this.data.alias });
      items.push({ label: 'Description', value: this.data.description });
      items.push({ label: 'Mode', value: this.data.mode });
      items.push({ label: 'Current', value: String(this.data.current) });
      items.push({ label: 'Max', value: String(this.data.max) });
    }

    // Zone-spezifische Felder
    if (this.data.zoneId) {
      items.push({ label: 'Zone ID', value: this.data.zoneId });
      items.push({ label: 'Name', value: this.data.name });
      items.push({ label: 'Latitude', value: String(this.data.latitude) });
      items.push({ label: 'Longitude', value: String(this.data.longitude) });
      items.push({ label: 'Radius (m)', value: String(this.data.radius) });
      items.push({ label: 'Icon', value: this.data.icon });
      items.push({ label: 'Passive', value: this.data.passive ? 'Ja' : 'Nein' });
    }

    // Allgemeine Felder
    if (this.data.createdAt) {
      items.push({
        label: 'Created',
        value: new Date(this.data.createdAt).toLocaleString('de-DE'),
      });
    }
    if (this.data.updatedAt) {
      items.push({
        label: 'Updated',
        value: new Date(this.data.updatedAt).toLocaleString('de-DE'),
      });
    }

    return items.filter((item) => item.value);
  }
}

