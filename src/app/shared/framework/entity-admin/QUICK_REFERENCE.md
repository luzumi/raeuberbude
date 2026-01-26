# Entity Admin Framework - Quick Reference

## Import
```typescript
import { entityAdmin, badge, badgeButton, column, action } from '@shared/framework/entity-admin';
```

## Basic Usage

### Fluent API
```typescript
const descriptor = entityAdmin<User>('users', 'User')
  .setTitle('User Management')
  .setIcon('people')
  .addColumn(column('username', 'Username'))
  .addBadge(badge('role'))
  .addAction(action('edit', 'Edit', (ctx) => edit(ctx.item)))
  .build();
```

### Imperative API (TableDescriptor-like)
```typescript
const builder = entityAdmin<User>('users', 'User');
const d = builder.get();

d.title = 'User Management';
d.view.list.columns.push({ field: 'username', label: 'Username' });
d.view.list.badges.push({ field: 'role' });

const descriptor = builder.build();
```

## Core Types

### EntityAdminDescriptor<T>
```typescript
interface EntityAdminDescriptor<T> {
  id: string;
  entityType: string;
  title: string;
  subtitle?: string;
  apiUrl?: string;
  icon?: string;
  view: EntityViewConfig<T>;
  globalActions?: EntityItemAction<T>[];
  requiredCapability?: string;
}
```

### EntityBadgeConfig<T>
```typescript
interface EntityBadgeConfig<T> {
  field: string;
  label?: string;
  labelFn?: (item: T) => string;
  valueFn?: (item: T) => any;
  visibleIf?: (item: T) => boolean;
  
  // Clickable badge features
  renderAs?: 'badge' | 'button';
  title?: string;
  disabledIf?: (item: T) => boolean;
  onClick?: (ctx: BadgeClickContext<T>) => void | Promise<void>;
  routerLink?: string | any[] | ((ctx) => string | any[]);
  
  requiredCapability?: string;
}
```

## Helper Functions

### Badges
```typescript
badge<T>('field', options)              // Simple badge
badgeButton<T>('field', onClick, opts)  // Clickable badge
badgeLink<T>('field', routerLink, opts) // Badge with navigation
```

### Columns
```typescript
column<T>('field', 'Label', { sortable: true, width: '200px' })
```

### Actions
```typescript
action<T>('id', 'Label', onClick, { icon: 'edit', color: 'primary' })
actionLink<T>('id', 'Label', routerLink, { icon: 'visibility' })
```

## Builder Methods

### Configuration
- `.setTitle(title)`
- `.setSubtitle(subtitle)`
- `.setApiUrl(url)`
- `.setIcon(icon)`
- `.setRequiredCapability(capability)`
- `.setMetadata(key, value)`

### List View
- `.addColumn(column)` / `.addColumns(...columns)`
- `.addBadge(badge)` / `.addBadges(...badges)`
- `.addAction(action)` / `.addActions(...actions)`
- `.addGlobalAction(action)`
- `.setSelectable(boolean)`
- `.setPaginated(boolean, pageSize?)`
- `.setSearchable(boolean, fields?)`

### Detail View
- `.initializeDetailView()`
- `.addDetailField(field)`
- `.addDetailBadge(badge)`
- `.addDetailAction(action)`

### Build
- `.get()` - Get descriptor for imperative manipulation
- `.build()` - Build with deep copy
- `.buildShallow()` - Build without copy (faster)

## Utility Functions

### Type Guards
```typescript
isBadgeClickable(badge)
isBadgeButton(badge)
isBadgeDisabled(item, badge)
isBadgeVisible(item, badge)
isActionDisabled(item, action)
isActionVisible(item, action)
```

### Resolvers
```typescript
resolveBadgeText(item, badge)
resolveBadgeValue(item, badge)
resolveBadgeRouterLink(item, badge)
resolveActionRouterLink(item, action)
```

### Event Handlers
```typescript
handleBadgeClick(item, badge, event?)
handleActionClick(item, action, event?)
```

### Capability Filtering
```typescript
filterByCapability(items, allowedCapabilities)
hasCapability(requiredCapability, userCapabilities)
```

## Click Context

### BadgeClickContext<T>
```typescript
{
  item: T;              // The entity item
  badge: EntityBadgeConfig<T>;  // Badge config
  value: any;           // Badge value
}
```

### ActionContext<T>
```typescript
{
  item: T;              // The entity item
  action: EntityItemAction<T>;  // Action config
}
```

## Badge Rules

1. Badges are **display elements**, not form inputs
2. Clicks trigger **UI actions only** (navigation, dialogs, API calls)
3. `routerLink` takes precedence over `onClick`
4. Clicks automatically call `stopPropagation()` (won't trigger row clicks)
5. Use `renderAs: 'button'` for clickable badges

## Common Patterns

### Factory Function
```typescript
export function createUserDescriptor(handlers): EntityAdminDescriptor<User> {
  return entityAdmin<User>('users', 'User')
    .setTitle('Users')
    .addAction(action('edit', 'Edit', (ctx) => handlers.onEdit(ctx.item)))
    .build();
}
```

### Conditional Configuration
```typescript
const builder = entityAdmin<User>('users', 'User');
const d = builder.get();

if (showEmail) {
  d.view.list.columns.push({ field: 'email', label: 'Email' });
}

return builder.build();
```

### Badge Button with Status Toggle
```typescript
badgeButton<User>(
  'active',
  async (ctx) => {
    await toggleStatus(ctx.item._id, !ctx.item.active);
  },
  {
    labelFn: (item) => item.active ? 'Active' : 'Inactive',
    title: 'Toggle status',
    disabledIf: (item) => item.role === 'admin'
  }
)
```

### Badge Link with Dynamic Route
```typescript
badgeLink<User>(
  'profile',
  (ctx) => ['/users', ctx.item._id, 'profile'],
  {
    labelFn: () => 'View Profile',
    title: 'Open user profile'
  }
)
```

## TypeScript Tips

1. **Always use generics**: `entityAdmin<User>()` not `entityAdmin()`
2. **Type inference**: Callbacks automatically get typed parameters
3. **Optional chaining**: Use `?.` for optional properties
4. **Async handlers**: Both sync and async handlers are supported

## Examples

See full examples in:
- `entity-admin.examples.ts` - 5 patterns
- `entity-admin.integration-example.ts` - Component integration
- `MIGRATION.md` - Migration from object literals
- `README.md` - Complete documentation

## Resources

- **Types**: `entity-admin.types.ts`
- **Builder**: `entity-admin.builder.ts`
- **Utils**: `entity-admin.utils.ts`
- **Tests**: `entity-admin.builder.spec.ts`
