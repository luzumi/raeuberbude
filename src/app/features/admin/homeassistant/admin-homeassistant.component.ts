import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {MatTabsModule} from '@angular/material/tabs';
import {GenericDataTableComponent} from '@shared/components/generic-data-table/generic-data-table.component';
import {DataTableConfig,} from '@shared/components/generic-data-table/generic-data-table.config';
import {HeaderComponent} from '@shared/components/header/header.component';
import {firstValueFrom} from 'rxjs';
import {HomeAssistantService} from '../../../core/services/homeassistant.service';
import {HaDetailDialogComponent} from './ha-detail-dialog.component';
import {HaJsonViewerDialogComponent} from './ha-json-viewer-dialog.component';
import {HaStatisticsDialogComponent} from './ha-statistics-dialog.component';

@Component( {
  selector: 'app-admin-homeassistant',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    GenericDataTableComponent,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './admin-homeassistant.component.html',
  styleUrls: ['./admin-homeassistant.component.scss'],
} )
export class AdminHomeAssistantComponent implements OnInit {
  selectedTabIndex = 0;

  // Loading states
  loadingEntities = false;
  loadingDevices = false;
  loadingAreas = false;
  loadingAutomations = false;
  loadingPersons = false;
  loadingZones = false;
  loadingMediaPlayers = false;
  loadingServices = false;

  // Data
  entities: any[] = [];
  devices: any[] = [];
  areas: any[] = [];
  automations: any[] = [];
  persons: any[] = [];
  zones: any[] = [];
  mediaPlayers: any[] = [];
  services: any[] = [];

  // Table Configurations
  entitiesConfig!: DataTableConfig<any>;
  devicesConfig!: DataTableConfig<any>;
  areasConfig!: DataTableConfig<any>;
  automationsConfig!: DataTableConfig<any>;
  personsConfig!: DataTableConfig<any>;
  zonesConfig!: DataTableConfig<any>;
  mediaPlayersConfig!: DataTableConfig<any>;
  servicesConfig!: DataTableConfig<any>;

  constructor(
    private haService: HomeAssistantService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.initializeTableConfigs();
    this.loadAllData();
  }

  /**
   * Dialog für Details anzeigen
   */
  showDetails(row: any): void {
    this.dialog.open( HaDetailDialogComponent, {
      data: row,
      width: '600px',
      maxHeight: '90vh',
    } );
  }

  /**
   * Dialog für Statistiken anzeigen
   */
  showStatistics(type: string): void {
    this.dialog.open( HaStatisticsDialogComponent, {
      data: { type },
      width: '500px',
      maxHeight: '90vh',
    } );
  }

  /**
   * Handler für Row-Menu Actions
   */
  handleRowMenuAction(actionId: string, row: any): void {
    switch ( actionId ) {
      case 'json':
        this.showJsonViewer( row );
        break;
      case 'edit':
        console.log( 'Edit action - später implementiert', row );
        break;
      case 'delete':
        console.log( 'Delete action - später implementiert', row );
        break;
      default:
        console.log( `Unknown action: ${ actionId }`, row );
    }
  }

  /**
   * JSON-Viewer Dialog öffnen
   */
  showJsonViewer(data: any): void {
    this.dialog.open( HaJsonViewerDialogComponent, {
      data: { data, title: data.entityId || data.name || data.deviceId || data.id || 'JSON' },
      width: '800px',
      maxHeight: '90vh',
      panelClass: 'json-viewer-dialog',
    } );
  }

  private initializeTableConfigs(): void {
    // Entities Config
    this.entitiesConfig = {
      columns: [
        { field: 'entityId', header: 'Entity ID', sortable: true, filterable: true },
        { field: 'friendlyName', header: 'Name', sortable: true, filterable: true },
        { field: 'entityType', header: 'Type', type: 'badge', sortable: true, filterable: true },
        { field: 'domain', header: 'Domain', sortable: true, filterable: true },
        { field: 'objectId', header: 'Object ID', sortable: true },
        { field: 'deviceId', header: 'Device ID', sortable: true },
        { field: 'areaId', header: 'Area ID', sortable: true },
        { field: 'updatedAt', header: 'Aktualisiert', type: 'date', sortable: true },
      ],
      //
      data: this.entities,
      pagination: {
        enabled: true,
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
      },
      search: {
        enabled: true,
        placeholder: 'Entities durchsuchen...',
      },
      toolbarButtons: [
        {
          label: 'Aktualisieren',
          icon: 'refresh',
          action: () => this.loadEntities(),
          tooltip: 'Daten neu laden',
        },
        {
          label: 'Statistiken',
          icon: 'assessment',
          action: () => this.showStatistics( 'Entities' ),
          tooltip: 'Statistiken anzeigen',
        },
        {
          label: 'Daten importieren',
          icon: 'download',
          action: () => this.reimportData(),
          tooltip: 'Daten von Home Assistant importieren',
        },
        {
          label: 'Export JSON',
          icon: 'file_download',
          action: () => this.exportAsJson( this.entities, 'entities' ),
          tooltip: 'Als JSON exportieren',
        },
        {
          label: 'Export CSV',
          icon: 'table_chart',
          action: () => this.exportAsCsv( this.entities, 'entities' ),
          tooltip: 'Als CSV exportieren',
        },
      ],
      rowActions: [
        {
          icon: 'info',
          tooltip: 'Details anzeigen',
          action: (row: any) => this.showDetails( row ),
          color: 'primary',
        },
      ],
      rowMenuActions: [
        {
          id: 'edit',
          label: 'Editieren',
          icon: 'edit',
          color: 'primary',
          handler: (row: any) => this.handleRowMenuAction( 'edit', row ),
        },
        {
          id: 'delete',
          label: 'Löschen',
          icon: 'delete',
          color: 'warn',
          handler: (row: any) => this.handleRowMenuAction( 'delete', row ),
        },
        {
          id: 'json',
          label: 'JSON anzeigen',
          icon: 'code',
          handler: (row: any) => this.handleRowMenuAction( 'json', row ),
        },
      ],
      stickyHeader: true,
      emptyMessage: 'Keine Entities gefunden',
    };

    // Devices Config
    this.devicesConfig = {
      columns: [
        { field: 'deviceId', header: 'Device ID', sortable: true, filterable: true },
        { field: 'name', header: 'Name', sortable: true, filterable: true },
        { field: 'manufacturer', header: 'Hersteller', sortable: true },
        { field: 'model', header: 'Modell', sortable: true },
        { field: 'swVersion', header: 'Softwareversion', sortable: true },
        { field: 'areaId', header: 'Area ID', sortable: true },
        { field: 'updatedAt', header: 'Aktualisiert', type: 'date', sortable: true },
      ],
      data: this.devices,
      pagination: {
        enabled: true,
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
      },
      search: {
        enabled: true,
        placeholder: 'Devices durchsuchen...',
      },
      toolbarButtons: [
        {
          label: 'Aktualisieren',
          icon: 'refresh',
          action: () => this.loadDevices(),
          tooltip: 'Daten neu laden',
        },
      ],
      rowActions: [
        {
          icon: 'info',
          tooltip: 'Details anzeigen',
          action: (row: any) => this.showDetails( row ),
          color: 'primary',
        },
      ],
      rowMenuActions: [
        {
          id: 'json',
          label: 'JSON anzeigen',
          icon: 'code',
          handler: (row: any) => this.handleRowMenuAction( 'json', row ),
        },
      ],
      stickyHeader: true,
      emptyMessage: 'Keine Devices gefunden',
    };

    // Areas Config
    this.areasConfig = {
      columns: [
        { field: 'areaId', header: 'Area ID', sortable: true, filterable: true },
        { field: 'name', header: 'Name', sortable: true, filterable: true },
        { field: 'aliases', header: 'Aliase', sortable: true },
        { field: 'floor', header: 'Etage', sortable: true },
        { field: 'icon', header: 'Icon', sortable: true },
        { field: 'updatedAt', header: 'Aktualisiert', type: 'date', sortable: true },
      ],
      data: this.areas,
      pagination: {
        enabled: true,
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
      },
      search: {
        enabled: true,
        placeholder: 'Areas durchsuchen...',
      },
      toolbarButtons: [
        {
          label: 'Aktualisieren',
          icon: 'refresh',
          action: () => this.loadAreas(),
          tooltip: 'Daten neu laden',
        },
      ],
      rowActions: [
        {
          icon: 'info',
          tooltip: 'Details anzeigen',
          action: (row: any) => this.showDetails( row ),
          color: 'primary',
        },
      ],
      rowMenuActions: [
        {
          id: 'json',
          label: 'JSON anzeigen',
          icon: 'code',
          handler: (row: any) => this.handleRowMenuAction( 'json', row ),
        },
      ],
      stickyHeader: true,
      emptyMessage: 'Keine Areas gefunden',
    };

    // Automations Config
    this.automationsConfig = {
      columns: [
        { field: 'automationId', header: 'Automation ID', sortable: true, filterable: true },
        { field: 'alias', header: 'Name', sortable: true, filterable: true },
        { field: 'description', header: 'Beschreibung', sortable: true },
        { field: 'mode', header: 'Modus', type: 'badge', sortable: true },
        { field: 'current', header: 'Aktuell', sortable: true },
        { field: 'max', header: 'Maximum', sortable: true },
        { field: 'updatedAt', header: 'Aktualisiert', type: 'date', sortable: true },
      ],
      data: this.automations,
      pagination: {
        enabled: true,
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
      },
      search: {
        enabled: true,
        placeholder: 'Automations durchsuchen...',
      },
      toolbarButtons: [
        {
          label: 'Aktualisieren',
          icon: 'refresh',
          action: () => this.loadAutomations(),
          tooltip: 'Daten neu laden',
        },
      ],
      rowActions: [
        {
          icon: 'info',
          tooltip: 'Details anzeigen',
          action: (row: any) => this.showDetails( row ),
          color: 'primary',
        },
      ],
      rowMenuActions: [
        {
          id: 'json',
          label: 'JSON anzeigen',
          icon: 'code',
          handler: (row: any) => this.handleRowMenuAction( 'json', row ),
        },
      ],
      stickyHeader: true,
      emptyMessage: 'Keine Automations gefunden',
    };

    // Persons Config
    this.personsConfig = {
      columns: [
        { field: 'personId', header: 'Person ID', sortable: true, filterable: true },
        { field: 'name', header: 'Name', sortable: true, filterable: true },
        { field: 'userId', header: 'User ID', sortable: true },
        { field: 'updatedAt', header: 'Aktualisiert', type: 'date', sortable: true },
      ],
      data: this.persons,
      pagination: {
        enabled: true,
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
      },
      search: {
        enabled: true,
        placeholder: 'Persons durchsuchen...',
      },
      toolbarButtons: [
        {
          label: 'Aktualisieren',
          icon: 'refresh',
          action: () => this.loadPersons(),
          tooltip: 'Daten neu laden',
        },
      ],
      rowActions: [
        {
          icon: 'info',
          tooltip: 'Details anzeigen',
          action: (row: any) => this.showDetails( row ),
          color: 'primary',
        },
      ],
      rowMenuActions: [
        {
          id: 'json',
          label: 'JSON anzeigen',
          icon: 'code',
          handler: (row: any) => this.handleRowMenuAction( 'json', row ),
        },
      ],
      stickyHeader: true,
      emptyMessage: 'Keine Persons gefunden',
    };

    // Zones Config
    this.zonesConfig = {
      columns: [
        { field: 'zoneId', header: 'Zone ID', sortable: true, filterable: true },
        { field: 'name', header: 'Name', sortable: true, filterable: true },
        { field: 'latitude', header: 'Breitengrad', sortable: true },
        { field: 'longitude', header: 'Längengrad', sortable: true },
        { field: 'radius', header: 'Radius (m)', sortable: true },
        { field: 'icon', header: 'Icon', sortable: true },
        { field: 'passive', header: 'Passiv', type: 'boolean', sortable: true },
        { field: 'updatedAt', header: 'Aktualisiert', type: 'date', sortable: true },
      ],
      data: this.zones,
      pagination: {
        enabled: true,
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
      },
      search: {
        enabled: true,
        placeholder: 'Zones durchsuchen...',
      },
      toolbarButtons: [
        {
          label: 'Aktualisieren',
          icon: 'refresh',
          action: () => this.loadZones(),
          tooltip: 'Daten neu laden',
        },
      ],
      rowActions: [
        {
          icon: 'info',
          tooltip: 'Details anzeigen',
          action: (row: any) => this.showDetails( row ),
          color: 'primary',
        },
      ],
      rowMenuActions: [
        {
          id: 'json',
          label: 'JSON anzeigen',
          icon: 'code',
          handler: (row: any) => this.handleRowMenuAction( 'json', row ),
        },
      ],
      stickyHeader: true,
      emptyMessage: 'Keine Zones gefunden',
    };

    // Media Players Config
    this.mediaPlayersConfig = {
      columns: [
        { field: 'entityId', header: 'Entity ID', sortable: true, filterable: true },
        { field: 'name', header: 'Name', sortable: true, filterable: true },
        { field: 'state', header: 'Status', type: 'badge', sortable: true },
        { field: 'volumeLevel', header: 'Lautstärke', sortable: true },
        { field: 'mediaTitle', header: 'Medientitel', sortable: true },
        { field: 'mediaArtist', header: 'Künstler', sortable: true },
        { field: 'source', header: 'Quelle', sortable: true },
        { field: 'updatedAt', header: 'Aktualisiert', type: 'date', sortable: true },
      ],
      data: this.mediaPlayers,
      pagination: {
        enabled: true,
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
      },
      search: {
        enabled: true,
        placeholder: 'Media Players durchsuchen...',
      },
      toolbarButtons: [
        {
          label: 'Aktualisieren',
          icon: 'refresh',
          action: () => this.loadMediaPlayers(),
          tooltip: 'Daten neu laden',
        },
      ],
      rowActions: [
        {
          icon: 'info',
          tooltip: 'Details anzeigen',
          action: (row: any) => this.showDetails( row ),
          color: 'primary',
        },
      ],
      rowMenuActions: [
        {
          id: 'json',
          label: 'JSON anzeigen',
          icon: 'code',
          handler: (row: any) => this.handleRowMenuAction( 'json', row ),
        },
      ],
      stickyHeader: true,
      emptyMessage: 'Keine Media Players gefunden',
    };

    // Services Config
    this.servicesConfig = {
      columns: [
        { field: 'serviceId', header: 'Service ID', sortable: true, filterable: true },
        { field: 'domain', header: 'Domain', sortable: true, filterable: true },
        { field: 'service', header: 'Service', sortable: true, filterable: true },
        { field: 'name', header: 'Name', sortable: true },
        { field: 'description', header: 'Beschreibung', sortable: true },
        { field: 'updatedAt', header: 'Aktualisiert', type: 'date', sortable: true },
      ],
      data: this.services,
      pagination: {
        enabled: true,
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
      },
      search: {
        enabled: true,
        placeholder: 'Services durchsuchen...',
      },
      toolbarButtons: [
        {
          label: 'Aktualisieren',
          icon: 'refresh',
          action: () => this.loadServices(),
          tooltip: 'Daten neu laden',
        },
      ],
      rowActions: [
        {
          icon: 'info',
          tooltip: 'Details anzeigen',
          action: (row: any) => this.showDetails( row ),
          color: 'primary',
        },
      ],
      rowMenuActions: [
        {
          id: 'json',
          label: 'JSON anzeigen',
          icon: 'code',
          handler: (row: any) => this.handleRowMenuAction( 'json', row ),
        },
      ],
      stickyHeader: true,
      emptyMessage: 'Keine Services gefunden',
    };
  }

  private async loadAllData(): Promise<void> {
    await Promise.all( [
      this.loadEntities(),
      this.loadDevices(),
      this.loadAreas(),
      this.loadAutomations(),
      this.loadPersons(),
      this.loadZones(),
      this.loadMediaPlayers(),
      this.loadServices(),
    ] );
  }

  private async loadEntities(): Promise<void> {
    this.loadingEntities = true;
    try {
      this.entities = await firstValueFrom( this.haService.getAllEntities() );
      // Spread-Operator erzwingt Change Detection in der Table
      this.entitiesConfig.data = [...this.entities];
      console.log( JSON.stringify( this.entitiesConfig ) )
      this.showMessage( 'Entities geladen', 'success' );
    } catch( error ) {
      console.error( 'Fehler beim Laden von Entities:', error );
      this.showMessage( 'Fehler beim Laden von Entities', 'error' );
    } finally {
      this.loadingEntities = false;
    }
  }

  private async loadDevices(): Promise<void> {
    this.loadingDevices = true;
    try {
      this.devices = await firstValueFrom( this.haService.getAllDevices() );
      this.devicesConfig.data = [...this.devices];
      this.showMessage( 'Devices geladen', 'success' );
    } catch( error ) {
      console.error( 'Fehler beim Laden von Devices:', error );
      this.showMessage( 'Fehler beim Laden von Devices', 'error' );
    } finally {
      this.loadingDevices = false;
    }
  }

  private async loadAreas(): Promise<void> {
    this.loadingAreas = true;
    try {
      this.areas = await firstValueFrom( this.haService.getAllAreas() );
      this.areasConfig.data = [...this.areas];
      this.showMessage( 'Areas geladen', 'success' );
    } catch( error ) {
      console.error( 'Fehler beim Laden von Areas:', error );
      this.showMessage( 'Fehler beim Laden von Areas', 'error' );
    } finally {
      this.loadingAreas = false;
    }
  }

  private async loadAutomations(): Promise<void> {
    this.loadingAutomations = true;
    try {
      this.automations = await firstValueFrom( this.haService.getAllAutomations() );
      this.automationsConfig.data = [...this.automations];
      this.showMessage( 'Automations geladen', 'success' );
    } catch( error ) {
      console.error( 'Fehler beim Laden von Automations:', error );
      this.showMessage( 'Fehler beim Laden von Automations', 'error' );
    } finally {
      this.loadingAutomations = false;
    }
  }

  private async loadPersons(): Promise<void> {
    this.loadingPersons = true;
    try {
      this.persons = await firstValueFrom( this.haService.getAllPersons() );
      this.personsConfig.data = [...this.persons];
      this.showMessage( 'Persons geladen', 'success' );
    } catch( error: any ) {
      console.error( 'Fehler beim Laden von Persons:', error );
      if ( error.status === 404 ) {
        this.persons = [];
        this.showMessage( 'Persons-API nicht verfügbar', 'info' );
      } else {
        this.showMessage( 'Fehler beim Laden von Persons', 'error' );
      }
    } finally {
      this.loadingPersons = false;
    }
  }

  private async loadZones(): Promise<void> {
    this.loadingZones = true;
    try {
      this.zones = await firstValueFrom( this.haService.getAllZones() );
      this.zonesConfig.data = [...this.zones];
      this.showMessage( 'Zones geladen', 'success' );
    } catch( error: any ) {
      console.error( 'Fehler beim Laden von Zones:', error );
      if ( error.status === 404 ) {
        this.zones = [];
        this.showMessage( 'Zones-API nicht verfügbar', 'info' );
      } else {
        this.showMessage( 'Fehler beim Laden von Zones', 'error' );
      }
    } finally {
      this.loadingZones = false;
    }
  }

  private async loadMediaPlayers(): Promise<void> {
    this.loadingMediaPlayers = true;
    try {
      this.mediaPlayers = await firstValueFrom( this.haService.getAllMediaPlayers() );
      this.mediaPlayersConfig.data = [...this.mediaPlayers];
      this.showMessage( 'Media Players geladen', 'success' );
    } catch( error: any ) {
      console.error( 'Fehler beim Laden von Media Players:', error );
      if ( error.status === 404 ) {
        this.mediaPlayers = [];
        this.showMessage( 'Media Players-API nicht verfügbar', 'info' );
      } else {
        this.showMessage( 'Fehler beim Laden von Media Players', 'error' );
      }
    } finally {
      this.loadingMediaPlayers = false;
    }
  }

  private async loadServices(): Promise<void> {
    this.loadingServices = true;
    try {
      this.services = await firstValueFrom( this.haService.getAllServices() );
      this.servicesConfig.data = [...this.services];
      this.showMessage( 'Services geladen', 'success' );
    } catch( error: any ) {
      console.error( 'Fehler beim Laden von Services:', error );
      if ( error.status === 404 ) {
        this.services = [];
        this.showMessage( 'Services-API nicht verfügbar', 'info' );
      } else {
        this.showMessage( 'Fehler beim Laden von Services', 'error' );
      }
    } finally {
      this.loadingServices = false;
    }
  }

  async reimportData(): Promise<void> {
    try {
      await firstValueFrom( this.haService.reimportData() );
      this.showMessage( 'Daten werden importiert...', 'success' );
      // Neuladen nach kurzem Delay
      setTimeout( () => this.loadAllData(), 1000 );
    } catch( error ) {
      console.error( 'Fehler beim Importieren:', error );
      this.showMessage( 'Fehler beim Importieren', 'error' );
    }
  }

  exportAsJson(data: any[], filename: string): void {
    const jsonString = JSON.stringify( data, null, 2 );
    const blob = new Blob( [jsonString], { type: 'application/json' } );
    const url = window.URL.createObjectURL( blob );
    const link = document.createElement( 'a' );
    link.href = url;
    link.download = `${ filename }-${ new Date().toISOString().split( 'T' )[0] }.json`;
    link.click();
    window.URL.revokeObjectURL( url );
  }

  exportAsCsv(data: any[], filename: string): void {
    if ( !data || data.length === 0 ) {
      this.showMessage( 'Keine Daten zum Exportieren', 'info' );
      return;
    }

    // Get all unique keys from objects
    const keys = Array.from( new Set( data.flatMap( (obj) => Object.keys( obj ) ) ) );

    // Create CSV header
    const header = keys.join( ',' );

    // Create CSV rows
    const rows = data.map( (obj) =>
      keys.map( (key) => {
        let value = obj[key];
        if ( value === null || value === undefined ) return '';
        if ( typeof value === 'object' ) {
          try {
            value = JSON.stringify( value );
          } catch {
            value = String( value );
          }
        }
        let cell = String( value ).replace( /"/g, '""' );
        if ( cell.includes( ',' ) || cell.includes( '\n' ) || cell.includes( '"' ) ) {
          cell = `"${ cell }"`;
        }
        return cell;
      } ).join( ',' )
    );

    const csvContent = [header, ...rows].join( '\n' );
    const blob = new Blob( [csvContent], { type: 'text/csv;charset=utf-8;' } );
    const url = window.URL.createObjectURL( blob );
    const link = document.createElement( 'a' );
    link.href = url;
    link.download = `${ filename }-${ new Date().toISOString().split( 'T' )[0] }.csv`;
    document.body.appendChild( link );
    link.click();
    document.body.removeChild( link );
    window.URL.revokeObjectURL( url );
  }


  private showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const panelClass =
      type === 'success' ? 'snack-success' : type === 'error' ? 'snack-error' : 'snack-info';
    this.snackBar.open( message, 'Schließen', {
      duration: 3000,
      panelClass,
    } );
  };
}
