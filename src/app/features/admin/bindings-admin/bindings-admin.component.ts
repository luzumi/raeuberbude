import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { HomeAssistantService, Entity } from '@services/home-assistant/home-assistant.service';
import { DeviceEntityBindingsDialogComponent } from '@shared/dialogs/device-entity-bindings-dialog/device-entity-bindings-dialog.component';

interface DeviceSummary {
  id: string; // device id or fallback entity id
  name: string;
  sampleEntityId?: string;
}

@Component({
  selector: 'app-bindings-admin',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="bindings-admin">
      <h2>Bindings Verwaltung</h2>
      <p>Liste erkannter Geräte (Gruppiert nach device_id wenn vorhanden, sonst nach Entity-Id)</p>

      <div class="device-list">
        <div class="device-item" *ngFor="let d of devices">
          <div class="device-meta">
            <div class="device-name">{{ d.name }}</div>
            <div class="device-id">{{ d.id }}</div>
          </div>
          <button mat-icon-button color="primary" (click)="openBindings(d)">
            <mat-icon>link</mat-icon>
          </button>
        </div>
      </div>

      <div *ngIf="devices.length === 0">Keine Geräte gefunden. Home Assistant Entities werden geladen…</div>
    </div>
  `,
  styles: [
    `.bindings-admin { padding: 16px; }
     .device-name { font-weight: 600 }
     .device-id { font-family: monospace; color: rgba(0,0,0,0.6) }
    `
  ]
})
export class BindingsAdminComponent implements OnInit {
  devices: DeviceSummary[] = [];

  constructor(private readonly hass: HomeAssistantService, private readonly dialog: MatDialog) {}

  ngOnInit(): void {
    // Subscribe to entities and build device list
    this.hass.entities$.subscribe((entities) => {
      this.devices = this.buildDeviceSummaries(entities);
    });
  }

  private buildDeviceSummaries(entities: Entity[]): DeviceSummary[] {
    // Strategy: if entity.attributes.device_id exists, group by that.
    // Fallback: group by domain-object prefix (e.g. media_player.tv_samsung)
    const map = new Map<string, DeviceSummary>();

    for (const e of entities) {
      const deviceId = (e as any).attributes?.device_id || null;
      const key = deviceId || e.entity_id.split('.')[0] + '::' + e.entity_id.split('.')[1];
      if (!map.has(key)) {
        const name = (e.attributes?.friendly_name) || e.entity_id;
        map.set(key, { id: deviceId || e.entity_id, name, sampleEntityId: e.entity_id });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  openBindings(device: DeviceSummary) {
    this.dialog.open(DeviceEntityBindingsDialogComponent, {
      width: '900px',
      data: { deviceId: device.id, deviceName: device.name }
    });
  }
}
