import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  TemplateRef,
  ContentChildren,
  QueryList,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  DataTableColumn,
  DataTableConfig,
  DataTableToolbarButton,
  DataTableRowAction,
} from './generic-data-table.config';

@Component({
  selector: 'app-generic-data-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="generic-data-table-container">
      <!-- Toolbar -->
      <div class="table-toolbar" *ngIf="config.toolbarButtons || config.search">
        <!-- Search Field -->
        <div class="toolbar-search" *ngIf="config.search?.enabled">
          <mat-form-field appearance="outline">
            <mat-label>{{ config.search?.placeholder || 'Suchen...' }}</mat-label>
            <input
              matInput
              (keyup)="applyGlobalFilter($event)"
              placeholder="Suchbegriff eingeben..."
            />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </div>

        <!-- Toolbar Buttons -->
        <div class="toolbar-buttons" *ngIf="config.toolbarButtons && config.toolbarButtons.length">
          <button
            mat-raised-button
            [color]="btn.color || 'primary'"
            (click)="btn.action()"
            [disabled]="btn.disabled"
            [matTooltip]="btn.tooltip"
            *ngFor="let btn of config.toolbarButtons"
          >
            <mat-icon *ngIf="btn.icon">{{ btn.icon }}</mat-icon>
            {{ btn.label }}
          </button>
        </div>
      </div>

      <!-- Table with Loading State -->
      <div class="table-wrapper" [class.loading]="config.loading">
        <mat-progress-spinner
          *ngIf="config.loading"
          mode="indeterminate"
          class="loading-spinner"
        ></mat-progress-spinner>

        <table
          mat-table
          [dataSource]="dataSource"
          matSort
          (matSortChange)="onSortChange($event)"
          class="data-table"
          [class.sticky-header]="config.stickyHeader"
        >
          <!-- Selection Column -->
          <ng-container matColumnDef="select" *ngIf="config.selectable">
            <th mat-header-cell *matHeaderCellDef>
              <mat-checkbox
                [checked]="allSelected"
                (change)="toggleSelectAll($event)"
              ></mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let row">
              <mat-checkbox
                [checked]="isSelected(row)"
                (change)="toggleRow($event, row)"
              ></mat-checkbox>
            </td>
          </ng-container>

          <!-- Dynamic Columns -->
          <ng-container
            *ngFor="let col of displayColumns"
            [matColumnDef]="col.field.toString()"
          >
            <th
              mat-header-cell
              *matHeaderCellDef
              [mat-sort-header]="col.sortable !== false ? col.field.toString() : ''"
              [style.width]="col.width"
            >
              {{ col.header }}
            </th>
            <td mat-cell *matCellDef="let row" [style.width]="col.width">
              <!-- Custom Template -->
              <ng-container *ngIf="col.template">
                <ng-container
                  *ngTemplateOutlet="col.template; context: { $implicit: row }"
                ></ng-container>
              </ng-container>

              <!-- Default Rendering -->
              <ng-container *ngIf="!col.template">
                <!-- Boolean -->
                <span *ngIf="col.type === 'boolean'">
                  <mat-icon
                    [class]="
                      row[col.field] ? 'success-icon' : 'error-icon'
                    "
                  >
                    {{ row[col.field] ? 'check_circle' : 'cancel' }}
                  </mat-icon>
                </span>

                <!-- Date -->
                <span *ngIf="col.type === 'date'">
                  {{ row[col.field] | date : 'short' }}
                </span>

                <!-- Badge -->
                <span
                  *ngIf="col.type === 'badge'"
                  class="badge"
                  [class]="'badge-' + row[col.field]"
                >
                  {{ row[col.field] }}
                </span>

                <!-- Default Text/Number -->
                <span *ngIf="!col.type || col.type === 'text' || col.type === 'number'">
                  {{ row[col.field] }}
                </span>
              </ng-container>
            </td>
          </ng-container>

          <!-- Row Actions Column -->
          <ng-container matColumnDef="actions" *ngIf="config.rowActions && config.rowActions.length">
            <th mat-header-cell *matHeaderCellDef>Aktionen</th>
            <td mat-cell *matCellDef="let row">
              <div class="row-actions">
                <button
                  mat-icon-button
                  *ngFor="let action of config.rowActions"
                  [matTooltip]="action.tooltip"
                  [color]="action.color || 'primary'"
                  (click)="action.action(row)"
                  [hidden]="action.visible && !action.visible(row)"
                >
                  <mat-icon>{{ action.icon }}</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <!-- Header Row -->
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>

          <!-- Data Rows -->
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

          <!-- Empty State -->
          <tr class="empty-state" *matNoDataRow>
            <td [attr.colspan]="displayedColumns.length">
              <div class="empty-message">
                {{ config.emptyMessage || 'Keine Daten verfügbar' }}
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Paginator -->
      <mat-paginator
        *ngIf="config.pagination?.enabled"
        [length]="dataSource.filteredData.length"
        [pageSize]="config.pagination?.pageSize || 10"
        [pageSizeOptions]="config.pagination?.pageSizeOptions || [10, 25, 50, 100]"
        (page)="onPageChange($event)"
        aria-label="Seite wählen"
      ></mat-paginator>
    </div>
  `,
  styleUrls: ['./generic-data-table.component.scss'],
})
export class GenericDataTableComponent<T extends Record<string, any>> implements OnInit {
  @Input() set config(value: DataTableConfig<T>) {
    this._config = value;
    // Wichtig: DataSource mit neuen Daten aktualisieren
    if (this.dataSource) {
      this.dataSource.data = value.data || [];
    } else {
      this.initializeDataSource();
    }
    this.buildDisplayColumns();
    this.cdr.markForCheck();
  }
  get config(): DataTableConfig<T> {
    return this._config;
  }
  private _config!: DataTableConfig<T>;

  @Output() rowSelected = new EventEmitter<T[]>();
  @Output() rowActionTriggered = new EventEmitter<{ action: string; row: T }>();
  @Output() pageChanged = new EventEmitter<PageEvent>();
  @Output() sortChanged = new EventEmitter<Sort>();

  dataSource!: MatTableDataSource<T>;
  displayedColumns: string[] = [];
  displayColumns: DataTableColumn<T>[] = [];
  allSelected = false;
  selectedRows = new Set<T>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Initialization erfolgt jetzt im setter des @Input config
  }

  private initializeDataSource(): void {
    this.dataSource = new MatTableDataSource(this._config?.data || []);
  }

  private buildDisplayColumns(): void {
    this.displayColumns = this.config.columns || [];
    this.displayedColumns = [];

    if (this.config.selectable) {
      this.displayedColumns.push('select');
    }

    this.displayedColumns.push(
      ...this.displayColumns.map((col) => col.field as string)
    );

    if (this.config.rowActions && this.config.rowActions.length > 0) {
      this.displayedColumns.push('actions');
    }
  }

  applyGlobalFilter(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const filterValue = input.value.toLowerCase();

    this.dataSource.filterPredicate = (row: T, filter: string) => {
      const columns = this.displayColumns.map((col) => col.field as string);
      return columns.some((col) => {
        const value = row[col];
        return value
          ? String(value).toLowerCase().includes(filter)
          : false;
      });
    };

    this.dataSource.filter = filterValue;
  }

  onSortChange(sort: Sort): void {
    this.sortChanged.emit(sort);
  }

  onPageChange(event: PageEvent): void {
    this.pageChanged.emit(event);
  }

  toggleSelectAll(event: any): void {
    if (event.checked) {
      this.selectedRows = new Set(this.dataSource.filteredData);
    } else {
      this.selectedRows.clear();
    }
    this.allSelected = event.checked;
    this.rowSelected.emit(Array.from(this.selectedRows));
  }

  toggleRow(event: any, row: T): void {
    if (event.checked) {
      this.selectedRows.add(row);
    } else {
      this.selectedRows.delete(row);
    }
    this.allSelected = this.selectedRows.size === this.dataSource.filteredData.length;
    this.rowSelected.emit(Array.from(this.selectedRows));
  }

  isSelected(row: T): boolean {
    return this.selectedRows.has(row);
  }
}

