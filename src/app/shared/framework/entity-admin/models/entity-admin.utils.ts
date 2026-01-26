/**
 * Type Guards and Utility Functions for Entity Admin Framework
 */

import {
  EntityBadgeConfig,
  EntityItemAction,
  BadgeClickContext,
  ActionContext,
} from './entity-admin.types';

/**
 * Check if a value is a Promise
 * More robust than duck typing with .catch
 */
function isPromise(value: any): value is Promise<any> {
  return value != null && 
         typeof value === 'object' && 
         typeof value.then === 'function' &&
         typeof value.catch === 'function';
}

/**
 * Check if a badge is clickable (has onClick or routerLink)
 */
export function isBadgeClickable<T = any>(badge: EntityBadgeConfig<T>): boolean {
  return !!(badge.onClick || badge.routerLink);
}

/**
 * Check if a badge should be rendered as a button
 */
export function isBadgeButton<T = any>(badge: EntityBadgeConfig<T>): boolean {
  return badge.renderAs === 'button' || isBadgeClickable(badge);
}

/**
 * Check if a badge is disabled for a specific item
 */
export function isBadgeDisabled<T = any>(
  item: T,
  badge: EntityBadgeConfig<T>
): boolean {
  if (!badge.disabledIf) return false;
  return badge.disabledIf(item);
}

/**
 * Check if a badge is visible for a specific item
 */
export function isBadgeVisible<T = any>(
  item: T,
  badge: EntityBadgeConfig<T>
): boolean {
  if (!badge.visibleIf) return true;
  return badge.visibleIf(item);
}

/**
 * Check if an action is disabled for a specific item
 */
export function isActionDisabled<T = any>(
  item: T,
  action: EntityItemAction<T>
): boolean {
  if (!action.disabledIf) return false;
  return action.disabledIf(item);
}

/**
 * Check if an action is visible for a specific item
 */
export function isActionVisible<T = any>(
  item: T,
  action: EntityItemAction<T>
): boolean {
  if (!action.visibleIf) return true;
  return action.visibleIf(item);
}

/**
 * Resolve badge text for display
 */
export function resolveBadgeText<T = any>(
  item: T,
  badge: EntityBadgeConfig<T>
): string {
  if (badge.labelFn) {
    return String(badge.labelFn(item));
  }
  
  const field = badge.labelField || badge.field;
  const value = (item as any)[field];
  
  return value != null ? String(value) : '';
}

/**
 * Resolve badge value (raw value from item)
 */
export function resolveBadgeValue<T = any>(
  item: T,
  badge: EntityBadgeConfig<T>
): any {
  if (badge.valueFn) {
    return badge.valueFn(item);
  }
  
  return (item as any)[badge.field];
}

/**
 * Resolve router link for a badge
 * Handles string, array, and function forms
 */
export function resolveBadgeRouterLink<T = any>(
  item: T,
  badge: EntityBadgeConfig<T>
): string | any[] | null {
  if (!badge.routerLink) return null;
  
  if (typeof badge.routerLink === 'function') {
    const value = resolveBadgeValue(item, badge);
    const ctx: BadgeClickContext<T> = { item, badge, value };
    return badge.routerLink(ctx);
  }
  
  return badge.routerLink;
}

/**
 * Resolve router link for an action
 * Handles string, array, and function forms
 */
export function resolveActionRouterLink<T = any>(
  item: T,
  action: EntityItemAction<T>
): string | any[] | null {
  if (!action.routerLink) return null;
  
  if (typeof action.routerLink === 'function') {
    const ctx: ActionContext<T> = { item, action };
    return action.routerLink(ctx);
  }
  
  return action.routerLink;
}

/**
 * Handle badge click event
 * Returns true if the click was handled, false otherwise
 */
export async function handleBadgeClick<T = any>(
  item: T,
  badge: EntityBadgeConfig<T>,
  event?: MouseEvent
): Promise<boolean> {
  // Prevent default and stop propagation
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // Check if disabled
  if (isBadgeDisabled(item, badge)) {
    return false;
  }
  
  // RouterLink takes precedence over onClick
  if (badge.routerLink) {
    // Navigation will be handled by Angular's routerLink directive
    return true;
  }
  
  // Handle onClick
  if (badge.onClick) {
    const value = resolveBadgeValue(item, badge);
    const ctx: BadgeClickContext<T> = { item, badge, value };
    
    try {
      const result = badge.onClick(ctx);
      
      // Handle async onClick
      if (isPromise(result)) {
        await result;
      }
      
      return true;
    } catch (error) {
      console.error('Badge click handler error:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Handle action click event
 * Returns true if the click was handled, false otherwise
 */
export async function handleActionClick<T = any>(
  item: T,
  action: EntityItemAction<T>,
  event?: MouseEvent
): Promise<boolean> {
  // Prevent default if event provided
  if (event) {
    event.preventDefault();
  }
  
  // Check if disabled
  if (isActionDisabled(item, action)) {
    return false;
  }
  
  // RouterLink takes precedence over onClick
  if (action.routerLink) {
    // Navigation will be handled by Angular's routerLink directive
    return true;
  }
  
  // Handle onClick
  if (action.onClick) {
    const ctx: ActionContext<T> = { item, action };
    
    try {
      const result = action.onClick(ctx);
      
      // Handle async onClick
      if (isPromise(result)) {
        await result;
      }
      
      return true;
    } catch (error) {
      console.error('Action click handler error:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Filter items based on capability
 * Returns items that don't require a capability, or where the required capability is in the allowed list
 */
export function filterByCapability<T extends { requiredCapability?: string }>(
  items: T[],
  allowedCapabilities: string[]
): T[] {
  return items.filter(item => {
    if (!item.requiredCapability) return true;
    return allowedCapabilities.includes(item.requiredCapability);
  });
}

/**
 * Check if user has required capability
 * Placeholder for future capability checking implementation
 */
export function hasCapability(
  requiredCapability: string | undefined,
  userCapabilities: string[]
): boolean {
  if (!requiredCapability) return true;
  return userCapabilities.includes(requiredCapability);
}

/**
 * Extract unique field names from various config types
 */
export function extractFields<T = any>(
  columns: Array<{ field: string }>,
  badges: Array<{ field: string }>,
  additionalFields: string[] = []
): string[] {
  const fields = new Set<string>();
  
  columns.forEach(col => fields.add(col.field));
  badges.forEach(badge => fields.add(badge.field));
  additionalFields.forEach(field => fields.add(field));
  
  return Array.from(fields);
}

/**
 * Get column value from item
 */
export function getColumnValue<T = any>(
  item: T,
  column: { field: string; valueFn?: (item: T) => any }
): any {
  if (column.valueFn) {
    return column.valueFn(item);
  }
  
  return (item as any)[column.field];
}

/**
 * Options for formatting values
 */
export interface FormatValueOptions {
  booleanTrue?: string;
  booleanFalse?: string;
  locale?: string;
  nullValue?: string;
}

/**
 * Format value for display
 * @param value The value to format
 * @param options Formatting options (optional)
 */
export function formatValue(value: any, options?: FormatValueOptions): string {
  const opts = {
    booleanTrue: options?.booleanTrue ?? 'Ja',
    booleanFalse: options?.booleanFalse ?? 'Nein',
    locale: options?.locale ?? 'de-DE',
    nullValue: options?.nullValue ?? '-',
  };
  
  if (value == null) return opts.nullValue;
  if (typeof value === 'boolean') return value ? opts.booleanTrue : opts.booleanFalse;
  if (value instanceof Date) return value.toLocaleDateString(opts.locale);
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
