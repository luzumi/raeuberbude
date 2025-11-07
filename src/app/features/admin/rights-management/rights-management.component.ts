import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { MatChipModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

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
    MatChipModule,
    MatSnackBarModule
  ],
  templateUrl: './rights-management.component.html',
  styleUrls: ['./rights-management.component.scss']
})
export class RightsManagementComponent implements OnInit {
  userRights: UserRights[] = [];
  terminals: Terminal[] = [];
  users: any[] = [];
  
  rightsForm: FormGroup;
  terminalForm: FormGroup;
  
  selectedUserRights: UserRights | null = null;
  selectedTerminal: Terminal | null = null;
  
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

  private apiUrl = `${environment.apiUrl || 'http://localhost:3001'}/api`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.rightsForm = this.createRightsForm();
    this.terminalForm = this.createTerminalForm();
  }

  ngOnInit(): void {
    this.loadData();
  }

  private createRightsForm(): FormGroup {
    return this.fb.group({
      userId: ['', Validators.required],
      role: ['regular', Validators.required],
      permissions: [[]],
      canUseSpeechInput: [true],
      canManageTerminals: [false],
      canManageUsers: [false],
      canViewOwnInputs: [true],
      canViewAllInputs: [false],
      canDeleteInputs: [false],
      status: ['active'],
      allowedTerminals: [[]]
    });
  }

  private createTerminalForm(): FormGroup {
    return this.fb.group({
      terminalId: ['', Validators.required],
      name: ['', Validators.required],
      type: ['browser', Validators.required],
      status: ['active', Validators.required],
      location: [''],
      assignedUserId: ['']
    });
  }

  private async loadData(): Promise<void> {
    try {
      // Load user rights
      const rightsResponse = await this.http.get<any>(`${this.apiUrl}/speech/rights`).toPromise();
      this.userRights = rightsResponse.data || [];

      // Load terminals
      const terminalsResponse = await this.http.get<any>(`${this.apiUrl}/speech/terminals`).toPromise();
      this.terminals = terminalsResponse.data || [];

      // Load users
      const usersResponse = await this.http.get<any[]>(`${this.apiUrl}/users`).toPromise();
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
  }

  async saveUserRights(): Promise<void> {
    if (!this.rightsForm.valid) {
      this.showMessage('Bitte alle Pflichtfelder ausfüllen', 'error');
      return;
    }

    const formData = this.rightsForm.value;
    
    try {
      if (this.selectedUserRights) {
        // Update existing rights
        const userId = this.selectedUserRights.userId?._id || this.selectedUserRights.userId;
        await this.http.put(`${this.apiUrl}/speech/rights/user/${userId}`, formData).toPromise();
        this.showMessage('Benutzerrechte aktualisiert', 'success');
      } else {
        // Create new rights
        await this.http.post(`${this.apiUrl}/speech/rights`, formData).toPromise();
        this.showMessage('Benutzerrechte erstellt', 'success');
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
      await this.http.delete(`${this.apiUrl}/speech/rights/user/${userId}`).toPromise();
      this.showMessage('Benutzerrechte gelöscht', 'success');
      this.loadData();
    } catch (error) {
      console.error('Failed to delete user rights:', error);
      this.showMessage('Fehler beim Löschen der Benutzerrechte', 'error');
    }
  }

  async assignRole(userId: string, role: string): Promise<void> {
    try {
      await this.http.put(`${this.apiUrl}/speech/rights/user/${userId}/role`, { role }).toPromise();
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
        await this.http.put(`${this.apiUrl}/speech/rights/user/${userId}/suspend`, {
          reason: 'Admin action'
        }).toPromise();
      } else {
        await this.http.put(`${this.apiUrl}/speech/rights/user/${userId}/activate`, {}).toPromise();
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
    
    try {
      if (this.selectedTerminal) {
        // Update existing terminal
        const id = this.selectedTerminal._id || this.selectedTerminal.terminalId;
        await this.http.put(`${this.apiUrl}/speech/terminals/${id}`, formData).toPromise();
        this.showMessage('Terminal aktualisiert', 'success');
      } else {
        // Create new terminal
        await this.http.post(`${this.apiUrl}/speech/terminals`, formData).toPromise();
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
      await this.http.delete(`${this.apiUrl}/speech/terminals/${id}`).toPromise();
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
      await this.http.put(`${this.apiUrl}/speech/terminals/${terminal.terminalId}/status`, {
        status: newStatus
      }).toPromise();
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
      status: 'active'
    });
  }

  // Helper Methods
  getUserName(userId: any): string {
    const id = userId?._id || userId;
    const user = this.users.find(u => u._id === id);
    return user ? user.name || user.email : 'Unbekannt';
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
  }

  private showMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 3000,
      panelClass: type === 'error' ? 'snackbar-error' : 'snackbar-success'
    });
  }
}
