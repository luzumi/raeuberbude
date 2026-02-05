import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { firstValueFrom } from 'rxjs';

import { HeaderComponent } from '@shared/components/header/header.component';
import { GenericDataTableComponent } from '@shared/components/generic-data-table/generic-data-table.component';
import {
  DataTableColumn,
  DataTableConfig,
  DataTableRowAction,
} from '@shared/components/generic-data-table/generic-data-table.config';
import { AuthService } from '@services/auth.service';
import { HomeAssistantService as HaWsService } from '@services/home-assistant/home-assistant.service';
import { HomeAssistantService as HaDbService } from '../../../../core/services/homeassistant.service';

interface FlurEntityRow {
  entityId: string;
  friendlyName: string;
  domain: string;
  areaId?: string;
  assignedRoomId?: string;
  assignedRoomName?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  labelsText: string;
  lastAction?: string;
  lastActionAt?: string;
}

interface DeviceAnnotation {
  roomId?: string;
  userId?: string;
  labels?: string[];
  lastAction?: string;
  lastActionAt?: string;
}

interface UserOption {
  id: string;
  label: string;
}

interface AreaOption {
  id: string;
  label: string;
}

interface GroupTab {
  key: string;
  label: string;
  config: DataTableConfig<FlurEntityRow>;
}

interface GroupDef {
  key: string;
  label: string;
  domains: string[];
}

const STORAGE_KEY = 'flur-device-annotations';

const GROUP_DEFS: GroupDef[] = [
  { key: 'lighting', label: 'Beleuchtung', domains: ['light'] },
  { key: 'switches', label: 'Schalter', domains: ['switch', 'input_boolean'] },
  { key: 'covers', label: 'Beschattung', domains: ['cover'] },
  { key: 'climate', label: 'Klima', domains: ['climate', 'fan'] },
  { key: 'media', label: 'Medien', domains: ['media_player'] },
  { key: 'security', label: 'Sicherheit', domains: ['lock'] },
  { key: 'automation', label: 'Automationen', domains: ['automation', 'script', 'scene'] },
  { key: 'buttons', label: 'Buttons', domains: ['button'] },
];

const ON_OFF_DOMAINS = new Set([
  'light',
  'switch',
  'fan',
  'media_player',
  'climate',
  'automation',
  'input_boolean',
]);

const TURN_ON_ONLY_DOMAINS = new Set(['script', 'scene']);
const OPEN_CLOSE_DOMAINS = new Set(['cover']);
const LOCK_DOMAINS = new Set(['lock']);
const PRESS_DOMAINS = new Set(['button']);

@Component({
  selector: 'app-flur',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    GenericDataTableComponent,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: './flur.component.html',
  styleUrls: ['./flur.component.scss'],
})
export class FlurComponent implements OnInit {
  @ViewChild('roomTemplate', { static: true }) roomTemplate!: TemplateRef<any>;
  @ViewChild('userTemplate', { static: true }) userTemplate!: TemplateRef<any>;
  @ViewChild('labelsTemplate', { static: true }) labelsTemplate!: TemplateRef<any>;

  userName = '';
  loading = false;

  areas: AreaOption[] = [];
  users: UserOption[] = [];

  groupTabs: GroupTab[] = [];

  private annotations: Record<string, DeviceAnnotation> = {};
  private tableColumns: DataTableColumn<FlurEntityRow>[] = [];
  private rowActions: DataTableRowAction<FlurEntityRow>[] = [];
  private readonly apiBase: string;
  private readonly areaById = new Map<string, AreaOption>();
  private readonly userById = new Map<string, UserOption>();
  private readonly domainToGroupKey = new Map<string, string>(
    GROUP_DEFS.flatMap(def => def.domains.map(domain => [domain, def.key] as const))
  );

  constructor(
    private readonly auth: AuthService,
    private readonly haDb: HaDbService,
    private readonly haWs: HaWsService,
    private readonly http: HttpClient,
    private readonly snackBar: MatSnackBar,
  ) {
    const host = (globalThis as any)?.location?.hostname || 'localhost';
    this.apiBase = `http://${host}:3001`;
  }

  ngOnInit(): void {
    this.userName = this.auth.getUserName();
    this.loadAnnotations();
    this.initColumns();
    this.initRowActions();
    this.loading = true;
    this.groupTabs = [
      { key: 'all', label: 'Alle', config: this.createTableConfig([]) },
    ];
    this.loadData().catch(err => console.error('[Flur] loadData failed', err));
  }

  async loadData(): Promise<void> {
    this.setLoading(true);
    try {
      const [areas, users, entities] = await Promise.all([
        this.loadAreas(),
        this.loadUsers(),
        this.loadEntities(),
      ]);
      this.areas = areas;
      this.users = users;
      this.areaById.clear();
      this.userById.clear();
      for (const area of areas) this.areaById.set(area.id, area);
      for (const user of users) this.userById.set(user.id, user);

      const rows = this.buildRows(entities);
      this.groupTabs = this.buildGroupTabs(rows);
    } catch (error) {
      console.error('[Flur] Failed to load data:', error);
      this.showMessage('Fehler beim Laden der Daten', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  onRoomChange(row: FlurEntityRow): void {
    const roomId = row.assignedRoomId || '';
    row.assignedRoomName = this.areaById.get(roomId)?.label || '';
    this.updateAnnotation(row.entityId, { roomId: roomId || undefined });
  }

  onUserChange(row: FlurEntityRow): void {
    const userId = row.assignedUserId || '';
    row.assignedUserName = this.userById.get(userId)?.label || '';
    this.updateAnnotation(row.entityId, { userId: userId || undefined });
  }

  onLabelsBlur(row: FlurEntityRow): void {
    const labels = this.parseLabels(row.labelsText);
    row.labelsText = labels.join(', ');
    this.updateAnnotation(row.entityId, { labels });
  }

  private initColumns(): void {
    this.tableColumns = [
      { field: 'friendlyName', header: 'Name', sortable: true, filterable: true },
      { field: 'entityId', header: 'Entity ID', sortable: true, filterable: true },
      { field: 'domain', header: 'Domain', sortable: true, filterable: true },
      {
        field: 'assignedRoomName',
        header: 'Raum',
        type: 'custom',
        template: this.roomTemplate,
        sortable: true,
        filterable: true,
      },
      {
        field: 'assignedUserName',
        header: 'Benutzer',
        type: 'custom',
        template: this.userTemplate,
        sortable: true,
        filterable: true,
      },
      {
        field: 'labelsText',
        header: 'Bezeichner',
        type: 'custom',
        template: this.labelsTemplate,
        sortable: true,
        filterable: true,
      },
      { field: 'lastAction', header: 'Signal', sortable: true },
      { field: 'lastActionAt', header: 'Zeit', type: 'date', sortable: true },
    ];
  }

  private initRowActions(): void {
    this.rowActions = [
      {
        icon: 'toggle_on',
        tooltip: 'Einschalten',
        color: 'primary',
        action: row => this.triggerAction(row, 'turn_on', 'on'),
        visible: row => this.canTurnOn(row.domain),
      },
      {
        icon: 'toggle_off',
        tooltip: 'Ausschalten',
        color: 'warn',
        action: row => this.triggerAction(row, 'turn_off', 'off'),
        visible: row => this.canTurnOff(row.domain),
      },
      {
        icon: 'north',
        tooltip: 'Oeffnen',
        action: row => this.triggerAction(row, 'open_cover', 'open'),
        visible: row => OPEN_CLOSE_DOMAINS.has(row.domain),
      },
      {
        icon: 'south',
        tooltip: 'Schliessen',
        action: row => this.triggerAction(row, 'close_cover', 'close'),
        visible: row => OPEN_CLOSE_DOMAINS.has(row.domain),
      },
      {
        icon: 'lock',
        tooltip: 'Sperren',
        action: row => this.triggerAction(row, 'lock', 'lock'),
        visible: row => LOCK_DOMAINS.has(row.domain),
      },
      {
        icon: 'lock_open',
        tooltip: 'Entsperren',
        action: row => this.triggerAction(row, 'unlock', 'unlock'),
        visible: row => LOCK_DOMAINS.has(row.domain),
      },
      {
        icon: 'touch_app',
        tooltip: 'Druecken',
        action: row => this.triggerAction(row, 'press', 'press'),
        visible: row => PRESS_DOMAINS.has(row.domain),
      },
    ];
  }

  private canTurnOn(domain: string): boolean {
    return ON_OFF_DOMAINS.has(domain) || TURN_ON_ONLY_DOMAINS.has(domain);
  }

  private canTurnOff(domain: string): boolean {
    return ON_OFF_DOMAINS.has(domain);
  }

  private triggerAction(row: FlurEntityRow, service: string, signal: string): void {
    if (!row.entityId || !row.domain) {
      this.showMessage('Ungueltige Entitaet', 'error');
      return;
    }

    this.haWs.callService(row.domain, service, { entity_id: row.entityId }).subscribe({
      next: (res: any) => {
        if (res && res.success === false) {
          this.showMessage('Aktion abgelehnt', 'error');
          return;
        }
        this.recordSignal(row, signal);
      },
      error: (err) => {
        console.error('[Flur] Action failed:', err);
        this.showMessage('Aktion fehlgeschlagen', 'error');
      }
    });
  }

  private recordSignal(row: FlurEntityRow, signal: string): void {
    const timestamp = new Date().toISOString();
    row.lastAction = signal;
    row.lastActionAt = timestamp;
    this.updateAnnotation(row.entityId, { lastAction: signal, lastActionAt: timestamp });
    this.showMessage(`Signal "${signal}" gesetzt`, 'success');
  }

  private parseLabels(input: string): string[] {
    if (!input) return [];
    const labels = input
      .split(',')
      .map(label => label.trim())
      .filter(Boolean);
    return Array.from(new Set(labels));
  }

  private buildRows(entities: any[]): FlurEntityRow[] {
    const rows: FlurEntityRow[] = [];
    for (const entity of entities) {
      const entityId = this.getEntityId(entity);
      if (!entityId) continue;

      const domain = this.getDomain(entity, entityId);
      const friendlyName = this.getFriendlyName(entity, entityId);
      const areaId = entity.areaId || entity.area?.areaId || entity.area_id || '';
      const baseRoomName = entity.area?.name || this.areaById.get(areaId)?.label || '';
      const annotation = this.annotations[entityId] || {};

      const assignedRoomId = annotation.roomId || areaId || '';
      const assignedRoomName = this.areaById.get(assignedRoomId)?.label || baseRoomName || '';
      const assignedUserId = annotation.userId || '';
      const assignedUserName = this.userById.get(assignedUserId)?.label || '';

      const labels = annotation.labels && annotation.labels.length
        ? annotation.labels
        : friendlyName ? [friendlyName] : [];
      const labelsText = labels.join(', ');

      rows.push({
        entityId,
        friendlyName,
        domain,
        areaId: areaId || undefined,
        assignedRoomId: assignedRoomId || undefined,
        assignedRoomName,
        assignedUserId: assignedUserId || undefined,
        assignedUserName,
        labelsText,
        lastAction: annotation.lastAction,
        lastActionAt: annotation.lastActionAt,
      });
    }
    return rows;
  }

  private buildGroupTabs(rows: FlurEntityRow[]): GroupTab[] {
    const tabs: GroupTab[] = [];
    const groups = new Map<string, FlurEntityRow[]>();
    for (const row of rows) {
      const key = this.domainToGroupKey.get(row.domain) || 'other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    tabs.push({
      key: 'all',
      label: `Alle (${rows.length})`,
      config: this.createTableConfig(rows),
    });

    for (const def of GROUP_DEFS) {
      const groupRows = groups.get(def.key) || [];
      if (!groupRows.length) continue;
      tabs.push({
        key: def.key,
        label: `${def.label} (${groupRows.length})`,
        config: this.createTableConfig(groupRows),
      });
    }

    const otherRows = groups.get('other') || [];
    if (otherRows.length) {
      tabs.push({
        key: 'other',
        label: `Sonstiges (${otherRows.length})`,
        config: this.createTableConfig(otherRows),
      });
    }

    return tabs;
  }

  private createTableConfig(rows: FlurEntityRow[]): DataTableConfig<FlurEntityRow> {
    return {
      columns: this.tableColumns,
      data: rows,
      pagination: {
        enabled: true,
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
      },
      search: {
        enabled: true,
        placeholder: 'Geraete durchsuchen...',
      },
      toolbarButtons: [
        {
          label: 'Aktualisieren',
          icon: 'refresh',
          action: () => this.loadData(),
          tooltip: 'Daten neu laden',
        },
      ],
      rowActions: this.rowActions,
      stickyHeader: true,
      emptyMessage: 'Keine Geraete gefunden',
      loading: this.loading,
    };
  }

  private getEntityId(entity: any): string {
    return entity?.entityId || entity?.entity_id || '';
  }

  private getDomain(entity: any, entityId: string): string {
    return (entity?.domain || entity?.entityType || entityId.split('.')[0] || '').toLowerCase();
  }

  private getFriendlyName(entity: any, entityId: string): string {
    return entity?.friendlyName || entity?.friendly_name || entityId;
  }

  private async loadEntities(): Promise<any[]> {
    const response = await firstValueFrom(this.haDb.getAllEntities());
    if (Array.isArray(response)) return response;
    return response?.entities || [];
  }

  private async loadAreas(): Promise<AreaOption[]> {
    const response = await firstValueFrom(this.haDb.getAllAreas());
    const areas = Array.isArray(response) ? response : response?.areas || [];
    return areas
      .map((area: any) => ({
        id: area.areaId || area.area_id,
        label: area.name || area.area_id || 'Unbekannt',
      }))
      .filter((area: AreaOption) => !!area.id);
  }

  private async loadUsers(): Promise<UserOption[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<any[]>(`${this.apiBase}/users`, { withCredentials: true })
      );
      const users = Array.isArray(response) ? response : response?.data || [];
      return users
        .map((user: any) => ({
          id: user._id || user.id || user.userId,
          label: user.username || user.email || user.name || user._id || user.id,
        }))
        .filter((user: UserOption) => !!user.id);
    } catch (error) {
      console.error('[Flur] Failed to load users:', error);
      this.showMessage('Benutzer konnten nicht geladen werden', 'error');
      return [];
    }
  }

  private loadAnnotations(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.annotations = parsed && typeof parsed === 'object' ? parsed : {};
      }
    } catch (error) {
      console.warn('[Flur] Failed to parse annotations:', error);
      this.annotations = {};
    }
  }

  private updateAnnotation(entityId: string, patch: Partial<DeviceAnnotation>): void {
    const current = this.annotations[entityId] || {};
    this.annotations[entityId] = { ...current, ...patch };
    this.persistAnnotations();
  }

  private persistAnnotations(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.annotations));
    } catch (error) {
      console.warn('[Flur] Failed to persist annotations:', error);
    }
  }

  private setLoading(loading: boolean): void {
    this.loading = loading;
    for (const tab of this.groupTabs) {
      tab.config.loading = loading;
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const panelClass =
      type === 'success' ? 'snack-success' : type === 'error' ? 'snack-error' : 'snack-info';
    this.snackBar.open(message, 'Schliessen', {
      duration: 2500,
      panelClass,
    });
  }
}
