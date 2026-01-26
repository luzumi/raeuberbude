/**
 * Unit tests for EntityAdminDescriptor Builder
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
  EntityAdminDescriptorBuilder,
} from './entity-admin.builder';

describe('EntityAdminDescriptor Builder', () => {
  interface TestUser {
    id: string;
    username: string;
    email: string;
    role: string;
    active: boolean;
  }

  describe('Factory Function', () => {
    it('should create a builder instance', () => {
      const builder = entityAdmin<TestUser>('users', 'User');
      expect(builder).toBeInstanceOf(EntityAdminDescriptorBuilder);
    });

    it('should initialize with basic structure', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User').build();
      expect(descriptor.id).toBe('users');
      expect(descriptor.entityType).toBe('User');
      expect(descriptor.title).toBe('User');
      expect(descriptor.view.list).toBeDefined();
      expect(descriptor.view.list.columns).toEqual([]);
      expect(descriptor.view.list.badges).toEqual([]);
      expect(descriptor.view.list.actions).toEqual([]);
    });
  });

  describe('Fluent API', () => {
    it('should set basic properties via fluent methods', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .setTitle('User Management')
        .setSubtitle('Manage system users')
        .setIcon('people')
        .setApiUrl('/api/users')
        .build();

      expect(descriptor.title).toBe('User Management');
      expect(descriptor.subtitle).toBe('Manage system users');
      expect(descriptor.icon).toBe('people');
      expect(descriptor.apiUrl).toBe('/api/users');
    });

    it('should add columns via fluent methods', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addColumn({ field: 'username', label: 'Username' })
        .addColumn({ field: 'email', label: 'Email' })
        .build();

      expect(descriptor.view.list.columns.length).toBe(2);
      expect(descriptor.view.list.columns[0].field).toBe('username');
      expect(descriptor.view.list.columns[1].field).toBe('email');
    });

    it('should add multiple columns at once', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addColumns(
          { field: 'username', label: 'Username' },
          { field: 'email', label: 'Email' }
        )
        .build();

      expect(descriptor.view.list.columns.length).toBe(2);
    });

    it('should add badges via fluent methods', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addBadge({ field: 'role', label: 'Role' })
        .build();

      expect(descriptor.view.list.badges.length).toBe(1);
      expect(descriptor.view.list.badges[0].field).toBe('role');
    });

    it('should add actions via fluent methods', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addAction({
          id: 'edit',
          label: 'Edit',
          icon: 'edit',
          onClick: () => {},
        })
        .build();

      expect(descriptor.view.list.actions.length).toBe(1);
      expect(descriptor.view.list.actions[0].id).toBe('edit');
    });

    it('should configure list view settings', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .setPaginated(true, 25)
        .setSearchable(true, ['username', 'email'])
        .setSelectable(true)
        .build();

      expect(descriptor.view.list.paginated).toBe(true);
      expect(descriptor.view.list.pageSize).toBe(25);
      expect(descriptor.view.list.searchable).toBe(true);
      expect(descriptor.view.list.searchFields).toEqual(['username', 'email']);
      expect(descriptor.view.list.selectable).toBe(true);
    });

    it('should add global actions', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addGlobalAction({
          id: 'create',
          label: 'New User',
          icon: 'add',
          onClick: () => {},
        })
        .build();

      expect(descriptor.globalActions?.length).toBe(1);
      expect(descriptor.globalActions?.[0].id).toBe('create');
    });
  });

  describe('Imperative API', () => {
    it('should allow direct property access', () => {
      const builder = entityAdmin<TestUser>('users', 'User');
      const descriptor = builder.get();

      descriptor.title = 'Custom Title';
      descriptor.icon = 'custom_icon';

      const final = builder.build();
      expect(final.title).toBe('Custom Title');
      expect(final.icon).toBe('custom_icon');
    });

    it('should allow push-style array manipulation', () => {
      const builder = entityAdmin<TestUser>('users', 'User');
      const descriptor = builder.get();

      descriptor.view.list.columns.push(
        { field: 'username', label: 'Username' },
        { field: 'email', label: 'Email' }
      );

      descriptor.view.list.badges.push({ field: 'role' });

      const final = builder.build();
      expect(final.view.list.columns.length).toBe(2);
      expect(final.view.list.badges.length).toBe(1);
    });
  });

  describe('Detail View', () => {
    it('should initialize detail view', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .initializeDetailView()
        .build();

      expect(descriptor.view.detail).toBeDefined();
      expect(descriptor.view.detail?.fields).toEqual([]);
      expect(descriptor.view.detail?.badges).toEqual([]);
      expect(descriptor.view.detail?.actions).toEqual([]);
    });

    it('should add detail fields', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addDetailField({ field: 'username', label: 'Username' })
        .addDetailField({ field: 'email', label: 'Email' })
        .build();

      expect(descriptor.view.detail?.fields.length).toBe(2);
    });

    it('should add detail badges and actions', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addDetailBadge({ field: 'role' })
        .addDetailAction({ id: 'edit', label: 'Edit', onClick: () => {} })
        .build();

      expect(descriptor.view.detail?.badges.length).toBe(1);
      expect(descriptor.view.detail?.actions.length).toBe(1);
    });
  });

  describe('Helper Functions', () => {
    it('should create badge config', () => {
      const b = badge<TestUser>('role', { label: 'Role', cssClass: 'role-badge' });
      expect(b.field).toBe('role');
      expect(b.label).toBe('Role');
      expect(b.cssClass).toBe('role-badge');
    });

    it('should create badge-button config', () => {
      const onClick = jest.fn();
      const b = badgeButton<TestUser>('active', onClick, { title: 'Toggle' });
      expect(b.field).toBe('active');
      expect(b.renderAs).toBe('button');
      expect(b.onClick).toBe(onClick);
      expect(b.title).toBe('Toggle');
    });

    it('should create badge-link config', () => {
      const b = badgeLink<TestUser>('profile', '/users/:id', { title: 'View Profile' });
      expect(b.field).toBe('profile');
      expect(b.renderAs).toBe('button');
      expect(b.routerLink).toBe('/users/:id');
      expect(b.title).toBe('View Profile');
    });

    it('should create column config', () => {
      const c = column<TestUser>('username', 'Username', { sortable: true, width: '200px' });
      expect(c.field).toBe('username');
      expect(c.label).toBe('Username');
      expect(c.sortable).toBe(true);
      expect(c.width).toBe('200px');
    });

    it('should create action config', () => {
      const onClick = jest.fn();
      const a = action<TestUser>('edit', 'Edit', onClick, { icon: 'edit', color: 'primary' });
      expect(a.id).toBe('edit');
      expect(a.label).toBe('Edit');
      expect(a.onClick).toBe(onClick);
      expect(a.icon).toBe('edit');
      expect(a.color).toBe('primary');
    });

    it('should create action-link config', () => {
      const a = actionLink<TestUser>('view', 'View', '/users/:id', { icon: 'visibility' });
      expect(a.id).toBe('view');
      expect(a.label).toBe('View');
      expect(a.routerLink).toBe('/users/:id');
      expect(a.icon).toBe('visibility');
    });
  });

  describe('Type Safety', () => {
    it('should provide typed context in callbacks', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addBadge({
          field: 'active',
          labelFn: (item) => {
            // TypeScript should know item is TestUser
            return item.username + (item.active ? ' (active)' : ' (inactive)');
          },
        })
        .addAction({
          id: 'edit',
          label: 'Edit',
          onClick: (ctx) => {
            // TypeScript should know ctx.item is TestUser
            const username = ctx.item.username;
            expect(typeof username).toBe('string');
          },
        })
        .build();

      expect(descriptor.view.list.badges[0].labelFn).toBeDefined();
      expect(descriptor.view.list.actions[0].onClick).toBeDefined();
    });
  });

  describe('Capability Gating', () => {
    it('should support required capability on descriptor', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .setRequiredCapability('admin.users.view')
        .build();

      expect(descriptor.requiredCapability).toBe('admin.users.view');
    });

    it('should support required capability on columns', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addColumn({
          field: 'email',
          label: 'Email',
          requiredCapability: 'admin.users.view.email',
        })
        .build();

      expect(descriptor.view.list.columns[0].requiredCapability).toBe('admin.users.view.email');
    });

    it('should support required capability on badges', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addBadge({
          field: 'role',
          requiredCapability: 'admin.users.view.role',
        })
        .build();

      expect(descriptor.view.list.badges[0].requiredCapability).toBe('admin.users.view.role');
    });

    it('should support required capability on actions', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addAction({
          id: 'delete',
          label: 'Delete',
          onClick: () => {},
          requiredCapability: 'admin.users.delete',
        })
        .build();

      expect(descriptor.view.list.actions[0].requiredCapability).toBe('admin.users.delete');
    });
  });

  describe('Build Methods', () => {
    it('should create deep copy with build()', () => {
      const builder = entityAdmin<TestUser>('users', 'User').addColumn({ field: 'username' });
      const descriptor1 = builder.build();
      const descriptor2 = builder.build();

      // Modify one
      descriptor1.title = 'Modified';

      // Other should be unchanged
      expect(descriptor2.title).toBe('User');
    });

    it('should return reference with buildShallow()', () => {
      const builder = entityAdmin<TestUser>('users', 'User');
      const descriptor = builder.buildShallow();

      // Should be same reference
      expect(descriptor).toBe(builder.get());
    });
  });

  describe('Metadata', () => {
    it('should allow setting metadata', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .setMetadata('customKey', 'customValue')
        .setMetadata('anotherKey', 123)
        .build();

      expect(descriptor.metadata?.customKey).toBe('customValue');
      expect(descriptor.metadata?.anotherKey).toBe(123);
    });
  });

  describe('Badge Click Context', () => {
    it('should provide correct context structure to badge onClick', () => {
      let capturedContext: any;
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addBadge({
          field: 'active',
          onClick: (ctx) => {
            capturedContext = ctx;
          },
        })
        .build();

      const mockItem: TestUser = {
        id: '1',
        username: 'test',
        email: 'test@example.com',
        role: 'admin',
        active: true,
      };

      const badge = descriptor.view.list.badges[0];
      const value = true;

      // Simulate click
      badge.onClick?.({ item: mockItem, badge, value });

      expect(capturedContext).toBeDefined();
      expect(capturedContext.item).toBe(mockItem);
      expect(capturedContext.badge).toBe(badge);
      expect(capturedContext.value).toBe(value);
    });
  });

  describe('RouterLink Support', () => {
    it('should support string routerLink', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addBadge({
          field: 'profile',
          routerLink: '/users/profile',
        })
        .build();

      expect(descriptor.view.list.badges[0].routerLink).toBe('/users/profile');
    });

    it('should support array routerLink', () => {
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addBadge({
          field: 'profile',
          routerLink: ['/users', 'profile'],
        })
        .build();

      expect(descriptor.view.list.badges[0].routerLink).toEqual(['/users', 'profile']);
    });

    it('should support function routerLink', () => {
      const routerLinkFn = (ctx: any) => ['/users', ctx.item.id];
      const descriptor = entityAdmin<TestUser>('users', 'User')
        .addBadge({
          field: 'profile',
          routerLink: routerLinkFn,
        })
        .build();

      expect(descriptor.view.list.badges[0].routerLink).toBe(routerLinkFn);
    });
  });
});
