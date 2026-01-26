# Migration Guide: From Object Literals to EntityAdminDescriptor<T>

This guide helps you migrate existing admin components from object literals to the new TypeScript Builder pattern.

## Overview

**Before**: Large object literals defined inline in components or templates
**After**: Type-safe descriptors built with fluent or imperative API

## Benefits of Migration

1. **Type Safety**: Generic `EntityAdminDescriptor<T>` provides compile-time type checking
2. **Reusability**: Descriptors can be defined as factory functions and reused
3. **Maintainability**: Clear, structured configuration instead of nested objects
4. **Flexibility**: Choose between fluent API or imperative push-style
5. **Future-Proof**: Built-in capability gating for future rights management

## Migration Steps

### Step 1: Define Your Entity Type

First, create a TypeScript interface for your entity:

```typescript
// Before: Using 'any'
const data: any[] = [...];

// After: Using typed interface
interface User {
  _id: string;
  username: string;
  email?: string;
  role: string;
  active: boolean;
}

const data: User[] = [...];
```

### Step 2: Convert Configuration to Descriptor

#### Example: Simple Table Configuration

**Before** (Object Literal):
```typescript
@Component({
  template: `
    <table mat-table [dataSource]="users">
      <ng-container matColumnDef="username">
        <th mat-header-cell *matHeaderCellDef> Benutzername </th>
        <td mat-cell *matCellDef="let u"> {{u.username}} </td>
      </ng-container>
      
      <ng-container matColumnDef="email">
        <th mat-header-cell *matHeaderCellDef> E-Mail </th>
        <td mat-cell *matCellDef="let u"> {{u.email || '-'}} </td>
      </ng-container>
      
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef> Aktionen </th>
        <td mat-cell *matCellDef="let u">
          <button mat-icon-button (click)="edit(u)">
            <mat-icon>edit</mat-icon>
          </button>
        </td>
      </ng-container>
      
      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>
  `
})
export class OldComponent {
  users: any[] = [];
  displayedColumns = ['username', 'email', 'actions'];
  
  edit(user: any) { /* ... */ }
}
```

**After** (Using Descriptor):
```typescript
import { entityAdmin, column, action } from '@shared/framework/entity-admin';

@Component({
  template: `
    <app-entity-table [descriptor]="descriptor" [data]="users"></app-entity-table>
  `
})
export class NewComponent implements OnInit {
  descriptor!: EntityAdminDescriptor<User>;
  users: User[] = [];
  
  ngOnInit() {
    this.descriptor = entityAdmin<User>('users', 'User')
      .setTitle('Benutzerverwaltung')
      .addColumns(
        column<User>('username', 'Benutzername'),
        column<User>('email', 'E-Mail')
      )
      .addAction(
        action<User>('edit', 'Bearbeiten', (ctx) => this.edit(ctx.item), {
          icon: 'edit',
          color: 'primary'
        })
      )
      .build();
  }
  
  edit(user: User) { /* ... */ }
}
```

### Step 3: Migrate Badge Configurations

#### Before: Template-Based Badges

```typescript
@Component({
  template: `
    <div class="badges">
      <span *ngFor="let badge of badges" class="rb-badge">
        {{ item[badge.field] }}
      </span>
    </div>
  `
})
export class OldBadgeComponent {
  badges = [
    { field: 'role', label: 'Rolle' },
    { field: 'status', label: 'Status' }
  ];
}
```

#### After: Descriptor-Based Badges

```typescript
import { entityAdmin, badge, badgeButton } from '@shared/framework/entity-admin';

@Component({
  template: `
    <app-entity-view [descriptor]="descriptor" [data]="items"></app-entity-view>
  `
})
export class NewBadgeComponent implements OnInit {
  descriptor!: EntityAdminDescriptor<User>;
  
  ngOnInit() {
    this.descriptor = entityAdmin<User>('users', 'User')
      .addBadges(
        badge<User>('role', { label: 'Rolle' }),
        badge<User>('status', { label: 'Status' })
      )
      .build();
  }
}
```

### Step 4: Migrate Clickable Badges (Badge-Buttons)

#### Before: Manual Click Handling

```typescript
@Component({
  template: `
    <button *ngIf="isBadgeClickable(item, badge)"
            type="button"
            class="rb-badge rb-badge--button"
            [disabled]="isBadgeDisabled(item, badge)"
            (click)="onBadgeClick(item, badge, $event)">
      {{ resolveBadgeText(item, badge) }}
    </button>
  `
})
export class OldClickableBadgeComponent {
  isBadgeClickable(item: any, badge: any): boolean {
    return badge.onClick || badge.routerLink;
  }
  
  isBadgeDisabled(item: any, badge: any): boolean {
    return badge.disabledIf?.(item) ?? false;
  }
  
  onBadgeClick(item: any, badge: any, ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (badge.routerLink) return;
    badge.onClick?.({ item, badge, value: item[badge.field] });
  }
}
```

#### After: Descriptor-Based Badge-Buttons

```typescript
import { badgeButton, badgeLink } from '@shared/framework/entity-admin';

ngOnInit() {
  this.descriptor = entityAdmin<User>('users', 'User')
    .addBadge(
      badgeButton<User>(
        'active',
        async (ctx) => {
          await this.toggleStatus(ctx.item);
        },
        {
          labelFn: (item) => item.active ? 'Aktiv' : 'Inaktiv',
          title: 'Status ändern',
          disabledIf: (item) => item.role === 'superadmin'
        }
      )
    )
    .addBadge(
      badgeLink<User>(
        'profileLink',
        (ctx) => ['/users', ctx.item._id],
        {
          labelFn: () => 'Profil',
          title: 'Profil anzeigen'
        }
      )
    )
    .build();
}
```

### Step 5: Choose Your Configuration Style

You have two options:

#### Option A: Fluent API (Recommended for Simple Cases)

```typescript
ngOnInit() {
  this.descriptor = entityAdmin<User>('users', 'User')
    .setTitle('Benutzerverwaltung')
    .setIcon('group')
    .addColumn(column('username', 'Benutzername'))
    .addColumn(column('email', 'E-Mail'))
    .addAction(action('edit', 'Bearbeiten', (ctx) => this.edit(ctx.item)))
    .build();
}
```

#### Option B: Imperative Push-Style (Like TableDescriptor)

```typescript
ngOnInit() {
  const builder = entityAdmin<User>('users', 'User');
  const descriptor = builder.get();
  
  descriptor.title = 'Benutzerverwaltung';
  descriptor.icon = 'group';
  
  descriptor.view.list.columns.push(
    { field: 'username', label: 'Benutzername' },
    { field: 'email', label: 'E-Mail' }
  );
  
  descriptor.view.list.actions.push({
    id: 'edit',
    label: 'Bearbeiten',
    onClick: (ctx) => this.edit(ctx.item)
  });
  
  this.descriptor = builder.build();
}
```

#### Option C: Mixed Approach (Best for Complex Cases)

```typescript
ngOnInit() {
  const builder = entityAdmin<User>('users', 'User')
    .setTitle('Benutzerverwaltung')
    .setIcon('group');
  
  const descriptor = builder.get();
  
  // Conditional logic
  if (this.showEmailColumn) {
    descriptor.view.list.columns.push({ field: 'email', label: 'E-Mail' });
  }
  
  // Dynamic badges
  this.getBadgeConfigs().forEach(config => {
    descriptor.view.list.badges.push(config);
  });
  
  this.descriptor = builder.build();
}
```

## Common Patterns

### Pattern 1: Factory Functions for Reusability

```typescript
// shared/descriptors/user.descriptor.ts
export function createUserDescriptor(
  handlers: UserHandlers
): EntityAdminDescriptor<User> {
  return entityAdmin<User>('users', 'User')
    .setTitle('Benutzerverwaltung')
    .addColumn(column('username', 'Benutzername'))
    .addAction(action('edit', 'Edit', (ctx) => handlers.onEdit(ctx.item)))
    .build();
}

// In component:
ngOnInit() {
  this.descriptor = createUserDescriptor({
    onEdit: (user) => this.router.navigate(['/users', user._id])
  });
}
```

### Pattern 2: Conditional Configuration

```typescript
ngOnInit() {
  const builder = entityAdmin<User>('users', 'User')
    .setTitle('Benutzerverwaltung');
  
  // Add columns based on permissions
  const columns = ['username', 'email'];
  if (this.hasPermission('view.role')) {
    columns.push('role');
  }
  
  columns.forEach(field => {
    builder.addColumn({ field, label: this.getLabel(field) });
  });
  
  this.descriptor = builder.build();
}
```

### Pattern 3: Configuration from Backend

```typescript
async ngOnInit() {
  const config = await this.loadConfigFromBackend();
  
  const builder = entityAdmin<User>('users', 'User')
    .setTitle(config.title)
    .setIcon(config.icon);
  
  config.columns.forEach(col => builder.addColumn(col));
  config.badges.forEach(badge => builder.addBadge(badge));
  
  this.descriptor = builder.build();
}
```

## Capability Gating Preparation

Add `requiredCapability` fields now for future rights management:

```typescript
entityAdmin<User>('users', 'User')
  .setRequiredCapability('admin.users.view')  // Whole descriptor
  .addColumn(
    column('email', 'E-Mail', {
      requiredCapability: 'admin.users.view.email'  // Specific column
    })
  )
  .addAction(
    action('delete', 'Löschen', handler, {
      requiredCapability: 'admin.users.delete'  // Specific action
    })
  )
  .build();
```

Currently these are stored but not enforced. Future renderer implementations will filter based on user capabilities.

## Troubleshooting

### Issue: Type Errors with Callbacks

**Problem**: TypeScript complains about property access in callbacks

**Solution**: Specify the generic type parameter:
```typescript
// ❌ Wrong
entityAdmin('users', 'User')
  .addBadge({
    field: 'username',
    labelFn: (item) => item.username  // Error: 'item' is any
  })

// ✅ Correct
entityAdmin<User>('users', 'User')
  .addBadge({
    field: 'username',
    labelFn: (item) => item.username  // OK: item is User
  })
```

### Issue: Mutations After Build

**Problem**: Changes to descriptor don't reflect in UI

**Solution**: Use `buildShallow()` if you need to keep mutating, or rebuild after changes:
```typescript
const builder = entityAdmin<User>('users', 'User');
const descriptor = builder.get();

// Mutate
descriptor.title = 'New Title';

// Must rebuild
this.descriptor = builder.build();
```

## Next Steps

1. Start with a simple component
2. Migrate column definitions first
3. Add badges and actions
4. Test thoroughly
5. Move to factory functions for reusability
6. Add capability strings for future rights management

For more examples, see:
- `entity-admin.examples.ts` - 5 comprehensive examples
- `entity-admin.integration-example.ts` - Real-world integration patterns
- `README.md` - Full API documentation
