/**
 * Example usage of EntityAdminDescriptor Builder
 * Demonstrates both fluent API and imperative push-style configuration
 */

import {
  entityAdmin,
  badge,
  badgeButton,
  badgeLink,
  column,
  action,
  actionLink,
  EntityAdminDescriptor,
} from './index';

/**
 * Example: User entity type
 */
interface User {
  _id: string;
  username: string;
  email?: string;
  role: string;
  active: boolean;
  createdAt: Date;
}

/**
 * Example 1: Fluent API style
 */
export function createUserDescriptorFluent(): EntityAdminDescriptor<User> {
  return entityAdmin<User>('users', 'User')
    .setTitle('Benutzerverwaltung')
    .setSubtitle('Verwaltung von Benutzern und deren Rechten')
    .setIcon('group')
    .setApiUrl('/api/users')
    .setRequiredCapability('admin.users.view')
    .addColumns(
      column<User>('username', 'Benutzername', { sortable: true }),
      column<User>('email', 'E-Mail', { sortable: true }),
      column<User>('role', 'Rolle')
    )
    .addBadge(
      badge<User>('role', {
        label: 'Rolle',
        cssClass: 'role-badge',
      })
    )
    .addBadge(
      badgeButton<User>(
        'active',
        async (ctx) => {
          console.log('Toggle active status for', ctx.item.username);
          // API call to toggle active status
        },
        {
          labelFn: (item) => (item.active ? 'Aktiv' : 'Inaktiv'),
          title: 'Status ändern',
          disabledIf: (item) => item.role === 'superadmin',
        }
      )
    )
    .addActions(
      action<User>(
        'edit',
        'Bearbeiten',
        (ctx) => {
          console.log('Edit user', ctx.item.username);
        },
        {
          icon: 'edit',
          color: 'primary',
        }
      ),
      action<User>(
        'delete',
        'Löschen',
        async (ctx) => {
          if (confirm(`Benutzer "${ctx.item.username}" löschen?`)) {
            console.log('Delete user', ctx.item.username);
            // API call to delete
          }
        },
        {
          icon: 'delete',
          color: 'warn',
          disabledIf: (item) => item.role === 'superadmin',
        }
      )
    )
    .addGlobalAction(
      action<User>(
        'create',
        'Neuer Benutzer',
        () => {
          console.log('Create new user');
        },
        {
          icon: 'add',
          color: 'primary',
        }
      )
    )
    .setPaginated(true, 20)
    .setSearchable(true, ['username', 'email'])
    .build();
}

/**
 * Example 2: Imperative push-style (TableDescriptor-like approach)
 */
export function createUserDescriptorImperative(): EntityAdminDescriptor<User> {
  const builder = entityAdmin<User>('users', 'User');
  const descriptor = builder.get();

  // Direct property assignment
  descriptor.title = 'Benutzerverwaltung';
  descriptor.subtitle = 'Verwaltung von Benutzern und deren Rechten';
  descriptor.icon = 'group';
  descriptor.apiUrl = '/api/users';
  descriptor.requiredCapability = 'admin.users.view';

  // Push columns
  descriptor.view.list.columns.push(
    { field: 'username', label: 'Benutzername', sortable: true },
    { field: 'email', label: 'E-Mail', sortable: true },
    { field: 'role', label: 'Rolle' }
  );

  // Push badges
  descriptor.view.list.badges.push({
    field: 'role',
    label: 'Rolle',
    cssClass: 'role-badge',
  });

  descriptor.view.list.badges.push({
    field: 'active',
    renderAs: 'button',
    labelFn: (item) => (item.active ? 'Aktiv' : 'Inaktiv'),
    title: 'Status ändern',
    disabledIf: (item) => item.role === 'superadmin',
    onClick: async (ctx) => {
      console.log('Toggle active status for', ctx.item.username);
      // API call to toggle active status
    },
  });

  // Push actions
  descriptor.view.list.actions.push({
    id: 'edit',
    label: 'Bearbeiten',
    icon: 'edit',
    color: 'primary',
    onClick: (ctx) => {
      console.log('Edit user', ctx.item.username);
    },
  });

  descriptor.view.list.actions.push({
    id: 'delete',
    label: 'Löschen',
    icon: 'delete',
    color: 'warn',
    disabledIf: (item) => item.role === 'superadmin',
    onClick: async (ctx) => {
      if (confirm(`Benutzer "${ctx.item.username}" löschen?`)) {
        console.log('Delete user', ctx.item.username);
        // API call to delete
      }
    },
  });

  // Push global actions
  descriptor.globalActions!.push({
    id: 'create',
    label: 'Neuer Benutzer',
    icon: 'add',
    color: 'primary',
    onClick: () => {
      console.log('Create new user');
    },
  });

  // Configure list view settings
  descriptor.view.list.paginated = true;
  descriptor.view.list.pageSize = 20;
  descriptor.view.list.searchable = true;
  descriptor.view.list.searchFields = ['username', 'email'];

  return builder.build();
}

/**
 * Example 3: Badge with router link
 */
export function createRoleDescriptorWithLinks(): EntityAdminDescriptor<any> {
  return entityAdmin('roles', 'Role')
    .setTitle('Rollenverwaltung')
    .setIcon('badge')
    .addColumn(column('name', 'Rollenname'))
    .addBadge(
      badgeLink(
        'userCount',
        (ctx) => ['/admin/users', { role: ctx.item.name }],
        {
          labelFn: (item) => `${item.userCount} Benutzer`,
          title: 'Benutzer mit dieser Rolle anzeigen',
        }
      )
    )
    .build();
}

/**
 * Example 4: Detail view configuration
 */
export function createUserDescriptorWithDetail(): EntityAdminDescriptor<User> {
  return entityAdmin<User>('users', 'User')
    .setTitle('Benutzerverwaltung')
    .addColumn(column('username', 'Benutzername'))
    .addDetailField({
      field: 'username',
      label: 'Benutzername',
    })
    .addDetailField({
      field: 'email',
      label: 'E-Mail',
    })
    .addDetailField({
      field: 'createdAt',
      label: 'Erstellt am',
      valueFn: (item) => new Date(item.createdAt).toLocaleDateString('de-DE'),
    })
    .addDetailBadge(
      badge<User>('role', {
        label: 'Rolle',
      })
    )
    .addDetailAction(
      actionLink<User>('edit', 'Bearbeiten', (ctx) => `/admin/users/${ctx.item._id}/edit`, {
        icon: 'edit',
        color: 'primary',
      })
    )
    .build();
}

/**
 * Example 5: Mixed approach - start fluent, then switch to imperative
 */
export function createUserDescriptorMixed(): EntityAdminDescriptor<User> {
  const builder = entityAdmin<User>('users', 'User')
    .setTitle('Benutzerverwaltung')
    .setIcon('group')
    .setApiUrl('/api/users');

  // Switch to imperative for specific customizations
  const descriptor = builder.get();

  // Conditionally add columns based on some logic
  const columns = ['username', 'email'];
  if (shouldShowRole()) {
    columns.push('role');
  }

  columns.forEach((field) => {
    descriptor.view.list.columns.push({
      field,
      label: field.charAt(0).toUpperCase() + field.slice(1),
      sortable: true,
    });
  });

  // Add dynamic badges based on configuration
  const badgeConfigs = getBadgeConfigurations();
  badgeConfigs.forEach((config) => {
    descriptor.view.list.badges.push(config);
  });

  return builder.build();
}

// Helper functions for example 5
function shouldShowRole(): boolean {
  return true; // Example logic
}

function getBadgeConfigurations(): any[] {
  return []; // Example logic
}
