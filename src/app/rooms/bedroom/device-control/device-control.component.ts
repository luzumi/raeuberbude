import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceService, Device, DeviceAction, ActionParam } from '../../../core/services/device.service';

@Component({
  selector: 'app-device-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './device-control.component.html',
  styleUrls: ['./device-control.component.scss']
})
export class DeviceControlComponent implements OnInit {
  devices: Device[] = [];
  actions: DeviceAction[] = [];

  selectedDeviceId: string | null = null;
  selectedActionId: string | null = null;

  // Parameterwerte, key -> value
  actionParams: Record<string, any> = {};

  // UI state
  loadingDevices = false;
  loadingActions = false;
  executing = false;
  resultMessage = '';

  constructor(private readonly deviceService: DeviceService) {}

  async ngOnInit(): Promise<void> {
    this.loadingDevices = true;
    try {
      this.devices = await this.deviceService.getDevices();
    } finally {
      this.loadingDevices = false;
    }
  }

  async onDeviceChange(): Promise<void> {
    this.selectedActionId = null;
    this.actions = [];
    this.actionParams = {};

    if (!this.selectedDeviceId) { return; }

    this.loadingActions = true;
    try {
      this.actions = await this.deviceService.getActionsForDevice(this.selectedDeviceId);
    } finally {
      this.loadingActions = false;
    }
  }

  onActionChange(): void {
    this.actionParams = {};
    if (!this.selectedDeviceId || !this.selectedActionId) { return; }

    const action = this.actions.find(a => a.id === this.selectedActionId);
    if (action?.params) {
      for (const p of action.params) {
        this.actionParams[p.key] = p.default ?? (p.type === 'number' ? 0 : '');
      }
    }
  }

  async execute(): Promise<void> {
    if (!this.selectedDeviceId || !this.selectedActionId) {
      this.resultMessage = 'Bitte Gerät und Aktion auswählen.';
      return;
    }

    this.executing = true;
    this.resultMessage = '';
    try {
      const res = await this.deviceService.executeAction(this.selectedDeviceId, this.selectedActionId, this.actionParams);
      this.resultMessage = res.message;
    } catch (err) {
      this.resultMessage = 'Fehler beim Ausführen: ' + err;
    } finally {
      this.executing = false;
    }
  }

  // Helpers for template
  get selectedAction(): DeviceAction | undefined {
    return this.actions.find(a => a.id === this.selectedActionId);
  }

  // Render-helpers for param types
  isNumber(p: ActionParam) { return p.type === 'number'; }
  isString(p: ActionParam) { return p.type === 'string'; }
  isBoolean(p: ActionParam) { return p.type === 'boolean'; }
  isSelect(p: ActionParam) { return p.type === 'select'; }
}

