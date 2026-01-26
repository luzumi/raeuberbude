/**
 * TypeScript Builder Pattern for EntityAdminDescriptor<T>
 * Provides fluent API and imperative push-style configuration
 */

import {
  EntityAdminDescriptor,
  EntityBadgeConfig,
  EntityItemAction,
  EntityColumnConfig,
  EntityListViewConfig,
  EntityDetailViewConfig,
  EntityViewConfig,
} from './entity-admin.types';

/**
 * Builder class for constructing EntityAdminDescriptor<T> instances
 * Supports both fluent method chaining and imperative property access
 */
export class EntityAdminDescriptorBuilder<T = any> {
  private descriptor: EntityAdminDescriptor<T>;

  constructor(id: string, entityType: string) {
    // Initialize with empty but valid structure
    this.descriptor = {
      id,
      entityType,
      title: entityType,
      view: {
        list: {
          columns: [],
          badges: [],
          actions: [],
          selectable: false,
          paginated: true,
          pageSize: 10,
          searchable: false,
          searchFields: [],
        },
      },
      globalActions: [],
    };
  }

  /**
   * Set the display title
   */
  setTitle(title: string): this {
    this.descriptor.title = title;
    return this;
  }

  /**
   * Set the subtitle/description
   */
  setSubtitle(subtitle: string): this {
    this.descriptor.subtitle = subtitle;
    return this;
  }

  /**
   * Set the API endpoint URL
   */
  setApiUrl(apiUrl: string): this {
    this.descriptor.apiUrl = apiUrl;
    return this;
  }

  /**
   * Set the icon
   */
  setIcon(icon: string): this {
    this.descriptor.icon = icon;
    return this;
  }

  /**
   * Set required capability for this descriptor
   */
  setRequiredCapability(capability: string): this {
    this.descriptor.requiredCapability = capability;
    return this;
  }

  /**
   * Add metadata
   */
  setMetadata(key: string, value: any): this {
    if (!this.descriptor.metadata) {
      this.descriptor.metadata = {};
    }
    this.descriptor.metadata[key] = value;
    return this;
  }

  /**
   * Add a column to the list view
   */
  addColumn(column: EntityColumnConfig<T>): this {
    this.descriptor.view.list.columns.push(column);
    return this;
  }

  /**
   * Add multiple columns at once
   */
  addColumns(...columns: EntityColumnConfig<T>[]): this {
    this.descriptor.view.list.columns.push(...columns);
    return this;
  }

  /**
   * Add a badge to the list view
   */
  addBadge(badge: EntityBadgeConfig<T>): this {
    this.descriptor.view.list.badges.push(badge);
    return this;
  }

  /**
   * Add multiple badges at once
   */
  addBadges(...badges: EntityBadgeConfig<T>[]): this {
    this.descriptor.view.list.badges.push(...badges);
    return this;
  }

  /**
   * Add an item action to the list view
   */
  addAction(action: EntityItemAction<T>): this {
    this.descriptor.view.list.actions.push(action);
    return this;
  }

  /**
   * Add multiple actions at once
   */
  addActions(...actions: EntityItemAction<T>[]): this {
    this.descriptor.view.list.actions.push(...actions);
    return this;
  }

  /**
   * Add a global action (e.g., "Create New")
   */
  addGlobalAction(action: EntityItemAction<T>): this {
    if (!this.descriptor.globalActions) {
      this.descriptor.globalActions = [];
    }
    this.descriptor.globalActions.push(action);
    return this;
  }

  /**
   * Configure list view settings
   */
  configureListView(config: Partial<EntityListViewConfig<T>>): this {
    Object.assign(this.descriptor.view.list, config);
    return this;
  }

  /**
   * Enable/disable selection
   */
  setSelectable(selectable: boolean): this {
    this.descriptor.view.list.selectable = selectable;
    return this;
  }

  /**
   * Enable/disable pagination
   */
  setPaginated(paginated: boolean, pageSize?: number): this {
    this.descriptor.view.list.paginated = paginated;
    if (pageSize !== undefined) {
      this.descriptor.view.list.pageSize = pageSize;
    }
    return this;
  }

  /**
   * Enable/disable search
   */
  setSearchable(searchable: boolean, searchFields?: string[]): this {
    this.descriptor.view.list.searchable = searchable;
    if (searchFields) {
      this.descriptor.view.list.searchFields = searchFields;
    }
    return this;
  }

  /**
   * Initialize detail view (optional)
   */
  initializeDetailView(): this {
    if (!this.descriptor.view.detail) {
      this.descriptor.view.detail = {
        fields: [],
        badges: [],
        actions: [],
      };
    }
    return this;
  }

  /**
   * Add a field to the detail view
   */
  addDetailField(field: {
    field: string;
    label?: string;
    valueFn?: (item: T) => any;
    requiredCapability?: string;
  }): this {
    this.initializeDetailView();
    this.descriptor.view.detail!.fields.push(field);
    return this;
  }

  /**
   * Add a badge to the detail view
   */
  addDetailBadge(badge: EntityBadgeConfig<T>): this {
    this.initializeDetailView();
    this.descriptor.view.detail!.badges.push(badge);
    return this;
  }

  /**
   * Add an action to the detail view
   */
  addDetailAction(action: EntityItemAction<T>): this {
    this.initializeDetailView();
    this.descriptor.view.detail!.actions.push(action);
    return this;
  }

  /**
   * Get direct access to the descriptor for imperative manipulation
   * This allows patterns like: descriptor.view.list.badges.push(...)
   */
  get(): EntityAdminDescriptor<T> {
    return this.descriptor;
  }

  /**
   * Build and return the final descriptor
   * This creates a deep copy to prevent external mutations
   */
  build(): EntityAdminDescriptor<T> {
    return JSON.parse(JSON.stringify(this.descriptor));
  }

  /**
   * Build without deep copy (for performance when mutation is acceptable)
   */
  buildShallow(): EntityAdminDescriptor<T> {
    return this.descriptor;
  }
}

/**
 * Factory function to create a typed builder
 * Usage: const builder = entityAdmin<User>('users', 'User')
 */
export function entityAdmin<T = any>(
  id: string,
  entityType: string
): EntityAdminDescriptorBuilder<T> {
  return new EntityAdminDescriptorBuilder<T>(id, entityType);
}

/**
 * Helper function to create a simple badge config
 */
export function badge<T = any>(
  field: string,
  options?: Partial<EntityBadgeConfig<T>>
): EntityBadgeConfig<T> {
  return {
    field,
    ...options,
  };
}

/**
 * Helper function to create a clickable badge (badge-button)
 */
export function badgeButton<T = any>(
  field: string,
  onClick: EntityBadgeConfig<T>['onClick'],
  options?: Partial<EntityBadgeConfig<T>>
): EntityBadgeConfig<T> {
  return {
    field,
    renderAs: 'button',
    onClick,
    ...options,
  };
}

/**
 * Helper function to create a badge with router link
 */
export function badgeLink<T = any>(
  field: string,
  routerLink: EntityBadgeConfig<T>['routerLink'],
  options?: Partial<EntityBadgeConfig<T>>
): EntityBadgeConfig<T> {
  return {
    field,
    renderAs: 'button',
    routerLink,
    ...options,
  };
}

/**
 * Helper function to create a column config
 */
export function column<T = any>(
  field: string,
  label?: string,
  options?: Partial<EntityColumnConfig<T>>
): EntityColumnConfig<T> {
  return {
    field,
    label,
    ...options,
  };
}

/**
 * Helper function to create an action config
 */
export function action<T = any>(
  id: string,
  label: string,
  onClick: EntityItemAction<T>['onClick'],
  options?: Partial<EntityItemAction<T>>
): EntityItemAction<T> {
  return {
    id,
    label,
    onClick,
    ...options,
  };
}

/**
 * Helper function to create an action with router link
 */
export function actionLink<T = any>(
  id: string,
  label: string,
  routerLink: EntityItemAction<T>['routerLink'],
  options?: Partial<EntityItemAction<T>>
): EntityItemAction<T> {
  return {
    id,
    label,
    routerLink,
    ...options,
  };
}
