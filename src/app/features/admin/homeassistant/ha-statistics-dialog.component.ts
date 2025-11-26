import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { HomeAssistantService } from '../../../core/services/homeassistant.service';

@Component({
  selector: 'app-ha-statistics-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatIconModule,
  ],
  template: `
    <div class="dialog-container">
      <mat-card class="stats-header">
        <mat-card-header>
          <mat-card-title>Statistiken - {{ title }}</mat-card-title>
        </mat-card-header>
      </mat-card>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>

      <div *ngIf="!loading" class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Gesamtanzahl</div>
          <div class="stat-value">{{ totalCount }}</div>
        </div>

        <div class="stat-card" *ngFor="let stat of stats">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value">{{ stat.value }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 20px;
      min-width: 400px;
    }

    .stats-header {
      margin-bottom: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      mat-card-title {
        color: white;
        margin: 0;
      }
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }

    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      .stat-label {
        font-size: 12px;
        text-transform: uppercase;
        opacity: 0.9;
        margin-bottom: 8px;
      }

      .stat-value {
        font-size: 28px;
        font-weight: bold;
      }
    }
  `],
})
export class HaStatisticsDialogComponent implements OnInit {
  stats: { label: string; value: number }[] = [];
  totalCount = 0;
  loading = false;
  title = 'Statistics';

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
      const stats = await firstValueFrom(this.haService.getStatistics());
      this.processStatistics(stats);
    } catch (error) {
      console.error('Fehler beim Laden von Statistiken:', error);
    } finally {
      this.loading = false;
    }
  }

  private processStatistics(stats: any): void {
    if (!stats) return;

    // Title setzen based on data type
    if (stats.totalEntities) {
      this.title = 'Entities';
      this.totalCount = stats.totalEntities;
      const entitiesByType = stats.entitiesByType || {};
      this.stats = Object.entries(entitiesByType).map(([type, count]: [string, any]) => ({
        label: type,
        value: count,
      }));
    } else if (stats.totalDevices) {
      this.title = 'Devices';
      this.totalCount = stats.totalDevices;
      const devicesByManufacturer = stats.devicesByManufacturer || {};
      this.stats = Object.entries(devicesByManufacturer)
        .slice(0, 5)
        .map(([manufacturer, count]: [string, any]) => ({
          label: manufacturer,
          value: count,
        }));
    } else if (stats.totalAreas) {
      this.title = 'Areas';
      this.totalCount = stats.totalAreas;
    } else {
      // Generic handling
      this.totalCount = stats.total || Object.keys(stats).length;
      this.stats = Object.entries(stats)
        .filter(([key]) => key !== 'total')
        .map(([key, value]: [string, any]) => ({
          label: key,
          value: typeof value === 'number' ? value : 1,
        }));
    }
  }
}

