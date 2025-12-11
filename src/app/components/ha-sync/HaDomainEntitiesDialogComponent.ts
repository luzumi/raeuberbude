// typescript
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HomeAssistantService } from '../../core/services/homeassistant.service';
import { firstValueFrom } from 'rxjs';

export interface DomainCount {
  domain: string;
  count: number;
}

export interface HaDomainDialogData {
  domains: DomainCount[];
  selectedDomain?: string;
}

@Component({
  selector: 'app-ha-domain-entities-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTableModule, MatProgressSpinnerModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>Entities nach Domain</h2>
        <button mat-icon-button (click)="close()"><mat-icon>close</mat-icon></button>
      </div>

      <div class="domain-buttons">
        <button
          mat-stroked-button
          *ngFor="let d of domains"
          [class.selected]="d.domain === selectedDomain"
          (click)="selectDomain(d.domain)">
          <span class="domain-name">{{ d.domain }}</span>
          <span class="domain-count">{{ d.count }}</span>
        </button>
      </div>

      <div class="content">
        <div *ngIf="isLoading" class="spinner">
          <mat-progress-spinner diameter="36" mode="indeterminate"></mat-progress-spinner>
        </div>

        <table mat-table [dataSource]="dataSource" *ngIf="!isLoading && entities && entities.length > 0" class="entity-table">
          <ng-container matColumnDef="entity_id">
            <th mat-header-cell *matHeaderCellDef>Entity</th>
            <td mat-cell *matCellDef="let e">{{ e.entity_id || e.entityId || (e.domain && e.objectId ? (e.domain + '.' + e.objectId) : e.objectId) }}</td>
          </ng-container>

          <ng-container matColumnDef="friendly_name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let e">{{ e.friendly_name || e.friendlyName || e.originalName || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="state">
            <th mat-header-cell *matHeaderCellDef>Zustand</th>
            <td mat-cell *matCellDef="let e">{{ e.state }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let _row; columns: displayedColumns;"></tr>
        </table>

        <!-- Debug view: show normalized entities for quick inspection -->
        <pre *ngIf="!isLoading && entities && entities.length > 0" style="max-height:200px; overflow:auto; background:#f6f8fa; padding:8px; border-radius:4px;">{{ entities | json }}</pre>

        <div *ngIf="!isLoading && (!entities || entities.length === 0)" class="empty">
          Keine Entities für die ausgewählte Domain.
        </div>

        <!-- Raw response debug view: show the last raw response from the service -->
        <div *ngIf="!isLoading && lastRawResponse" class="raw-response">
          <h3>Rohdaten der letzten Antwort:</h3>
          <pre style="max-height:200px; overflow:auto; background:#f6f8fa; padding:8px; border-radius:4px;">{{ lastRawResponse | json }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container { padding: 16px; max-height: 80vh; display: flex; flex-direction: column; gap: 12px; }
    .dialog-header { display:flex; align-items:center; justify-content:space-between; }
    .domain-buttons { display:flex; flex-wrap:wrap; gap:8px; }
    .domain-buttons button { display:flex; align-items:center; gap:8px; padding:8px 12px; }
    .domain-buttons button.selected { border-color: #667eea; background: rgba(102,126,234,0.06); transform: translateY(-2px); }
    .content { min-height: 120px; }
    .spinner { display:flex; justify-content:center; padding:24px 0; }
    .entity-table { width:100%; }
    .empty { color:#666; padding:12px 0; text-align:center; }
    .raw-response { margin-top: 16px; padding: 12px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; }
  `]
})
export class HaDomainEntitiesDialogComponent implements OnInit {
  domains: DomainCount[] = [];
  selectedDomain?: string;
  entities: any[] = [];
  dataSource = new MatTableDataSource<any>([]);
  lastRawResponse: any = null;
  displayedColumns = ['entity_id', 'friendly_name', 'state'];
  isLoading = false;

  constructor(
    private readonly haService: HomeAssistantService,
    private readonly dialogRef: MatDialogRef<HaDomainEntitiesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HaDomainDialogData
  ) {
    this.domains = data?.domains || [];
    this.selectedDomain = data?.selectedDomain;
  }

  ngOnInit(): void {
    if (this.selectedDomain) {
      this.loadEntities(this.selectedDomain);
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  selectDomain(domain: string): void {
    if (this.selectedDomain === domain) return;
    this.selectedDomain = domain;
    this.loadEntities(domain);
  }

  // helper to normalise different service responses to an array of entities
  private extractEntities(resp: any): any[] {
    if (!resp) return [];
    let arr: any[];
    if (Array.isArray(resp)) arr = resp;
    else if (Array.isArray(resp.entities)) arr = resp.entities;
    else if (typeof resp === 'object') arr = Object.values(resp);
    else arr = [];

    // map various field names to a consistent shape expected by the template
    return arr.map(e => this.normalizeEntity(e));
  }

  // map different API shapes to a common entity shape used by the template
  private normalizeEntity(e: any): any {
    if (!e || typeof e !== 'object') return e;

    const entityId = e.entity_id ?? e.entityId ?? (e.domain && e.objectId ? `${e.domain}.${e.objectId}` : undefined) ?? e.objectId ?? '';

    const friendlyName = e.attributes?.friendly_name ?? e.attributes?.friendlyName ?? e.friendlyName ?? e.friendly_name ?? e.originalName ?? '';

    const state = e.state ?? e.current_state ?? e.stateValue ?? '-';

    // Preserve original object for other usages but expose normalized quick-access fields
    return {
      ...e,
      entity_id: entityId,
      friendly_name: friendlyName,
      state
    };
  }

  private async loadEntities(domain: string): Promise<void> {
     this.isLoading = true;
     this.entities = [];
     try {
      // Versuche zuerst eine spezifische Methode, sonst lade alle Entities und filtere nach Domain
      const svc: any = this.haService as any;

      if (typeof svc.getEntitiesByDomain === 'function') {
        const resp = await firstValueFrom(svc.getEntitiesByDomain(domain)) as any;
        // save raw response for debugging
        this.lastRawResponse = resp;
        // Erwartet entweder { entities: [...] } oder direkt Array
        const arr = this.extractEntities(resp);
        console.debug('getEntitiesByDomain -> extracted', arr.length, arr.slice(0,3));
        this.entities = arr;
        this.dataSource.data = this.entities;
      } else if (typeof svc.getAllEntities === 'function') {
        const all = await firstValueFrom(svc.getAllEntities()) as any;
        this.lastRawResponse = all;
        const arr = this.extractEntities(all);
        console.debug('getAllEntities -> extracted', arr.length, arr.slice(0,3));
        this.entities = arr.filter((e: any) => (e.entity_id || '').startsWith(domain + '.'));
        this.dataSource.data = this.entities;
      } else if (typeof svc.getEntities === 'function') {
        const all = await firstValueFrom(svc.getEntities()) as any;
        this.lastRawResponse = all;
        const arr = this.extractEntities(all);
        console.debug('getEntities -> extracted', arr.length, arr.slice(0,3));
        this.entities = arr.filter((e: any) => (e.entity_id || '').startsWith(domain + '.'));
        this.dataSource.data = this.entities;
      } else {
        console.warn('HomeAssistantService bietet keine passenden Methoden: getEntitiesByDomain/getAllEntities/getEntities');
        this.entities = [];
        this.dataSource.data = [];
       }
       console.debug('final entities count', this.entities.length);
     } catch (err) {
       console.error('Fehler beim Laden der Entities:', err);
       this.entities = [];
       this.dataSource.data = [];
     } finally {
       this.isLoading = false;
     }
   }
 }
