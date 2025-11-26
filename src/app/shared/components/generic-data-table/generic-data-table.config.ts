import { TemplateRef } from '@angular/core';

/**
 * Spalten-Konfiguration für die Generic Data Table
 */
export interface DataTableColumn<T> {
  field: keyof T | string;
  header: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'custom';
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'date';
  filterOptions?: { value: any; label: string }[];
  width?: string;
  template?: TemplateRef<any>; // Für custom rendering
}

/**
 * Toolbar-Button-Konfiguration
 */
export interface DataTableToolbarButton {
  label: string;
  icon?: string;
  color?: 'primary' | 'accent' | 'warn';
  action: () => void;
  disabled?: boolean;
  tooltip?: string;
}

/**
 * Row-Action-Konfiguration
 */
export interface DataTableRowAction<T> {
  icon: string;
  tooltip: string;
  action: (row: T) => void;
  visible?: (row: T) => boolean;
  color?: 'primary' | 'accent' | 'warn';
}

/**
 * Pagination-Konfiguration
 */
export interface DataTablePaginationConfig {
  enabled: boolean;
  pageSize: number;
  pageSizeOptions: number[];
}

/**
 * Suchen-Konfiguration
 */
export interface DataTableSearchConfig {
  enabled: boolean;
  placeholder?: string;
  global?: boolean;
}

/**
 * Gesamtkonfiguration für Generic Data Table
 */
export interface DataTableConfig<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  pagination?: DataTablePaginationConfig;
  search?: DataTableSearchConfig;
  toolbarButtons?: DataTableToolbarButton[];
  rowActions?: DataTableRowAction<T>[];
  selectable?: boolean;
  stickyHeader?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

