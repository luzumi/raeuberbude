# Plan: Home Assistant Daten-Administration mit wiederverwendbarer Shared-Tabelle

## Überblick

Die Anforderung umfasst drei Hauptbestandteile:

1. **Integration eines neuen Admin-Bereichs "Homeassistent"** mit Navigation im Menü und Routing
2. **Erstellung einer flexiblen, wiederverwendbaren Tabellenkomponente** mit Pagination, Suche, Spaltenfilter und optionalen Toolbar-Buttons
3. **Aufbau der HomeAssistant-Admin-Ansicht** nach dem Vorbild von `rights-management.component.ts` mit Tabs für jede HA-Tabelle (Entities, Devices, Areas, Automations, Persons, Zones, Media Players, Services)

## Implementierungsschritte

### 1. Button im Menü hinzufügen

**Datei:** `src/app/shared/components/menu/menu.ts`

- In der `<nav class="admin-nav">` unter "Administration" einen neuen Button hinzufügen
- Position: Nach "Rollen" und vor "Sprachassistent"
- Syntax: `<a routerLink="/admin/homeassistant" mat-stroked-button>Homeassistent</a>`
- Optional mit Icon: `<mat-icon>home</mat-icon>` oder `<mat-icon>devices</mat-icon>`

### 2. Shared Tabellen-Komponente erstellen

**Neuer Ordner:** `src/app/shared/components/appgeneric-data-table/`

**Dateien:**
- `appgeneric-data-table.component.ts`
- `appgeneric-data-table.component.html`
- `appgeneric-data-table.component.scss`
- `appgeneric-data-table.config.ts` (TypeScript-Interfaces)

**Features:**
- **Spalten-Konfiguration:** Interface für dynamische Spaltendefinition (field, header, type, sortable, filterable)
- **Datenquelle:** Input-Property für Datenobjekte (Array)
- **Pagination:** MatPaginator mit konfigurierbaren Page-Sizes [10, 25, 50, 100]
- **Globale Suche:** MatFormField mit Input für Volltextsuche über alle Felder
- **Spaltenfilter:** Individuelle Filter pro Spalte (Text-Input, Dropdown für Enums)
- **Toolbar-Buttons:** Optional konfigurierbare Buttons mit Event-Emittern
- **Zeilen-Aktionen:** Optional konfigurierbare Row-Actions (Edit, Delete, Custom)
- **Sortierung:** MatSort Integration für Spalten-Header
- **Responsive:** Mobile-optimiertes Layout

**TypeScript Interface (Beispiel):**
```typescript
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

export interface DataTableConfig<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  pagination?: {
    enabled: boolean;
    pageSize: number;
    pageSizeOptions: number[];
  };
  search?: {
    enabled: boolean;
    placeholder?: string;
  };
  toolbarButtons?: {
    label: string;
    icon?: string;
    color?: string;
    action: () => void;
  }[];
  rowActions?: {
    icon: string;
    tooltip: string;
    action: (row: T) => void;
    visible?: (row: T) => boolean;
  }[];
  selectable?: boolean;
  stickyHeader?: boolean;
}
```

**Angular Material Module benötigt:**
- MatTableModule
- MatPaginatorModule
- MatSortModule
- MatFormFieldModule
- MatInputModule
- MatButtonModule
- MatIconModule
- MatTooltipModule
- MatCheckboxModule (für Selektion)

### 3. HomeAssistant Admin-Feature erstellen

**Neuer Ordner:** `src/app/features/admin/homeassistant/`

**Hauptkomponente:** `admin-homeassistant.component.ts`

**Struktur:**
- Tab-basierte UI mit MatTabsModule
- Ein Tab pro HA-Schema-Typ
- Jeder Tab nutzt die Generic-Data-Table-Component
- Header mit Mat-Card (analog zu `rights-management`)

**Tabs:**
1. **Entities** (`ha_entities`)
   - Felder: entityId, entityType, domain, objectId, friendlyName, deviceId, areaId, createdAt, updatedAt
   - Toolbar: "Aktualisieren", "Export"
   - Row-Actions: "Details anzeigen"

2. **Devices** (`ha_devices`)
   - Felder: deviceId, name, manufacturer, model, swVersion, areaId, createdAt, updatedAt
   - Toolbar: "Aktualisieren"
   - Row-Actions: "Details anzeigen", "Entities anzeigen"

3. **Areas** (`ha_areas`)
   - Felder: areaId, name, aliases, floor, icon, createdAt, updatedAt
   - Toolbar: "Aktualisieren"
   - Row-Actions: "Details anzeigen", "Geräte anzeigen"

4. **Automations** (`ha_automations`)
   - Felder: entityId, automationId, alias, description, mode, current, max, createdAt, updatedAt
   - Toolbar: "Aktualisieren"
   - Row-Actions: "Details anzeigen"

5. **Persons** (`ha_persons`)
   - Felder: personId, name, userId, deviceTrackers, createdAt, updatedAt
   - Toolbar: "Aktualisieren"

6. **Zones** (`ha_zones`)
   - Felder: zoneId, name, latitude, longitude, radius, icon, passive, createdAt, updatedAt
   - Toolbar: "Aktualisieren"

7. **Media Players** (`ha_media_players`)
   - Felder: entityId, name, state, volumeLevel, mediaTitle, mediaArtist, source, createdAt, updatedAt
   - Toolbar: "Aktualisieren"

8. **Services** (`ha_services`)
   - Felder: serviceId, domain, service, name, description, fields, createdAt, updatedAt
   - Toolbar: "Aktualisieren"

**API-Service-Methoden:**
```typescript
private readonly haApiBase = `${this.nestBase}/api/homeassistant`;

async loadEntities(): Promise<any[]> {
  return firstValueFrom(this.http.get<any[]>(`${this.haApiBase}/entities`));
}

async loadDevices(): Promise<any[]> {
  return firstValueFrom(this.http.get<any[]>(`${this.haApiBase}/entities/devices`));
}

async loadAreas(): Promise<any[]> {
  return firstValueFrom(this.http.get<any[]>(`${this.haApiBase}/entities/areas`));
}

// ... weitere Methoden für andere Schemas
```

### 4. Route und Guards konfigurieren

**Datei:** `src/app/app.routes.ts`

**Änderung:**
```typescript
{
  path: 'admin',
  canActivate: [authGuard],
  children: [
    { path: '', redirectTo: 'rechte', pathMatch: 'full' },
    { path: 'rechte', component: RightsManagementComponent },
    { path: 'terminals', component: RightsManagementComponent },
    { path: 'users', component: AdminUsersComponent },
    { path: 'bereiche', component: AdminAreasComponent },
    { path: 'rollen', component: AdminRolesComponent },
    { path: 'homeassistant', component: AdminHomeAssistantComponent }, // NEU
    {
      path: 'speech-assistant',
      loadComponent: () => import('./features/admin/speech-assistant/admin-speech-assistant.component').then(m => m.AdminSpeechAssistantComponent)
    },
    { path: 'rights-management', redirectTo: 'rechte' },
  ],
},
```

### 5. Backend-API-Anbindung integrieren

**Vorhandene Endpoints nutzen:**

Aus `backend/nest-app/src/modules/homeassistant/controllers/ha-entities.controller.ts`:
- `GET /api/homeassistant/entities` - Alle Entities
- `GET /api/homeassistant/entities?type={type}` - Gefilterte Entities
- `GET /api/homeassistant/entities/search?q={term}` - Suche
- `GET /api/homeassistant/entities/statistics` - Statistiken
- `GET /api/homeassistant/entities/devices` - Alle Devices
- `GET /api/homeassistant/entities/devices/:deviceId` - Device Details
- `GET /api/homeassistant/entities/areas` - Alle Areas
- `GET /api/homeassistant/entities/:entityId` - Entity Details

**Service-Layer erstellen:**
```typescript
@Injectable({ providedIn: 'root' })
export class HomeAssistantService {
  private readonly apiBase: string;

  constructor(private http: HttpClient) {
    const host = (globalThis as any)?.location?.hostname || 'localhost';
    const port = 3001;
    this.apiBase = `http://${host}:${port}/api/homeassistant`;
  }

  getAllEntities(type?: string): Observable<any[]> {
    const params = type ? { type } : {};
    return this.http.get<any[]>(`${this.apiBase}/entities`, { params, withCredentials: true });
  }

  getAllDevices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/entities/devices`, { withCredentials: true });
  }

  getAllAreas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/entities/areas`, { withCredentials: true });
  }

  getEntityById(entityId: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/entities/${entityId}`, { withCredentials: true });
  }

  searchEntities(searchTerm: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/entities/search`, { 
      params: { q: searchTerm }, 
      withCredentials: true 
    });
  }
}
```

### 6. Styling angleichen

**Vorhandene SCSS-Patterns wiederverwenden:**

Aus `src/app/features/admin/rights-management/rights-management.component.scss`:
- `.admin-page` - Hauptcontainer
- `.admin-shell` - Inhalts-Wrapper
- `.admin-card` - Standard Material Card
- `.admin-header-card` - Header mit Icon und Titel
- `.admin-tab-content` - Tab-Inhalts-Container
- `.admin-actions-row` - Button-Toolbar
- `.admin-grid` - Responsive Grid-Layout

**HomeAssistant-spezifisches SCSS:**
```scss
@use '../../../../styles/tokens' as t;

// Konsistentes Layout
.ha-admin-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// Tab-spezifische Anpassungen
.ha-tab-content {
  padding: 20px;
  min-height: 400px;
}

// Badges für Entity-Types, Status, etc.
.ha-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  
  &.sensor { background-color: #4caf50; color: white; }
  &.switch { background-color: #2196f3; color: white; }
  &.light { background-color: #ff9800; color: white; }
  &.automation { background-color: #9c27b0; color: white; }
}

// Toolbar-Anpassungen
.ha-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
```

## Offene Fragen für weitere Verfeinerung

### 1. Schema-Felder pro Tabelle
**Frage:** Welche Felder sollen für jede HA-Tabelle angezeigt werden? Alle Schema-Properties oder eine kuratierte Auswahl?
**Antwort:** Alle verfügbaren, über eine Spaltenauswahl selektierbar
- **Konfigurierbare Spalten:** User kann Spalten ein-/ausblenden (MatColumnDef mit Selection)


### 2. Bearbeitungsmodus
**Frage:** Sollen Einträge editierbar sein oder read-only?
**Antwort:**
- **Inline-Editing:** Wie in `RightsManagementComponent` mit Formular-Seitenleiste
- **Dialog-basiert:** Edit-Dialog für komplexe Objekte

### 3. CRUD-Operationen
**Frage:** Benötigen Sie vollständige Create/Update/Delete-Funktionalität?
**Antwort:** Einträge sollten editier- und löschbar sein 

**Erforderliche Backend-Erweiterungen für CRUD:**
```typescript
// In ha-entities.controller.ts
@Post()
async createEntity(@Body() dto: CreateEntityDto) { ... }

@Patch(':entityId')
async updateEntity(@Param('entityId') id: string, @Body() dto: UpdateEntityDto) { ... }

@Delete(':entityId')
async deleteEntity(@Param('entityId') id: string) { ... }
```

**Vorschlag:** Zunächst Read-Only, CRUD-Endpoints bei Bedarf nachziehen

### 4. Toolbar-Button-Beispiele
**Frage:** Welche spezifischen Aktionen benötigen Sie?

**Antwort:**
- **"Aktualisieren"** - Daten neu vom Backend laden
- **"Daten neu importieren"** - Trigger für `/api/homeassistant/import/reimport`
- **"Export als JSON"** - JSON-Download der gefilterten Daten
- **"Statistiken anzeigen"** - Dialog mit Zusammenfassung
- **"Filtern nach..."** - Erweiterte Filter-Optionen
- **"Spalten konfigurieren"** - Spalten-Sichtbarkeit anpassen
- **"Massenbearbeitung"** - Multi-Select mit Batch-Operations

### 5. Detailansicht-Strategie
**Frage:** Wie sollen komplexe verschachtelte Objekte dargestellt werden?

**Beispiel:** Entity mit Device, Area, State, Attributes

**Antwort:**
- **Side-Panel:** Slide-in von rechts mit vollständigen Details

### 6. Performance bei großen Datenmengen
**Frage:** Wie viele Entities werden erwartet? Wie mit Performance umgehen?
**Antwort:** Lazy Loading + Server-seitige Pagination (Backend-Anpassung erforderlich)

## Technische Dependencies

**Neue npm-Packages:** Keine - alle benötigten Angular Material Module sind bereits im Projekt vorhanden

**Vorhandene Module wiederverwenden:**
- `@angular/material/table`
- `@angular/material/paginator`
- `@angular/material/sort`
- `@angular/material/form-field`
- `@angular/material/input`
- `@angular/material/select`
- `@angular/material/button`
- `@angular/material/icon`
- `@angular/material/tabs`
- `@angular/material/card`
- `@angular/material/dialog`

## Zeitschätzung

**Phase 1 - Grundgerüst (2-3 Stunden):**
- Menü-Button hinzufügen
- Route konfigurieren
- Grundstruktur AdminHomeAssistantComponent
- Service-Layer für API-Calls

**Phase 2 - Generic Table Component (4-5 Stunden):**
- Component-Struktur mit allen Features
- Interface-Definitionen
- Styling und Responsiveness
- Testing mit Mock-Daten

**Phase 3 - HA-Admin Integration (3-4 Stunden):**
- Tab-Struktur aufbauen
- Konfiguration für alle 8 Schemas
- API-Integration und Daten-Loading
- Error Handling und Loading States

**Phase 4 - Feinschliff (2-3 Stunden):**
- Styling-Anpassungen
- Toolbar-Buttons implementieren
- Details-Dialogs
- Testing und Bugfixes

**Gesamt: 11-15 Stunden**

## Nächste Schritte

1. **Entscheidungen treffen** zu den offenen Fragen (siehe Abschnitt "Offene Fragen")
2. **Phase 1 starten:** Grundgerüst mit Menü, Route und Service-Layer
3. **Generic Table Component entwickeln** als eigenständiges Feature
4. **Integration testen** mit einem Schema (z.B. Areas als einfachstes)
5. **Iterativ erweitern** auf alle 8 Schemas
6. **Feedback-Schleife** für UX-Optimierungen

## Referenzen

**Vorhandene Komponenten als Vorbild:**
- `src/app/features/admin/rights-management/rights-management.component.ts` - Tab-Struktur, Styling
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.ts` - Pagination-Beispiel
- `src/app/features/admin/areas/admin-areas.component.ts` - HA-API-Integration

**Backend-Referenzen:**
- `backend/nest-app/src/modules/homeassistant/schemas/` - Alle Schema-Definitionen
- `backend/nest-app/src/modules/homeassistant/controllers/ha-entities.controller.ts` - API-Endpoints
- `backend/nest-app/src/modules/homeassistant/services/ha-query.service.ts` - Query-Logik

