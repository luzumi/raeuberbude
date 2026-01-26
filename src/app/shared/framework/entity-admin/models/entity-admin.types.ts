/**
 * Generic Entity Admin Framework Types
 * Supports TypeScript Builder Pattern with full type safety
 */

/**
 * Context provided to badge click handlers
 */
export interface BadgeClickContext<T = any> {
  item: T;
  badge: EntityBadgeConfig<T>;
  value: any;
}

/**
 * Context provided to action handlers
 */
export interface ActionContext<T = any> {
  item: T;
  action: EntityItemAction<T>;
}

/**
 * Badge configuration with optional click/button behavior
 * Badges are display elements, but can optionally be clickable
 */
export interface EntityBadgeConfig<T = any> {
  /** Field name to extract value from entity */
  field: string;

  /** Optional label (if different from field name) */
  label?: string;

  /** Field to use for the badge text/label display */
  labelField?: string;

  /** Custom function to compute badge text */
  labelFn?: (item: T) => string;

  /** Custom function to compute badge value */
  valueFn?: (item: T) => any;

  /** Visibility condition */
  visibleIf?: (item: T) => boolean;

  /** Render as badge (default) or button-styled badge */
  renderAs?: 'badge' | 'button';

  /** Tooltip/title text for the badge */
  title?: string;

  /** Function to determine if badge is disabled (for clickable badges) */
  disabledIf?: (item: T) => boolean;

  /** Click handler for clickable badges (UI action only, not form input) */
  onClick?: (ctx: BadgeClickContext<T>) => void | Promise<void>;

  /** Router link for navigation (takes precedence over onClick) */
  routerLink?: string | any[] | ((ctx: BadgeClickContext<T>) => string | any[]);

  /** CSS class for styling */
  cssClass?: string;

  /** Required capability for displaying this badge (optional, for future capability-gating) */
  requiredCapability?: string;
}

/**
 * Action configuration for items (buttons, menu items, etc.)
 */
export interface EntityItemAction<T = any> {
  /** Action identifier */
  id: string;

  /** Action label */
  label: string;

  /** Material icon name */
  icon?: string;

  /** Visibility condition */
  visibleIf?: (item: T) => boolean;

  /** Disabled condition */
  disabledIf?: (item: T) => boolean;

  /** Click handler */
  onClick?: (ctx: ActionContext<T>) => void | Promise<void>;

  /** Router link for navigation */
  routerLink?: string | any[] | ((ctx: ActionContext<T>) => string | any[]);

  /** Action color/theme */
  color?: 'primary' | 'accent' | 'warn';

  /** Required capability for this action */
  requiredCapability?: string;
}

/**
 * Column configuration for list views
 */
export interface EntityColumnConfig<T = any> {
  /** Field name */
  field: string;

  /** Column header label */
  label?: string;

  /** Custom value function */
  valueFn?: (item: T) => any;

  /** Column width */
  width?: string;

  /** Is sortable */
  sortable?: boolean;

  /** Custom CSS class */
  cssClass?: string;

  /** Required capability to view this column */
  requiredCapability?: string;
}

/**
 * List view configuration
 */
export interface EntityListViewConfig<T = any> {
  /** Columns to display */
  columns: EntityColumnConfig<T>[];

  /** Badges to display in list */
  badges: EntityBadgeConfig<T>[];

  /** Item actions (e.g., edit, delete buttons) */
  actions: EntityItemAction<T>[];

  /** Enable selection */
  selectable?: boolean;

  /** Enable pagination */
  paginated?: boolean;

  /** Items per page */
  pageSize?: number;

  /** Enable search/filter */
  searchable?: boolean;

  /** Search fields */
  searchFields?: string[];
}

/**
 * Detail view configuration
 */
export interface EntityDetailViewConfig<T = any> {
  /** Fields to display in detail view */
  fields: Array<{
    field: string;
    label?: string;
    valueFn?: (item: T) => any;
    requiredCapability?: string;
  }>;

  /** Badges for detail view */
  badges: EntityBadgeConfig<T>[];

  /** Actions for detail view */
  actions: EntityItemAction<T>[];
}

/**
 * View configuration combining list and detail views
 */
export interface EntityViewConfig<T = any> {
  list: EntityListViewConfig<T>;
  detail?: EntityDetailViewConfig<T>;
}

/**
 * Main Entity Admin Descriptor
 * Represents a complete admin configuration for an entity type
 */
export interface EntityAdminDescriptor<T = any> {
  /** Unique identifier for this descriptor */
  id: string;

  /** Entity type name (e.g., "User", "Role", "Area") */
  entityType: string;

  /** Display title */
  title: string;

  /** Subtitle/description */
  subtitle?: string;

  /** API endpoint URL */
  apiUrl?: string;

  /** Icon name */
  icon?: string;

  /** View configuration */
  view: EntityViewConfig<T>;

  /** Global actions (e.g., "Create New") */
  globalActions?: EntityItemAction<T>[];

  /** Required capability to access this descriptor */
  requiredCapability?: string;

  /** Custom metadata */
  metadata?: Record<string, any>;
}
