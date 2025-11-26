import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { lastValueFrom } from 'rxjs';
import { resolveBackendBase } from '../../../core/utils/backend';
import { environment } from '../../../../environments/environment';

interface Transcript {
  _id: string;
  userId: string;
  terminalId?: string;
  transcript: string;
  sttConfidence: number;
  aiAdjustedText?: string;
  category?: string;
  createdAt: string;
  assignedAreaId?: string;
  assignedEntityId?: string;
  assignedAction?: {
    type: string;
    label?: string;
    params?: any;
  };
  assignedTrigger?: string;
  assignedTriggerAt?: string;
}

interface Area {
  area_id: string;
  name: string;
  aliases?: string[];
}

interface Entity {
  entity_id: string;
  state: string;
  attributes: any;
  friendly_name?: string;
}

interface ActionDefinition {
  type: string;
  label: string;
  domain: string;
  service?: string;
  params?: ActionParam[];
}

interface ActionParam {
  name: string;
  label: string;
  type: 'number' | 'slider' | 'color' | 'select' | 'text';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: Array<{ value: any; label: string }>;
}

@Component({
  selector: 'app-admin-transcript-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatSliderModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './admin-transcript-edit-dialog.component.html',
  styleUrls: ['./admin-transcript-edit-dialog.component.scss']
})
export class AdminTranscriptEditDialogComponent implements OnInit {
  transcript: Transcript;
  aiAdjustedText = '';

  // Area selection
  areas: Area[] = [];
  filteredAreas: Area[] = [];
  selectedAreaId = '';
  areaSearchTerm = '';

  // Entity selection
  entities: Entity[] = [];
  selectedEntityId = '';
  selectedEntity: Entity | null = null;
  entitySearchTerm = '';
  isSearchingEntities = false;

  // Action selection
  availableActions: ActionDefinition[] = [];
  selectedAction: ActionDefinition | null = null;
  actionParams: Record<string, any> = {};

  // Trigger
  assignedTrigger = '';

  private readonly backendUrl = resolveBackendBase(environment.backendApiUrl || environment.apiUrl || 'http://localhost:3001');

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { transcript: Transcript },
    private readonly dialogRef: MatDialogRef<AdminTranscriptEditDialogComponent>,
    private readonly http: HttpClient,
    private readonly snackBar: MatSnackBar
  ) {
    this.transcript = { ...data.transcript };
    this.aiAdjustedText = this.transcript.aiAdjustedText || this.transcript.transcript;
    this.selectedAreaId = this.transcript.assignedAreaId || '';
    this.selectedEntityId = this.transcript.assignedEntityId || '';
    this.assignedTrigger = this.transcript.assignedTrigger || this.transcript.transcript;

    if (this.transcript.assignedAction) {
      this.actionParams = this.transcript.assignedAction.params || {};
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadAreas();

    // Load initial entities (first 20) so user has something to select from
    await this.loadInitialEntities();

    // If entity is already assigned, load it to show details and generate actions
    if (this.selectedEntityId) {
      await this.loadEntity(this.selectedEntityId);

      // If action is already assigned, restore it
      if (this.transcript.assignedAction) {
        this.selectedAction = this.availableActions.find(
          a => a.type === this.transcript.assignedAction?.type
        ) || null;
      }
    }
  }

  async loadInitialEntities(): Promise<void> {
    try {
      const response: any = await lastValueFrom(
        this.http.get(`${this.backendUrl}/api/homeassistant/entities`, {
          params: { type: 'light,switch,cover,climate,media_player,fan' },
          withCredentials: true
        })
      );

      // Get first 50 controllable entities
      const allEntities = response.entities || response || [];
      this.entities = allEntities
        .filter((e: any) => {
          const domain = e.entity_id?.split('.')[0];
          return ['light', 'switch', 'cover', 'climate', 'media_player', 'fan', 'lock', 'automation'].includes(domain);
        })
        .slice(0, 50);

      console.log('Loaded initial entities:', this.entities.length);
    } catch (error) {
      console.error('Failed to load initial entities:', error);
      // Don't show error snackbar here, user can still search
    }
  }

  async loadAreas(): Promise<void> {
    try {
      const response: any = await lastValueFrom(
        this.http.get(`${this.backendUrl}/api/homeassistant/entities/areas`, { withCredentials: true })
      );
      this.areas = response.areas || [];
      this.filteredAreas = [...this.areas];
      console.log('Loaded areas:', this.areas.length);
    } catch (error) {
      console.error('Failed to load areas:', error);
      this.snackBar.open('Fehler beim Laden der Areas', 'OK', { duration: 3000 });
    }
  }

  onAreaSearchChange(): void {
    const term = this.areaSearchTerm.toLowerCase();
    this.filteredAreas = this.areas.filter(area =>
      area.name.toLowerCase().includes(term) ||
      (area.aliases || []).some(alias => alias.toLowerCase().includes(term))
    );
  }

  selectArea(areaId: string): void {
    this.selectedAreaId = areaId;
    console.log('Selected area:', areaId);
  }

  async searchEntities(): Promise<void> {
    // If search is cleared, reload initial entities
    if (!this.entitySearchTerm || this.entitySearchTerm.length < 2) {
      await this.loadInitialEntities();
      return;
    }

    this.isSearchingEntities = true;
    try {
      const response: any = await lastValueFrom(
        this.http.get(`${this.backendUrl}/api/homeassistant/entities/search`, {
          params: { q: this.entitySearchTerm },
          withCredentials: true
        })
      );
      this.entities = response.entities || [];
      console.log('Found entities:', this.entities.length);
    } catch (error) {
      console.error('Failed to search entities:', error);
      this.snackBar.open('Fehler bei der Entitäts-Suche', 'OK', { duration: 3000 });
    } finally {
      this.isSearchingEntities = false;
    }
  }

  async selectEntity(entityId: string): Promise<void> {
    this.selectedEntityId = entityId;
    await this.loadEntity(entityId);
  }

  clearEntitySelection(): void {
    this.selectedEntity = null;
    this.selectedEntityId = '';
    this.availableActions = [];
    this.selectedAction = null;
    this.actionParams = {};
    // Reload initial entities for selection
    this.loadInitialEntities();
  }

  async loadEntity(entityId: string): Promise<void> {
    try {
      const response: any = await lastValueFrom(
        this.http.get(`${this.backendUrl}/api/homeassistant/entities/${entityId}`, { withCredentials: true })
      );
      this.selectedEntity = response;

      // Add to entities list if not already there (for display purposes)
      if (!this.entities.find(e => e.entity_id === entityId)) {
        this.entities = [response];
      }

      console.log('Loaded entity:', this.selectedEntity);

      // Generate action suggestions based on entity
      this.generateActionSuggestions();
    } catch (error) {
      console.error('Failed to load entity:', error);
      this.snackBar.open('Fehler beim Laden der Entität', 'OK', { duration: 3000 });
    }
  }

  generateActionSuggestions(): void {
    if (!this.selectedEntity) {
      this.availableActions = [];
      return;
    }

    const entityId = this.selectedEntity.entity_id;
    const domain = entityId.split('.')[0];
    const attributes = this.selectedEntity.attributes || {};
    const supportedFeatures = attributes.supported_features || 0;

    const actions: ActionDefinition[] = [];

    // Generate domain-specific actions
    switch (domain) {
      case 'light':
        actions.push({
          type: 'turn_on',
          label: 'Einschalten',
          domain: 'light',
          service: 'turn_on'
        });
        actions.push({
          type: 'turn_off',
          label: 'Ausschalten',
          domain: 'light',
          service: 'turn_off'
        });

        // Check for brightness support (bit 0)
        if (supportedFeatures & 1) {
          actions.push({
            type: 'set_brightness',
            label: 'Helligkeit einstellen',
            domain: 'light',
            service: 'turn_on',
            params: [{
              name: 'brightness_pct',
              label: 'Helligkeit',
              type: 'slider',
              min: 0,
              max: 100,
              step: 1,
              unit: '%'
            }]
          });
        }

        // Check for color support (bit 4)
        if (supportedFeatures & 16) {
          actions.push({
            type: 'set_color',
            label: 'Farbe einstellen',
            domain: 'light',
            service: 'turn_on',
            params: [{
              name: 'rgb_color',
              label: 'Farbe',
              type: 'color',
            }]
          });
        }
        break;

      case 'switch':
        actions.push({
          type: 'turn_on',
          label: 'Einschalten',
          domain: 'switch',
          service: 'turn_on'
        });
        actions.push({
          type: 'turn_off',
          label: 'Ausschalten',
          domain: 'switch',
          service: 'turn_off'
        });
        break;

      case 'cover':
        actions.push({
          type: 'open_cover',
          label: 'Öffnen',
          domain: 'cover',
          service: 'open_cover'
        });
        actions.push({
          type: 'close_cover',
          label: 'Schließen',
          domain: 'cover',
          service: 'close_cover'
        });

        if (supportedFeatures & 4) { // Position support
          actions.push({
            type: 'set_position',
            label: 'Position einstellen',
            domain: 'cover',
            service: 'set_cover_position',
            params: [{
              name: 'position',
              label: 'Position',
              type: 'slider',
              min: 0,
              max: 100,
              step: 1,
              unit: '%'
            }]
          });
        }
        break;

      case 'climate':
        actions.push({
          type: 'set_temperature',
          label: 'Temperatur einstellen',
          domain: 'climate',
          service: 'set_temperature',
          params: [{
            name: 'temperature',
            label: 'Temperatur',
            type: 'slider',
            min: attributes.min_temp || 10,
            max: attributes.max_temp || 30,
            step: 0.5,
            unit: '°C'
          }]
        });

        if (attributes.hvac_modes && Array.isArray(attributes.hvac_modes)) {
          actions.push({
            type: 'set_hvac_mode',
            label: 'Modus einstellen',
            domain: 'climate',
            service: 'set_hvac_mode',
            params: [{
              name: 'hvac_mode',
              label: 'Modus',
              type: 'select',
              options: attributes.hvac_modes.map((mode: string) => ({
                value: mode,
                label: mode
              }))
            }]
          });
        }
        break;

      case 'media_player':
        actions.push({
          type: 'turn_on',
          label: 'Einschalten',
          domain: 'media_player',
          service: 'turn_on'
        });
        actions.push({
          type: 'turn_off',
          label: 'Ausschalten',
          domain: 'media_player',
          service: 'turn_off'
        });
        actions.push({
          type: 'play',
          label: 'Abspielen',
          domain: 'media_player',
          service: 'media_play'
        });
        actions.push({
          type: 'pause',
          label: 'Pause',
          domain: 'media_player',
          service: 'media_pause'
        });

        if (supportedFeatures & 4) { // Volume support
          actions.push({
            type: 'set_volume',
            label: 'Lautstärke einstellen',
            domain: 'media_player',
            service: 'volume_set',
            params: [{
              name: 'volume_level',
              label: 'Lautstärke',
              type: 'slider',
              min: 0,
              max: 100,
              step: 1,
              unit: '%'
            }]
          });
        }
        break;

      case 'fan':
        actions.push({
          type: 'turn_on',
          label: 'Einschalten',
          domain: 'fan',
          service: 'turn_on'
        });
        actions.push({
          type: 'turn_off',
          label: 'Ausschalten',
          domain: 'fan',
          service: 'turn_off'
        });

        if (supportedFeatures & 1) { // Speed support
          actions.push({
            type: 'set_percentage',
            label: 'Geschwindigkeit einstellen',
            domain: 'fan',
            service: 'set_percentage',
            params: [{
              name: 'percentage',
              label: 'Geschwindigkeit',
              type: 'slider',
              min: 0,
              max: 100,
              step: 1,
              unit: '%'
            }]
          });
        }
        break;

      case 'lock':
        actions.push({
          type: 'lock',
          label: 'Sperren',
          domain: 'lock',
          service: 'lock'
        });
        actions.push({
          type: 'unlock',
          label: 'Entsperren',
          domain: 'lock',
          service: 'unlock'
        });
        break;

      default:
        // Generic actions for other domains
        actions.push({
          type: 'turn_on',
          label: 'Einschalten',
          domain: domain,
          service: 'turn_on'
        });
        actions.push({
          type: 'turn_off',
          label: 'Ausschalten',
          domain: domain,
          service: 'turn_off'
        });
    }

    this.availableActions = actions;
    console.log('Generated actions:', this.availableActions);

    // Pre-select action if already assigned
    if (this.transcript.assignedAction) {
      this.selectedAction = this.availableActions.find(
        a => a.type === this.transcript.assignedAction?.type
      ) || null;
    }
  }

  selectAction(action: ActionDefinition): void {
    this.selectedAction = action;

    // Initialize params with default values
    if (action.params) {
      for (const param of action.params) {
        if (!(param.name in this.actionParams)) {
          if (param.type === 'slider' || param.type === 'number') {
            this.actionParams[param.name] = param.min || 0;
          } else if (param.type === 'select' && param.options && param.options.length > 0) {
            this.actionParams[param.name] = param.options[0].value;
          } else {
            this.actionParams[param.name] = '';
          }
        }
      }
    }

    console.log('Selected action:', action, 'params:', this.actionParams);
  }

  getParamValue(paramName: string): any {
    return this.actionParams[paramName];
  }

  setParamValue(paramName: string, value: any): void {
    this.actionParams[paramName] = value;
    console.log('Updated param:', paramName, '=', value);
  }

  onColorChange(paramName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const hex = input.value;

    // Convert hex to RGB
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);

    this.actionParams[paramName] = [r, g, b];
    console.log('Color changed:', hex, '→', this.actionParams[paramName]);
  }

  async save(): Promise<void> {
    try {
      const payload: Partial<Transcript> = {
        aiAdjustedText: this.aiAdjustedText,
        assignedAreaId: this.selectedAreaId || undefined,
        assignedEntityId: this.selectedEntityId || undefined,
        assignedTrigger: this.assignedTrigger || undefined,
      };

      if (this.selectedAction) {
        payload.assignedAction = {
          type: this.selectedAction.type,
          label: this.selectedAction.label,
          params: this.actionParams
        };
      }

      await lastValueFrom(
        this.http.put(`${this.backendUrl}/api/transcripts/${this.transcript._id}`, payload)
      );

      this.snackBar.open('Transkript erfolgreich gespeichert', 'OK', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Failed to save transcript:', error);
      this.snackBar.open('Fehler beim Speichern', 'OK', { duration: 3000 });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  getEntityDisplayName(entity: Entity): string {
    return entity.attributes?.friendly_name || entity.entity_id;
  }
}

