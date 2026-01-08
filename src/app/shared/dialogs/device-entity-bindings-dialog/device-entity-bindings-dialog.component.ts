import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import {
    BindingsService,
    CreateDeviceEntityBindingDto,
    DeviceEntityBinding
} from '../../../core/services/bindings.service';

/**
 * Dialog zum Editieren von Device-Entity-Bindings
 *
 * Features:
 * - Liste aller Entities des Devices
 * - Hinzufügen/Entfernen von Bindings
 * - Kategorisierung
 * - Sortierung (Drag & Drop - TODO)
 * - Filter-Presets
 * - Suggestions aus HA
 *
 * Usage:
 * ```typescript
 * const dialogRef = this.dialog.open(DeviceEntityBindingsDialogComponent, {
 *   width: '800px',
 *   data: { deviceId: 'pixel-uuid', deviceName: 'Pixel 8 Pro' }
 * });
 * ```
 */

export interface DeviceEntityBindingsDialogData {
  deviceId: string;
  deviceName: string;
  initialEntityId?: string; // Optional: Fokussiere auf diese Entity beim Öffnen
}

@Component({
  selector: 'app-device-entity-bindings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './device-entity-bindings-dialog.component.html',
  styleUrls: ['./device-entity-bindings-dialog.component.scss']
})
export class DeviceEntityBindingsDialogComponent implements OnInit {
  bindings: DeviceEntityBinding[] = [];
  suggestions: Partial<CreateDeviceEntityBindingDto>[] = [];
  loading = false;
  selectedPreset: 'all_sensors' | 'battery_only' | 'controls_only' | 'location_only' | null = null;

  // DB uuid for the HA device (ha_devices.id) - needed for backend DTOs
  haDeviceUuid: string | null = null;

  presets: Array<{
    value: 'all_sensors' | 'battery_only' | 'controls_only' | 'location_only';
    label: string;
    icon: string;
  }> = [
    { value: 'all_sensors', label: 'Alle Sensoren', icon: 'sensors' },
    { value: 'battery_only', label: 'Nur Batterien', icon: 'battery_full' },
    { value: 'controls_only', label: 'Nur Controls', icon: 'tune' },
    { value: 'location_only', label: 'Nur Standort', icon: 'location_on' },
  ];

  categories = [
    'Battery Sensors',
    'Location Sensors',
    'Network Sensors',
    'Controls',
    'Status Indicators',
    'Other'
  ];

  constructor(
    public dialogRef: MatDialogRef<DeviceEntityBindingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeviceEntityBindingsDialogData,
    private bindingsService: BindingsService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.loadBindings();
    this.loadSuggestions();

    // Load DB HaDevice UUID for the provided deviceId (natural HA deviceId)
    this.loadHaDeviceUuid();

    // Wenn initialEntityId gesetzt ist, Entity-spezifische Ansicht laden
    if (this.data.initialEntityId) {
      this.loadEntitySpecificView(this.data.initialEntityId);
    }
  }

  private async loadHaDeviceUuid(): Promise<void> {
    if (!this.data.deviceId) return;
    try {
      const resp: any = await this.http
        .get(`/api/homeassistant/db/devices/${encodeURIComponent(this.data.deviceId)}`)
        .toPromise();
      // API returns object with id (UUID) and deviceId (natural)
      this.haDeviceUuid = resp?.id || null;
      if (!this.haDeviceUuid) {
        console.warn('HaDevice UUID not found for', this.data.deviceId);
      }
    } catch (err) {
      console.error('Failed to load HaDevice UUID:', err);
      this.haDeviceUuid = null;
    }
  }

  /**
   * Lädt Entity-spezifische Ansicht und markiert/fokussiert die Entity
   */
  private async loadEntitySpecificView(entityId: string): Promise<void> {
    try {
      const entityBindings = await this.bindingsService
        .getDeviceEntityBindingsByEntity(entityId)
        .toPromise() || [];

      if (entityBindings.length === 0) {
        console.log(`Keine Bindings für Entity ${entityId} gefunden - kann neues Binding anlegen`);
        // Optional: Auto-add zu Suggestions wenn nicht gebunden
        const existingSuggestion = this.suggestions.find(s => s.haEntityId === entityId);
        if (!existingSuggestion) {
          this.suggestions.unshift({ haEntityId: entityId });
        }
      } else {
        console.log(`${entityBindings.length} Binding(s) für Entity ${entityId} gefunden`);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Entity-Bindings:', error);
    }
  }

  async loadBindings(): Promise<void> {
    this.loading = true;
    try {
      this.bindings = await this.bindingsService
        .getDeviceEntityBindingsByDevice(this.data.deviceId)
        .toPromise() || [];

      // Sort by displayOrder
      this.bindings.sort((a, b) => a.displayOrder - b.displayOrder);
    } catch (error) {
      console.error('Failed to load bindings:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadSuggestions(): Promise<void> {
    try {
      this.suggestions = await this.bindingsService
        .getDeviceEntitySuggestions(this.data.deviceId)
        .toPromise() || [];
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  }

  async applyPreset(preset: 'all_sensors' | 'battery_only' | 'controls_only' | 'location_only'): Promise<void> {
    this.loading = true;
    this.selectedPreset = preset;
    try {
      const result = await this.bindingsService
        .applyDeviceEntityPreset(this.data.deviceId, preset)
        .toPromise();

      if (result) {
        this.bindings = result;
      }

      console.log(`Applied preset: ${preset}`);
    } catch (error) {
      console.error('Failed to apply preset:', error);
    } finally {
      this.loading = false;
    }
  }

  async syncAutoBindings(): Promise<void> {
    this.loading = true;
    try {
      const result = await this.bindingsService.syncAutoDeviceEntityBindings().toPromise();
      console.log(`Synced auto bindings: ${result?.created} created, ${result?.skipped} skipped`);
      await this.loadBindings();
    } catch (error) {
      console.error('Failed to sync auto bindings:', error);
    } finally {
      this.loading = false;
    }
  }

  async toggleVisibility(binding: DeviceEntityBinding): Promise<void> {
    try {
      await this.bindingsService
        .updateDeviceEntityBinding(binding.id, { isVisible: !binding.isVisible })
        .toPromise();

      binding.isVisible = !binding.isVisible;
    } catch (error) {
      console.error('Failed to update binding:', error);
    }
  }

  async updateCategory(binding: DeviceEntityBinding, category: string): Promise<void> {
    try {
      await this.bindingsService
        .updateDeviceEntityBinding(binding.id, { customCategory: category })
        .toPromise();

      binding.customCategory = category;
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  }

  async deleteBinding(binding: DeviceEntityBinding): Promise<void> {
    if (!confirm(`Binding zu ${binding.haEntityId} wirklich löschen?`)) {
      return;
    }

    try {
      await this.bindingsService.deleteDeviceEntityBinding(binding.id).toPromise();
      this.bindings = this.bindings.filter(b => b.id !== binding.id);
    } catch (error) {
      console.error('Failed to delete binding:', error);
    }
  }

  async addSuggestion(suggestion: Partial<CreateDeviceEntityBindingDto>): Promise<void> {
    if (!suggestion.haEntityId) return;

    // Use DB uuid if available; otherwise fallback to the provided deviceId (may cause 400)
    const targetHaDeviceId = this.haDeviceUuid || this.data.deviceId;

    try {
      const created = await this.bindingsService
        .createDeviceEntityBinding({
          haDeviceId: targetHaDeviceId,
          haEntityId: suggestion.haEntityId,
          bindingType: 'manual',
          isVisible: true,
        })
        .toPromise();

      if (created) {
        this.bindings.push(created);
        this.suggestions = this.suggestions.filter(s => s.haEntityId !== suggestion.haEntityId);
      }
    } catch (error) {
      console.error('Failed to add suggestion:', error);
      // Optional: show user-friendly error if validation fails
      // e.g., alert('Konnte Binding nicht erstellen: ' + (error?.message || error));
    }
  }

  getBindingIcon(binding: DeviceEntityBinding): string {
    if (binding.customCategory?.includes('Battery')) return 'battery_full';
    if (binding.customCategory?.includes('Location')) return 'location_on';
    if (binding.customCategory?.includes('Network')) return 'wifi';
    if (binding.customCategory?.includes('Control')) return 'tune';
    return 'sensors';
  }

  onClose(): void {
    this.dialogRef.close(this.bindings);
  }
}

