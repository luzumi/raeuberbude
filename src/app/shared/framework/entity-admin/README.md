# Entity Admin Framework

A TypeScript-first framework for building type-safe admin interfaces with a fluent builder pattern.

## Overview

The Entity Admin Framework provides a structured way to define admin configurations for entities using TypeScript's generic types and builder pattern. It supports both fluent method chaining and imperative push-style configuration, similar to the classic `TableDescriptor` pattern.

## Key Features

- **Generic Types (`EntityAdminDescriptor<T>`)**: Full type safety when working with entity fields and callbacks
- **Fluent Builder API**: Chain methods for readable, declarative configuration
- **Imperative Push-Style**: Direct property access and array manipulation (e.g., `descriptor.view.list.badges.push(...)`)
- **Badge-Button Support**: Badges can be clickable with `onClick` or `routerLink`
- **Capability Gating**: Prepare for future rights management with `requiredCapability` properties
- **Flexible Configuration**: Mix fluent and imperative styles as needed

## Installation

```typescript
import { entityAdmin, badge, badgeButton, column, action } from '@shared/framework/entity-admin';
```

## Quick Start

### Fluent API Style

```typescript
interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
}

const descriptor = entityAdmin<User>('users', 'User')
  .setTitle('Benutzerverwaltung')
  .setIcon('group')
  .setApiUrl('/api/users')
  .addColumns(
    column<User>('username', 'Benutzername', { sortable: true }),
    column<User>('email', 'E-Mail', { sortable: true }),
    column<User>('role', 'Rolle')
  )
  .addBadge(
    badgeButton<User>(
      'active',
      async (ctx) => {
        // Toggle active status
        await updateUserStatus(ctx.item._id, !ctx.item.active);
      },
      {
        labelFn: (item) => item.active ? 'Aktiv' : 'Inaktiv',
        title: 'Status ändern'
      }
    )
  )
  .addAction(
    action<User>('edit', 'Bearbeiten', (ctx) => {
      navigateToEdit(ctx.item._id);
    }, { icon: 'edit', color: 'primary' })
  )
  .setPaginated(true, 20)
  .setSearchable(true, ['username', 'email'])
  .build();
```

### Imperative Push-Style (TableDescriptor-like)

```typescript
const builder = entityAdmin<User>('users', 'User');
const descriptor = builder.get();

// Direct property assignment
descriptor.title = 'Benutzerverwaltung';
descriptor.icon = 'group';
descriptor.apiUrl = '/api/users';

// Push columns
descriptor.view.list.columns.push(
  { field: 'username', label: 'Benutzername', sortable: true },
  { field: 'email', label: 'E-Mail', sortable: true }
);

// Push badges
descriptor.view.list.badges.push({
  field: 'active',
  renderAs: 'button',
  labelFn: (item) => item.active ? 'Aktiv' : 'Inaktiv',
  onClick: async (ctx) => {
    await updateUserStatus(ctx.item._id, !ctx.item.active);
  }
});

// Push actions
descriptor.view.list.actions.push({
  id: 'edit',
  label: 'Bearbeiten',
  icon: 'edit',
  onClick: (ctx) => navigateToEdit(ctx.item._id)
});

// Configure settings
descriptor.view.list.paginated = true;
descriptor.view.list.pageSize = 20;

const final = builder.build();
```

## Core Concepts

### EntityAdminDescriptor<T>

The main configuration object for an entity admin interface. Uses generics for type safety.

```typescript
interface EntityAdminDescriptor<T> {
  id: string;                      // Unique identifier
  entityType: string;              // Entity type name
  title: string;                   // Display title
  subtitle?: string;               // Description
  apiUrl?: string;                 // API endpoint
  icon?: string;                   // Material icon
  view: EntityViewConfig<T>;       // View configuration
  globalActions?: EntityItemAction<T>[]; // Top-level actions
  requiredCapability?: string;     // Capability required to access
}
```

### Badges and Badge-Buttons

Badges are display elements that show entity properties. They can optionally be made clickable:

```typescript
interface EntityBadgeConfig<T> {
  field: string;                   // Field to display
  label?: string;                  // Optional label
  labelFn?: (item: T) => string;   // Custom label function
  valueFn?: (item: T) => any;      // Custom value function
  visibleIf?: (item: T) => boolean; // Visibility condition
  
  // Badge-Button features
  renderAs?: 'badge' | 'button';   // Render style
  title?: string;                  // Tooltip
  disabledIf?: (item: T) => boolean; // Disabled condition
  onClick?: (ctx: BadgeClickContext<T>) => void | Promise<void>;
  routerLink?: string | any[] | ((ctx) => string | any[]);
  
  requiredCapability?: string;     // Capability required
}
```

**Important Badge Rules:**
- Badges are **display elements**, not form inputs
- Clicks trigger **UI actions only** (navigation, dialogs, API calls)
- `routerLink` takes precedence over `onClick`
- Clicks automatically call `stopPropagation()` (won't trigger row selection)

### Helper Functions

#### badge<T>()
Create a simple display badge:
```typescript
badge<User>('role', { label: 'Rolle', cssClass: 'role-badge' })
```

#### badgeButton<T>()
Create a clickable badge:
```typescript
badgeButton<User>(
  'active',
  async (ctx) => { /* handle click */ },
  { labelFn: (item) => item.active ? 'Aktiv' : 'Inaktiv' }
)
```

#### badgeLink<T>()
Create a badge with router navigation:
```typescript
badgeLink<User>(
  'profileLink',
  (ctx) => ['/users', ctx.item._id],
  { labelFn: () => 'Profil anzeigen' }
)
```

#### column<T>()
Create a column configuration:
```typescript
column<User>('username', 'Benutzername', { sortable: true, width: '200px' })
```

#### action<T>()
Create an action with onClick:
```typescript
action<User>('delete', 'Löschen', 
  async (ctx) => { /* delete logic */ },
  { icon: 'delete', color: 'warn' }
)
```

#### actionLink<T>()
Create an action with router navigation:
```typescript
actionLink<User>('edit', 'Bearbeiten',
  (ctx) => `/users/${ctx.item._id}/edit`,
  { icon: 'edit', color: 'primary' }
)
```

## Builder Methods

### Configuration Methods

- `setTitle(title: string)`: Set display title
- `setSubtitle(subtitle: string)`: Set subtitle
- `setApiUrl(url: string)`: Set API endpoint
- `setIcon(icon: string)`: Set Material icon
- `setRequiredCapability(capability: string)`: Set required capability

### List View Methods

- `addColumn(column)`: Add a single column
- `addColumns(...columns)`: Add multiple columns
- `addBadge(badge)`: Add a single badge
- `addBadges(...badges)`: Add multiple badges
- `addAction(action)`: Add a single action
- `addActions(...actions)`: Add multiple actions
- `addGlobalAction(action)`: Add a global action
- `setSelectable(boolean)`: Enable/disable selection
- `setPaginated(boolean, pageSize?)`: Configure pagination
- `setSearchable(boolean, fields?)`: Configure search

### Detail View Methods

- `initializeDetailView()`: Initialize detail view
- `addDetailField(field)`: Add detail field
- `addDetailBadge(badge)`: Add detail badge
- `addDetailAction(action)`: Add detail action

### Access Methods

- `get()`: Get descriptor for imperative manipulation
- `build()`: Build final descriptor (deep copy)
- `buildShallow()`: Build without deep copy (faster)

## Click Context

Badge and action click handlers receive a context object with full type information:

```typescript
interface BadgeClickContext<T> {
  item: T;                         // The entity item
  badge: EntityBadgeConfig<T>;     // The badge config
  value: any;                      // The badge value
}

interface ActionContext<T> {
  item: T;                         // The entity item
  action: EntityItemAction<T>;     // The action config
}
```

## Capability Gating

The framework supports optional capability-gating for future rights management:

```typescript
entityAdmin<User>('users', 'User')
  .setRequiredCapability('admin.users.view')  // Descriptor-level
  .addColumn(
    column('email', 'E-Mail', {
      requiredCapability: 'admin.users.view.email'  // Column-level
    })
  )
  .addBadge(
    badge('role', {
      requiredCapability: 'admin.users.view.roles'  // Badge-level
    })
  )
  .build();
```

Currently, capabilities are stored but not enforced. Future renderer implementations can filter based on user capabilities.

## Integration with Existing Code

The framework can coexist with existing admin components. Consider:

1. **Gradual Migration**: Start by defining descriptors, then update components to consume them
2. **Adapter Pattern**: Create adapters to convert legacy configs to new descriptors
3. **Shared Renderer**: Build a shared component that renders from `EntityAdminDescriptor<T>`

## Best Practices

1. **Use Generics**: Always specify entity type for full type safety
   ```typescript
   entityAdmin<User>('users', 'User')  // ✅
   entityAdmin('users', 'User')        // ❌ No type safety
   ```

2. **Choose Your Style**: Use fluent API for simple configs, imperative for complex/conditional logic

3. **Type Your Callbacks**: Let TypeScript infer types from the generic parameter
   ```typescript
   onClick: (ctx) => {
     // ctx.item is fully typed as User
     console.log(ctx.item.username);
   }
   ```

4. **Capabilities**: Add `requiredCapability` now, even if not used yet

5. **Badge vs Button**: Use `renderAs: 'button'` only when badges need interaction

## Examples

See `entity-admin.examples.ts` for comprehensive usage examples including:
- Fluent API usage
- Imperative push-style usage
- Badge-buttons with click handlers
- Badges with router links
- Detail view configuration
- Mixed fluent/imperative approach

## Future Enhancements

- Shared renderer component
- Capability filtering implementation
- Form generation from descriptors
- Advanced search/filter UI
- Bulk actions support
- Export/import functionality
