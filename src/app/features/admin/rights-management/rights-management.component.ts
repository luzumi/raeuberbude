import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import {HeaderComponent} from '@shared/components/header/header.component';
import { firstValueFrom } from 'rxjs';

interface UserRights {
  _id?: string;
  userId: any;
  role: string;
  permissions: string[];
  allowedTerminals: any[];
  canUseSpeechInput: boolean;
  canManageTerminals: boolean;
  canManageUsers: boolean;
  canViewOwnInputs: boolean;
  canViewAllInputs: boolean;
  canDeleteInputs: boolean;
  status: string;
  expiresAt?: Date;
}

interface Terminal {
  _id?: string;
  terminalId: string;
  name: string;
  type: string;
  status: string;
  location?: string;
  assignedUserId?: any;
  lastActiveAt?: Date;
}

@Component({
  selector: 'app-rights-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    MatCheckboxModule,
    MatChipsModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatOptionModule,
    HeaderComponent,
  ],
  templateUrl: './rights-management.component.html',
  styleUrls: ['./rights-management.component.scss']
})
export class RightsManagementComponent implements OnInit {
  userRights: UserRights[] = [];
  terminals: Terminal[] = [];
  users: any[] = [];
  locations: string[] = [];
  permissionsCtrl = new FormControl<string>('');
  filteredPermissions: { key: string; label: string }[] = [];

  rightsForm: FormGroup;
  terminalForm: FormGroup;

  selectedUserRights: UserRights | null = null;
  selectedTerminal: Terminal | null = null;

  // 0 = Benutzerrechte, 1 = Terminals
  selectedTabIndex = 0;

  roles = ['admin', 'manager', 'regular', 'guest', 'terminal'];
  terminalTypes = ['browser', 'mobile', 'tablet', 'kiosk', 'smart-tv', 'other'];
  terminalStatuses = ['active', 'inactive', 'maintenance'];

  availablePermissions = [
    { key: 'speech.use', label: 'Spracheingabe verwenden' },
    { key: 'speech.view.own', label: 'Eigene Eingaben anzeigen' },
    { key: 'speech.view.all', label: 'Alle Eingaben anzeigen' },
    { key: 'speech.delete', label: 'Eingaben löschen' },
    { key: 'terminal.view', label: 'Terminals anzeigen' },
    { key: 'terminal.create', label: 'Terminals erstellen' },
    { key: 'terminal.edit', label: 'Terminals bearbeiten' },
    { key: 'terminal.delete', label: 'Terminals löschen' },
    { key: 'user.view', label: 'Benutzer anzeigen' },
    { key: 'user.create', label: 'Benutzer erstellen' },
    { key: 'user.edit', label: 'Benutzer bearbeiten' },
    { key: 'user.delete', label: 'Benutzer löschen' },
    { key: 'user.manage.rights', label: 'Rechte verwalten' },
    { key: 'system.admin', label: 'System-Admin' },
  ];

  // Absolute API bases (work both when app runs on :4301 or within MCP :4200)
  private readonly nestBase: string;
  private readonly speechApiBase: string;
  private readonly usersApiBase: string;

  constructor(
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
  ) {
    this.rightsForm = this.createRightsForm();
    this.terminalForm = this.createTerminalForm();
    const host = (globalThis as any)?.location?.hostname || 'localhost';
    const port = 3001;
    this.nestBase = `http://${host}:${port}`;
    this.speechApiBase = `${this.nestBase}/api/speech`;
    this.usersApiBase = `${this.nestBase}/users`;
    this.permissionsCtrl.valueChanges.subscribe((q) => this.applyPermFilter(q || ''));
    this.applyPermFilter('');
  }

  ngOnInit(): void {
    // Select tab based on route
    const url = this.router.url || '';
    if (url.includes('/admin/terminals')) {
      this.selectedTabIndex = 1;
    } else {
      this.selectedTabIndex = 0;
    }
    this.loadData();
  }

  private createRightsForm(): FormGroup {
    return this.fb.group({
      userId: ['', Validators.required],
      role: ['regular', Validators.required],
      permissions: [],
      canUseSpeechInput: [true],
      canManageTerminals: [false],
      canManageUsers: [false],
      canViewOwnInputs: [true],
      canViewAllInputs: [false],
      canDeleteInputs: [false],
      status: ['active'],
      allowedTerminals: []
    });
  }

  private createTerminalForm(): FormGroup {
    return this.fb.group({
      terminalId: ['', Validators.required],
      name: ['', Validators.required],
      type: ['browser', Validators.required],
      status: ['active', Validators.required],
      location: [''],
      assignedUserId: [null]
    });
  }

  async loadData(): Promise<void> {
    try {
      // Load user rights
      const rightsResponse = await firstValueFrom(this.http.get<any>(`${this.speechApiBase}/rights`, { withCredentials: true }));
      this.userRights = rightsResponse?.data || [];

      // Load terminals
      const terminalsResponse = await firstValueFrom(this.http.get<any>(`${this.speechApiBase}/terminals`, { withCredentials: true }));
      this.terminals = terminalsResponse?.data || [];
      // derive distinct locations
      this.locations = Array.from(new Set((this.terminals || [])
        .map((t: any) => t.location)
        .filter((x: any) => !!x)))
        .map(String)
        .sort((a: string, b: string) => a.localeCompare(b));

      // Load users
      const usersResponse = await firstValueFrom(this.http.get<any[]>(`${this.usersApiBase}`, { withCredentials: true }));
      this.users = usersResponse || [];
    } catch (error) {
      console.error('Failed to load data:', error);
      this.showMessage('Fehler beim Laden der Daten', 'error');
    }
  }

  // Rights Management Methods
  selectUserRights(rights: UserRights): void {
    this.selectedUserRights = rights;
    this.rightsForm.patchValue({
      userId: rights.userId?._id || rights.userId,
      role: rights.role,
      permissions: rights.permissions,
      canUseSpeechInput: rights.canUseSpeechInput,
      canManageTerminals: rights.canManageTerminals,
      canManageUsers: rights.canManageUsers,
      canViewOwnInputs: rights.canViewOwnInputs,
      canViewAllInputs: rights.canViewAllInputs,
      canDeleteInputs: rights.canDeleteInputs,
      status: rights.status,
      allowedTerminals: rights.allowedTerminals.map(t => t._id || t)
    });
    this.applyPermFilter('');
  }

  async saveUserRights(): Promise<void> {
    if (!this.rightsForm.valid) {
      this.showMessage('Bitte alle Pflichtfelder ausfüllen', 'error');
      return;
    }

    const formData = this.rightsForm.value;
    // Sanitize payload
    const payload: any = { ...formData };
    payload.permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
    payload.allowedTerminals = Array.isArray(payload.allowedTerminals)
      ? payload.allowedTerminals.map((t: any) => (t?._id || t)).filter(Boolean)
      : [];

    try {
      if (this.selectedUserRights) {
        // Update existing rights
        const userId = this.selectedUserRights.userId?._id || this.selectedUserRights.userId;
        await firstValueFrom(this.http.put(`${this.speechApiBase}/rights/user/${userId}`, payload, { withCredentials: true }));
        this.showMessage('Benutzerrechte aktualisiert', 'success');
      } else {
        // Create new rights
        try {
          await firstValueFrom(this.http.post(`${this.speechApiBase}/rights`, payload, { withCredentials: true }));
          this.showMessage('Benutzerrechte erstellt', 'success');
        } catch (err: any) {
          const msg = err?.error?.message || err?.message || '';
          // Fallback: wenn Rechte existieren, auf Update wechseln
          if (typeof msg === 'string' && msg.includes('User rights already exist')) {
            const userId = payload.userId?._id || payload.userId;
            await firstValueFrom(this.http.put(`${this.speechApiBase}/rights/user/${userId}`, payload, { withCredentials: true }));
            this.showMessage('Benutzerrechte aktualisiert (existierten bereits)', 'success');
          } else {
            throw err;
          }
        }
      }

      this.resetRightsForm();
      this.loadData();
    } catch (error) {
      console.error('Failed to save user rights:', error);
      this.showMessage('Fehler beim Speichern der Benutzerrechte', 'error');
    }
  }

  async deleteUserRights(rights: UserRights): Promise<void> {
    if (!confirm('Möchten Sie diese Benutzerrechte wirklich löschen?')) {
      return;
    }

    try {
      const userId = rights.userId?._id || rights.userId;
      await firstValueFrom(this.http.delete(`${this.speechApiBase}/rights/user/${userId}`, { withCredentials: true }));
      this.showMessage('Benutzerrechte gelöscht', 'success');
      this.loadData();
    } catch (error) {
      console.error('Failed to delete user rights:', error);
      this.showMessage('Fehler beim Löschen der Benutzerrechte', 'error');
    }
  }

  async assignRole(userId: string, role: string): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`${this.speechApiBase}/rights/user/${userId}/role`, { role }, { withCredentials: true }));
      this.showMessage(`Rolle ${role} zugewiesen`, 'success');
      this.loadData();
    } catch (error) {
      console.error('Failed to assign role:', error);
      this.showMessage('Fehler beim Zuweisen der Rolle', 'error');
    }
  }

  async toggleUserStatus(rights: UserRights): Promise<void> {
    const userId = rights.userId?._id || rights.userId;
    const newStatus = rights.status === 'active' ? 'suspended' : 'active';

    try {
      if (newStatus === 'suspended') {
        await firstValueFrom(this.http.put(`${this.speechApiBase}/rights/user/${userId}/suspend`, {
          reason: 'Admin action'
        }, { withCredentials: true }));
      } else {
        await firstValueFrom(this.http.put(`${this.speechApiBase}/rights/user/${userId}/activate`, {}, { withCredentials: true }));
      }
      this.showMessage(`Benutzer ${newStatus === 'active' ? 'aktiviert' : 'gesperrt'}`, 'success');
      this.loadData();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      this.showMessage('Fehler beim Ändern des Benutzerstatus', 'error');
    }
  }

  resetRightsForm(): void {
    this.selectedUserRights = null;
    this.rightsForm.reset({
      role: 'regular',
      status: 'active',
      canUseSpeechInput: true,
      canViewOwnInputs: true
    });
  }

  // Terminal Management Methods
  selectTerminal(terminal: Terminal): void {
    this.selectedTerminal = terminal;
    this.terminalForm.patchValue({
      terminalId: terminal.terminalId,
      name: terminal.name,
      type: terminal.type,
      status: terminal.status,
      location: terminal.location,
      assignedUserId: terminal.assignedUserId?._id || terminal.assignedUserId
    });
  }

  async saveTerminal(): Promise<void> {
    if (!this.terminalForm.valid) {
      this.showMessage('Bitte alle Pflichtfelder ausfüllen', 'error');
      return;
    }

    const formData = this.terminalForm.value;
    const payload: any = { ...formData };
    // Normalize optional fields
    if (payload.assignedUserId === '' || payload.assignedUserId === null) {
      delete payload.assignedUserId;
    }
    if (typeof payload.terminalId === 'string') payload.terminalId = payload.terminalId.trim();
    if (typeof payload.name === 'string') payload.name = payload.name.trim();

    try {
      if (this.selectedTerminal) {
        // Update existing terminal
        const id = this.selectedTerminal._id || this.selectedTerminal.terminalId;
        await firstValueFrom(this.http.put(`${this.speechApiBase}/terminals/${id}`, payload, { withCredentials: true }));
        this.showMessage('Terminal aktualisiert', 'success');
      } else {
        // Create new terminal
        await firstValueFrom(this.http.post(`${this.speechApiBase}/terminals`, payload, { withCredentials: true }));
        this.showMessage('Terminal erstellt', 'success');
      }

      this.resetTerminalForm();
      this.loadData();
    } catch (error) {
      console.error('Failed to save terminal:', error);
      this.showMessage('Fehler beim Speichern des Terminals', 'error');
    }
  }

  async deleteTerminal(terminal: Terminal): Promise<void> {
    if (!confirm('Möchten Sie dieses Terminal wirklich löschen?')) {
      return;
    }

    try {
      const id = terminal._id || terminal.terminalId;
      await firstValueFrom(this.http.delete(`${this.speechApiBase}/terminals/${id}`, { withCredentials: true }));
      this.showMessage('Terminal gelöscht', 'success');
      this.loadData();
    } catch (error) {
      console.error('Failed to delete terminal:', error);
      this.showMessage('Fehler beim Löschen des Terminals', 'error');
    }
  }

  async toggleTerminalStatus(terminal: Terminal): Promise<void> {
    const newStatus = terminal.status === 'active' ? 'inactive' : 'active';

    try {
      await firstValueFrom(this.http.put(`${this.speechApiBase}/terminals/${terminal.terminalId}/status`, {
        status: newStatus
      }, { withCredentials: true }));
      this.showMessage(`Terminal ${newStatus === 'active' ? 'aktiviert' : 'deaktiviert'}`, 'success');
      this.loadData();
    } catch (error) {
      console.error('Failed to toggle terminal status:', error);
      this.showMessage('Fehler beim Ändern des Terminal-Status', 'error');
    }
  }

  resetTerminalForm(): void {
    this.selectedTerminal = null;
    this.terminalForm.reset({
      type: 'browser',
      status: 'active',
      assignedUserId: null,
      location: ''
    });
  }

  // Helper Methods
  getUserName(userId: any): string {
    const id = userId?._id || userId;
    const user = this.users.find(u => u._id === id);
    return user ? user.username || user.email : 'Unbekannt';
  }

  getRoleBadgeClass(role: string): string {
    const classes: any = {
      admin: 'badge-admin',
      manager: 'badge-manager',
      regular: 'badge-regular',
      guest: 'badge-guest',
      terminal: 'badge-terminal'
    };
    return classes[role] || 'badge-default';
  }

  getStatusBadgeClass(status: string): string {
    const classes: any = {
      active: 'badge-active',
      inactive: 'badge-inactive',
      suspended: 'badge-suspended',
      maintenance: 'badge-maintenance'
    };
    return classes[status] || 'badge-default';
  }

  isTerminalActive(terminal: Terminal): boolean {
    if (terminal.status !== 'active') return false;
    if (!terminal.lastActiveAt) return false;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return new Date(terminal.lastActiveAt) > oneHourAgo;
  }

  onRoleChange(): void {
    const role = this.rightsForm.get('role')?.value;

    // Set default permissions based on role
    const rolePermissions: any = {
      admin: this.availablePermissions.map(p => p.key),
      manager: [
        'speech.use', 'speech.view.own', 'speech.view.all',
        'terminal.view', 'terminal.edit', 'user.view', 'user.manage.rights'
      ],
      regular: ['speech.use', 'speech.view.own', 'terminal.view'],
      guest: ['speech.use', 'speech.view.own'],
      terminal: ['speech.use']
    };

    this.rightsForm.patchValue({
      permissions: rolePermissions[role] || [],
      canManageTerminals: role === 'admin' || role === 'manager',
      canManageUsers: role === 'admin',
      canViewAllInputs: role === 'admin' || role === 'manager',
      canDeleteInputs: role === 'admin'
    });
    this.applyPermFilter('');
  }

  // Update permissions when a checkbox is toggled in the template
  onPermissionToggle(checked: boolean, key: string): void {
    const current: string[] = this.rightsForm.value.permissions || [];
    let next: string[] = current;

    if (checked) {
      if (!current.includes(key)) {
        next = [...current, key];
      }
    } else {
      next = current.filter((p: string) => p !== key);
    }

    this.rightsForm.patchValue({ permissions: next });
  }

  // === Permissions Multi-Autocomplete Helpers ===
  applyPermFilter(query: string) {
    const q = (query || '').toLowerCase();
    const selected: string[] = this.rightsForm.value.permissions || [];
    this.filteredPermissions = this.availablePermissions
      .filter(p => !selected.includes(p.key))
      .filter(p => p.key.toLowerCase().includes(q) || p.label.toLowerCase().includes(q))
      .slice(0, 100);
  }

  selectPermission(key: string) {
    const current: string[] = this.rightsForm.value.permissions || [];
    if (!current.includes(key)) {
      const next = [...current, key];
      this.rightsForm.patchValue({ permissions: next });
      this.permissionsCtrl.setValue('');
      this.applyPermFilter('');
    }
  }

  removePermission(key: string) {
    const current: string[] = this.rightsForm.value.permissions || [];
    const next = current.filter(k => k !== key);
    this.rightsForm.patchValue({ permissions: next });
    this.applyPermFilter(this.permissionsCtrl.value || '');
  }

  getPermLabel(key: string): string {
    return this.availablePermissions.find(p => p.key === key)?.label || key;
  }

  private showMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      panelClass: type === 'error' ? 'snackbar-error' : 'snackbar-success'
    });
  }
}
