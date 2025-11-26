import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { HomeAssistantService } from '../../../core/services/homeassistant.service';

interface StatItem {
  label: string;
  value: number | string;
  icon?: string;
  color?: string;
}

@Component({
  selector: 'app-ha-statistics-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatIconModule,
  ],
  template: `
    <div class="dialog-container">
      <mat-card class="stats-header">
        <mat-card-header>
          <mat-card-title>{{ title }}</mat-card-title>
          <mat-card-subtitle>Übersicht der Home Assistant Daten</mat-card-subtitle>
        </mat-card-header>
      </mat-card>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>

      <div *ngIf="!loading && stats.length > 0" class="stats-content">
        <!-- Hauptstatistiken in großen Cards -->
        <div class="main-stats">
          <div class="main-stat-card" *ngFor="let stat of mainStats">
            <div class="stat-icon-container">
              <mat-icon [color]="stat.color">{{ stat.icon }}</mat-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">{{ stat.label }}</div>
              <div class="stat-value">{{ stat.value }}</div>
            </div>
          </div>
        </div>

        <!-- Detaillierte Statistiken wenn vorhanden -->
        <div *ngIf="detailStats.length > 0" class="detail-stats">
          <h3>Detaillierte Aufschlüsselung</h3>
          <mat-divider></mat-divider>
          <div class="detail-grid">
            <div class="detail-item" *ngFor="let item of detailStats">
              <span class="detail-label">{{ item.label }}</span>
              <span class="detail-value">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && stats.length === 0" class="empty-message">
        Keine Statistiken verfügbar
      </div>
    </div>
  `,
  styles: [`
    @use '../../../../styles/tokens' as t;

    .dialog-container {
      padding: t.$spacing-4;
      min-width: 450px;
      max-height: 600px;
      overflow: auto;
    }

    .stats-header {
      margin-bottom: t.$spacing-4;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: t.$text-inverse;

      mat-card-title {
        color: t.$text-inverse;
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }

      mat-card-subtitle {
        color: rgba(255, 255, 255, 0.8);
        margin-top: t.$spacing-1;
      }
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }

    .stats-content {
      display: flex;
      flex-direction: column;
      gap: t.$spacing-4;
    }

    .main-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: t.$spacing-3;
    }

    .main-stat-card {
      display: flex;
      align-items: center;
      gap: t.$spacing-3;
      padding: t.$spacing-3;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: t.$text-inverse;
      border-radius: t.$radius-sm;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      .stat-icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }
      }

      .stat-info {
        display: flex;
        flex-direction: column;

        .stat-label {
          font-size: 12px;
          opacity: 0.8;
          text-transform: uppercase;
          font-weight: 500;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
        }
      }
    }

    .detail-stats {
      padding: t.$spacing-3;
      background: t.$color-highlight;
      border-radius: t.$radius-sm;

      h3 {
        margin: 0 0 t.$spacing-2 0;
        color: t.$text-default;
        font-size: 14px;
        font-weight: 600;
      }

      mat-divider {
        margin-bottom: t.$spacing-3;
      }
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: t.$spacing-2;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      padding: t.$spacing-2;
      background: t.$surface;
      border-radius: t.$radius-sm;
      border-left: 2px solid t.$color-primary-dark;

      .detail-label {
        font-size: 11px;
        color: t.$text-muted;
        text-transform: uppercase;
        font-weight: 500;
      }

      .detail-value {
        font-size: 18px;
        font-weight: 700;
        color: t.$text-default;
        margin-top: t.$spacing-1;
      }
    }

    .empty-message {
      text-align: center;
      padding: t.$spacing-5;
      color: t.$text-muted;
      font-size: 14px;
    }
  `],
})
export class HaStatisticsDialogComponent implements OnInit {
  title = 'Statistiken';
  mainStats: StatItem[] = [];
  detailStats: StatItem[] = [];
  stats: any[] = []; // Cache für stats Überprüfung
  loading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private haService: HomeAssistantService
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  private async loadStatistics(): Promise<void> {
    this.loading = true;
    try {
      const statistics = await firstValueFrom(this.haService.getStatistics());
      this.processStatistics(statistics);
    } catch (error) {
      console.error('Fehler beim Laden von Statistiken:', error);
      this.stats = [];
    } finally {
      this.loading = false;
    }
  }

  private processStatistics(data: any): void {
    this.mainStats = [];
    this.detailStats = [];

    if (!data) return;

    // Hauptstatistiken (immer anzeigen)
    if (data.totalEntities !== undefined) {
      this.title = 'Entities Statistiken';
      this.mainStats.push({
        label: 'Gesamt Entities',
        value: data.totalEntities,
        icon: 'sensors',
        color: 'primary',
      });
      this.stats.push({ label: 'totalEntities', value: data.totalEntities });
    }

    if (data.totalDevices !== undefined) {
      this.mainStats.push({
        label: 'Devices',
        value: data.totalDevices,
        icon: 'devices',
        color: 'accent',
      });
      this.stats.push({ label: 'totalDevices', value: data.totalDevices });
    }

    if (data.totalAreas !== undefined) {
      this.mainStats.push({
        label: 'Areas',
        value: data.totalAreas,
        icon: 'domain',
        color: 'warn',
      });
      this.stats.push({ label: 'totalAreas', value: data.totalAreas });
    }

    if (data.totalAutomations !== undefined) {
      this.mainStats.push({
        label: 'Automations',
        value: data.totalAutomations,
        icon: 'automation',
        color: 'primary',
      });
      this.stats.push({ label: 'totalAutomations', value: data.totalAutomations });
    }

    if (data.totalPersons !== undefined) {
      this.mainStats.push({
        label: 'Persons',
        value: data.totalPersons,
        icon: 'person',
      });
      this.stats.push({ label: 'totalPersons', value: data.totalPersons });
    }

    if (data.totalZones !== undefined) {
      this.mainStats.push({
        label: 'Zones',
        value: data.totalZones,
        icon: 'location_on',
      });
      this.stats.push({ label: 'totalZones', value: data.totalZones });
    }

    if (data.totalMediaPlayers !== undefined) {
      this.mainStats.push({
        label: 'Media Player',
        value: data.totalMediaPlayers,
        icon: 'theaters',
      });
      this.stats.push({ label: 'totalMediaPlayers', value: data.totalMediaPlayers });
    }

    if (data.totalServices !== undefined) {
      this.mainStats.push({
        label: 'Services',
        value: data.totalServices,
        icon: 'miscellaneous_services',
      });
      this.stats.push({ label: 'totalServices', value: data.totalServices });
    }

    // Detaillierte Aufschlüsselung (z.B. entitiesByType)
    if (data.entitiesByType && Array.isArray(data.entitiesByType)) {
      data.entitiesByType.forEach((item: any) => {
        if (item.type && item.count) {
          this.detailStats.push({
            label: `${item.type}`,
            value: item.count,
          });
        }
      });
    }

    // Fallback: Wenn entitiesByType ein Object ist
    if (data.entitiesByType && typeof data.entitiesByType === 'object' && !Array.isArray(data.entitiesByType)) {
      Object.entries(data.entitiesByType).forEach(([key, value]: [string, any]) => {
        this.detailStats.push({
          label: key,
          value: value,
        });
      });
    }
  }
}

