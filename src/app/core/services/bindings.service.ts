import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Angular Service für Binding-Management
 *
 * Integration in Angular App:
 * 1. Import in app.config.ts oder module
 * 2. Inject in Components/Dialogs
 * 3. Use in Edit-Dialogs
 */

// DTOs (Type Definitions)
export interface CreateUserDeviceBindingDto {
  userId: string;
  haDeviceId: string;
  customAlias?: string;
  isPrimary?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateUserDeviceBindingDto {
  customAlias?: string;
  isPrimary?: boolean;
  metadata?: Record<string, any>;
}

export interface UserDeviceBinding {
  id: string;
  userId: string;
  haDeviceId: string;
  customAlias: string | null;
  isPrimary: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  user?: any;
  haDevice?: any;
}

export interface CreateDeviceEntityBindingDto {
  haDeviceId: string;
  haEntityId: string;
  bindingType?: 'auto' | 'manual' | 'suggested';
  customCategory?: string;
  displayOrder?: number;
  isVisible?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateDeviceEntityBindingDto {
  bindingType?: 'auto' | 'manual' | 'suggested';
  customCategory?: string;
  displayOrder?: number;
  isVisible?: boolean;
  metadata?: Record<string, any>;
}

export interface DeviceEntityBinding {
  id: string;
  haDeviceId: string;
  haEntityId: string;
  bindingType: 'auto' | 'manual' | 'suggested';
  customCategory: string | null;
  displayOrder: number;
  isVisible: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  haDevice?: any;
  haEntity?: any;
}

export interface CreateDeviceAreaBindingDto {
  haDeviceId: string;
  haAreaId: string;
  isPrimary?: boolean;
  isTemporary?: boolean;
  validFrom?: string;
  validUntil?: string;
  metadata?: Record<string, any>;
}

export interface UpdateDeviceAreaBindingDto {
  isPrimary?: boolean;
  isTemporary?: boolean;
  validFrom?: string;
  validUntil?: string;
  metadata?: Record<string, any>;
}

export interface DeviceAreaBinding {
  id: string;
  haDeviceId: string;
  haAreaId: string;
  isPrimary: boolean;
  isTemporary: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  haDevice?: any;
  haArea?: any;
}

@Injectable({
  providedIn: 'root'
})
export class BindingsService {
  // Support both paths: direct backend proxy (/api/bindings) and HA-namespaced proxy (/api/homeassistant/bindings)
  private readonly baseUrl = '/api/bindings';

  constructor(private http: HttpClient) {}

  // ==========================================
  // User-Device Bindings
  // ==========================================

  createUserDeviceBinding(dto: CreateUserDeviceBindingDto): Observable<UserDeviceBinding> {
    return this.http.post<UserDeviceBinding>(`${this.baseUrl}/user-device`, dto);
  }

  getUserDeviceBindingsByUser(userId: string): Observable<UserDeviceBinding[]> {
    return this.http.get<UserDeviceBinding[]>(`${this.baseUrl}/user-device/user/${userId}`);
  }

  getUserDeviceBindingsByDevice(deviceId: string): Observable<UserDeviceBinding[]> {
    return this.http.get<UserDeviceBinding[]>(`${this.baseUrl}/user-device/device/${deviceId}`);
  }

  getPrimaryUserDevice(userId: string): Observable<UserDeviceBinding> {
    return this.http.get<UserDeviceBinding>(`${this.baseUrl}/user-device/user/${userId}/primary`);
  }

  getUserDeviceSuggestions(userId: string): Observable<Partial<CreateUserDeviceBindingDto>[]> {
    return this.http.get<Partial<CreateUserDeviceBindingDto>[]>(
      `${this.baseUrl}/user-device/user/${userId}/suggestions`
    );
  }

  updateUserDeviceBinding(id: string, dto: UpdateUserDeviceBindingDto): Observable<UserDeviceBinding> {
    return this.http.put<UserDeviceBinding>(`${this.baseUrl}/user-device/${id}`, dto);
  }

  deleteUserDeviceBinding(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/user-device/${id}`);
  }

  // ==========================================
  // Device-Entity Bindings
  // ==========================================

  createDeviceEntityBinding(dto: CreateDeviceEntityBindingDto): Observable<DeviceEntityBinding> {
    return this.http.post<DeviceEntityBinding>(`${this.baseUrl}/device-entity`, dto);
  }

  getDeviceEntityBindingsByDevice(deviceId: string): Observable<DeviceEntityBinding[]> {
    return this.http.get<DeviceEntityBinding[]>(`${this.baseUrl}/device-entity/device/${deviceId}`);
  }

  getDeviceEntityBindingsByEntity(entityId: string): Observable<DeviceEntityBinding[]> {
    return this.http.get<DeviceEntityBinding[]>(`${this.baseUrl}/device-entity/entity/${entityId}`);
  }

  getDeviceEntityBindingsByCategory(deviceId: string, category: string): Observable<DeviceEntityBinding[]> {
    return this.http.get<DeviceEntityBinding[]>(
      `${this.baseUrl}/device-entity/device/${deviceId}/category/${category}`
    );
  }

  getDeviceEntitySuggestions(deviceId: string): Observable<Partial<CreateDeviceEntityBindingDto>[]> {
    return this.http.get<Partial<CreateDeviceEntityBindingDto>[]>(
      `${this.baseUrl}/device-entity/device/${deviceId}/suggestions`
    );
  }

  syncAutoDeviceEntityBindings(): Observable<{ created: number; skipped: number }> {
    return this.http.post<{ created: number; skipped: number }>(
      `${this.baseUrl}/device-entity/sync-auto`,
      {}
    );
  }

  applyDeviceEntityPreset(
    deviceId: string,
    preset: 'all_sensors' | 'battery_only' | 'controls_only' | 'location_only'
  ): Observable<DeviceEntityBinding[]> {
    return this.http.post<DeviceEntityBinding[]>(
      `${this.baseUrl}/device-entity/device/${deviceId}/apply-preset`,
      { preset }
    );
  }

  updateDeviceEntityBinding(id: string, dto: UpdateDeviceEntityBindingDto): Observable<DeviceEntityBinding> {
    return this.http.put<DeviceEntityBinding>(`${this.baseUrl}/device-entity/${id}`, dto);
  }

  deleteDeviceEntityBinding(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/device-entity/${id}`);
  }

  resetDeviceBindings(
    deviceId: string,
    options?: { reSync?: boolean; keepAuto?: boolean }
  ): Observable<{ deleted: number; reSynced: number }> {
    return this.http.post<{ deleted: number; reSynced: number }>(
      `${this.baseUrl}/device/${deviceId}/reset`,
      options || {}
    );
  }

  // ==========================================
  // Device-Area Bindings
  // ==========================================

  createDeviceAreaBinding(dto: CreateDeviceAreaBindingDto): Observable<DeviceAreaBinding> {
    return this.http.post<DeviceAreaBinding>(`${this.baseUrl}/device-area`, dto);
  }

  getDeviceAreaBindingsByDevice(deviceId: string): Observable<DeviceAreaBinding[]> {
    return this.http.get<DeviceAreaBinding[]>(`${this.baseUrl}/device-area/device/${deviceId}`);
  }

  getDeviceAreaBindingsByArea(areaId: string): Observable<DeviceAreaBinding[]> {
    return this.http.get<DeviceAreaBinding[]>(`${this.baseUrl}/device-area/area/${areaId}`);
  }

  getPrimaryDeviceArea(deviceId: string): Observable<DeviceAreaBinding> {
    return this.http.get<DeviceAreaBinding>(`${this.baseUrl}/device-area/device/${deviceId}/primary`);
  }

  getActiveDeviceAreaBindings(deviceId: string): Observable<DeviceAreaBinding[]> {
    return this.http.get<DeviceAreaBinding[]>(`${this.baseUrl}/device-area/device/${deviceId}/active`);
  }

  cleanupExpiredDeviceAreaBindings(): Observable<{ deletedCount: number }> {
    return this.http.post<{ deletedCount: number }>(`${this.baseUrl}/device-area/cleanup-expired`, {});
  }

  updateDeviceAreaBinding(id: string, dto: UpdateDeviceAreaBindingDto): Observable<DeviceAreaBinding> {
    return this.http.put<DeviceAreaBinding>(`${this.baseUrl}/device-area/${id}`, dto);
  }

  deleteDeviceAreaBinding(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/device-area/${id}`);
  }
}

