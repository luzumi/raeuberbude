/**
 * Practical Integration Example: User Admin with EntityAdminDescriptor<T>
 * Shows how to migrate existing admin components to use the new builder
 */

import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  entityAdmin,
  EntityAdminDescriptor,
  badgeButton,
  action,
  column,
} from '../index';

/**
 * User entity type
 */
interface User {
  _id: string;
  username: string;
  email?: string;
  password?: string;
  role?: string;
  active?: boolean;
  createdAt?: Date;
}

/**
 * Example: Creating a descriptor in a component
 * This replaces large object literals in the template
 */
// @Component({
//   selector: 'app-admin-users-new',
//   template: `
//     <app-entity-admin-view [descriptor]="descriptor" [data]="users"></app-entity-admin-view>
//   `
// })
export class AdminUsersNewComponent implements OnInit {
  descriptor!: EntityAdminDescriptor<User>;
  users: User[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly snack: MatSnackBar,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.initializeDescriptor();
    this.loadUsers();
  }

  /**
   * Initialize descriptor using fluent API
   */
  private initializeDescriptor(): void {
    this.descriptor = entityAdmin<User>('users', 'User')
      .setTitle('Benutzerverwaltung')
      .setSubtitle('CRUD für Benutzer')
      .setIcon('group')
      .setApiUrl('/api/users')
      .setRequiredCapability('admin.users.view')
      
      // Columns
      .addColumns(
        column<User>('username', 'Benutzername', { sortable: true }),
        column<User>('email', 'E-Mail', { sortable: true }),
        column<User>('role', 'Rolle')
      )
      
      // Badges
      .addBadge(
        badgeButton<User>(
          'active',
          async (ctx) => {
            await this.toggleUserStatus(ctx.item);
          },
          {
            labelFn: (item) => item.active ? 'Aktiv' : 'Inaktiv',
            title: 'Status ändern',
            disabledIf: (item) => item.role === 'superadmin',
            cssClass: 'status-badge',
          }
        )
      )
      
      // Row actions
      .addActions(
        action<User>(
          'edit',
          'Bearbeiten',
          (ctx) => this.editUser(ctx.item),
          {
            icon: 'edit',
            color: 'primary',
          }
        ),
        action<User>(
          'delete',
          'Löschen',
          async (ctx) => {
            await this.deleteUser(ctx.item);
          },
          {
            icon: 'delete',
            color: 'warn',
            disabledIf: (item) => item.role === 'superadmin',
            requiredCapability: 'admin.users.delete',
          }
        )
      )
      
      // Global actions
      .addGlobalAction(
        action<User>(
          'create',
          'Neuer Benutzer',
          () => this.createUser(),
          {
            icon: 'add',
            color: 'primary',
            requiredCapability: 'admin.users.create',
          }
        )
      )
      
      // List settings
      .setPaginated(true, 20)
      .setSearchable(true, ['username', 'email'])
      
      .build();
  }

  /**
   * Alternative: Imperative push-style (TableDescriptor-like)
   */
  private initializeDescriptorImperative(): void {
    const builder = entityAdmin<User>('users', 'User');
    const descriptor = builder.get();

    // Direct property assignment
    descriptor.title = 'Benutzerverwaltung';
    descriptor.subtitle = 'CRUD für Benutzer';
    descriptor.icon = 'group';
    descriptor.apiUrl = '/api/users';
    descriptor.requiredCapability = 'admin.users.view';

    // Push columns (like old TableDescriptor)
    descriptor.view.list.columns.push(
      { field: 'username', label: 'Benutzername', sortable: true },
      { field: 'email', label: 'E-Mail', sortable: true },
      { field: 'role', label: 'Rolle' }
    );

    // Push badges
    descriptor.view.list.badges.push({
      field: 'active',
      renderAs: 'button',
      labelFn: (item) => item.active ? 'Aktiv' : 'Inaktiv',
      title: 'Status ändern',
      disabledIf: (item) => item.role === 'superadmin',
      onClick: async (ctx) => {
        await this.toggleUserStatus(ctx.item);
      },
    });

    // Push actions
    descriptor.view.list.actions.push(
      {
        id: 'edit',
        label: 'Bearbeiten',
        icon: 'edit',
        color: 'primary',
        onClick: (ctx) => this.editUser(ctx.item),
      },
      {
        id: 'delete',
        label: 'Löschen',
        icon: 'delete',
        color: 'warn',
        disabledIf: (item) => item.role === 'superadmin',
        requiredCapability: 'admin.users.delete',
        onClick: async (ctx) => {
          await this.deleteUser(ctx.item);
        },
      }
    );

    // Push global actions
    descriptor.globalActions!.push({
      id: 'create',
      label: 'Neuer Benutzer',
      icon: 'add',
      color: 'primary',
      requiredCapability: 'admin.users.create',
      onClick: () => this.createUser(),
    });

    // Configure settings
    descriptor.view.list.paginated = true;
    descriptor.view.list.pageSize = 20;
    descriptor.view.list.searchable = true;
    descriptor.view.list.searchFields = ['username', 'email'];

    this.descriptor = builder.build();
  }

  // Action handlers
  private async loadUsers(): Promise<void> {
    try {
      this.users = await firstValueFrom(
        this.http.get<User[]>('/api/users', { withCredentials: true })
      );
    } catch (e) {
      console.error(e);
      this.snack.open('Fehler beim Laden der Benutzer', 'Schließen', {
        duration: 3000,
      });
    }
  }

  private editUser(user: User): void {
    this.router.navigate(['/admin/users', user._id, 'edit']);
  }

  private async deleteUser(user: User): Promise<void> {
    if (!confirm(`Benutzer "${user.username}" löschen?`)) return;

    try {
      await firstValueFrom(
        this.http.delete(`/api/users/${user._id}`, { withCredentials: true })
      );
      this.snack.open('Benutzer gelöscht', 'Schließen', { duration: 2500 });
      await this.loadUsers();
    } catch (e) {
      console.error(e);
      this.snack.open('Löschen fehlgeschlagen', 'Schließen', {
        duration: 3000,
      });
    }
  }

  private createUser(): void {
    this.router.navigate(['/admin/users/new']);
  }

  private async toggleUserStatus(user: User): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(
          `/api/users/${user._id}`,
          { active: !user.active },
          { withCredentials: true }
        )
      );
      this.snack.open('Status aktualisiert', 'Schließen', { duration: 2500 });
      await this.loadUsers();
    } catch (e) {
      console.error(e);
      this.snack.open('Fehler beim Aktualisieren', 'Schließen', {
        duration: 3000,
      });
    }
  }
}

/**
 * Example: Descriptor as a factory function (reusable)
 */
export function createUserAdminDescriptor(
  handlers: {
    onEdit: (user: User) => void;
    onDelete: (user: User) => Promise<void>;
    onCreate: () => void;
    onToggleStatus: (user: User) => Promise<void>;
  }
): EntityAdminDescriptor<User> {
  return entityAdmin<User>('users', 'User')
    .setTitle('Benutzerverwaltung')
    .setIcon('group')
    .addColumns(
      column<User>('username', 'Benutzername', { sortable: true }),
      column<User>('email', 'E-Mail', { sortable: true })
    )
    .addBadge(
      badgeButton<User>(
        'active',
        (ctx) => handlers.onToggleStatus(ctx.item),
        {
          labelFn: (item) => item.active ? 'Aktiv' : 'Inaktiv',
          title: 'Status ändern',
        }
      )
    )
    .addAction(
      action<User>(
        'edit',
        'Bearbeiten',
        (ctx) => handlers.onEdit(ctx.item),
        { icon: 'edit', color: 'primary' }
      )
    )
    .addAction(
      action<User>(
        'delete',
        'Löschen',
        (ctx) => handlers.onDelete(ctx.item),
        { icon: 'delete', color: 'warn' }
      )
    )
    .addGlobalAction(
      action<User>('create', 'Neuer Benutzer', handlers.onCreate, {
        icon: 'add',
        color: 'primary',
      })
    )
    .setPaginated(true, 20)
    .build();
}

/**
 * Example: Using the factory in a component
 */
// @Component({...})
export class AdminUsersFactoryComponent implements OnInit {
  descriptor!: EntityAdminDescriptor<User>;
  users: User[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly snack: MatSnackBar,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.descriptor = createUserAdminDescriptor({
      onEdit: (user) => this.router.navigate(['/admin/users', user._id, 'edit']),
      onDelete: async (user) => {
        if (confirm(`Benutzer "${user.username}" löschen?`)) {
          await firstValueFrom(
            this.http.delete(`/api/users/${user._id}`, { withCredentials: true })
          );
          await this.loadUsers();
        }
      },
      onCreate: () => this.router.navigate(['/admin/users/new']),
      onToggleStatus: async (user) => {
        await firstValueFrom(
          this.http.patch(
            `/api/users/${user._id}`,
            { active: !user.active },
            { withCredentials: true }
          )
        );
        await this.loadUsers();
      },
    });

    this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    this.users = await firstValueFrom(
      this.http.get<User[]>('/api/users', { withCredentials: true })
    );
  }
}
