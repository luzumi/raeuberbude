# Home Assistant Admin Integration

## Überblick

Diese Implementierung bietet einen umfassenden Admin-Interface für die Verwaltung und Übersicht aller Home Assistant-Daten aus der Datenbank.

## Struktur

### Features

✅ **Generic Data Table Component** (`src/app/shared/components/generic-data-table/`)
- Wiederverwendbare Tabellenkomponente für beliebige Datentypen
- Unterstützte Features:
  - Dynamische Spalten-Konfiguration
  - Pagination (konfigurierbare Page-Sizes: 10, 25, 50, 100)
  - Globale Suche über alle Spalten
  - Spalten-Sortierung (Ascending/Descending)
  - Row-Selection mit Checkboxes
  - Toolbar mit optionalen Buttons
  - Row-Actions (Edit, Delete, Custom)
  - Sticky Header
  - Responsive Design
  - Loading-States

### HA Admin Component

**Dateien:**
- `src/app/features/admin/homeassistant/admin-homeassistant.component.ts` (Hauptkomponente)
- `src/app/features/admin/homeassistant/admin-homeassistant.component.html` (Template)
- `src/app/features/admin/homeassistant/admin-homeassistant.component.scss` (Styles)
- `src/app/features/admin/homeassistant/ha-detail-dialog.component.ts` (Detail-Dialog)
- `src/app/features/admin/homeassistant/ha-statistics-dialog.component.ts` (Statistik-Dialog)

**8 Tabs:**
1. **Entities** - Alle HA-Entities mit Suche, Filter, Export
2. **Devices** - Alle HA-Devices mit Details
3. **Areas** - Alle HA-Areas (Bereiche/Räume)
4. **Automations** - Alle HA-Automationen
5. **Persons** - Person-Daten
6. **Zones** - Geo-Zonen
7. **Media Players** - Media-Wiedergabegeräte
8. **Services** - HA-Services

### Service-Layer

**Datei:** `src/app/core/services/homeassistant.service.ts`

Alle API-Calls laufen über einen dedizierten Service mit:
- Error-Handling (404-Fehler bei nicht verfügbaren Endpoints)
- Credential Support (withCredentials: true)
- Observables für reaktive Integration

## API-Integration

### Backend-Endpoints

Die Komponente nutzt folgende Endpoints aus dem Nest-Backend:

```
GET  /api/homeassistant/entities           - Alle Entities
GET  /api/homeassistant/entities/:id       - Entity Details
GET  /api/homeassistant/entities/search?q  - Suche
GET  /api/homeassistant/entities/statistics - Statistiken

GET  /api/homeassistant/entities/devices   - Alle Devices
GET  /api/homeassistant/entities/areas     - Alle Areas

GET  /api/homeassistant/entities/automations   - Automations
GET  /api/homeassistant/entities/persons       - Persons
GET  /api/homeassistant/entities/zones         - Zones
GET  /api/homeassistant/entities/media-players - Media Players
GET  /api/homeassistant/entities/services      - Services

POST /api/homeassistant/import/reimport    - Daten neu importieren
```

### Fehlende Endpoints

Folgende Endpoints existieren im Backend noch nicht, aber sind im Service vorbereitet:
- Persons, Zones, Media Players, Services (werden noch vom Backend bereitgestellt)
- Error-Handling zeigt "API nicht verfügbar" an, wenn 404 zurückkommt

## Features

### Toolbar-Buttons pro Tab

Jeder Tab verfügt über eine Toolbar mit:

| Button | Aktion | Icon |
|--------|--------|------|
| Aktualisieren | Daten neu vom Backend laden | refresh |
| Statistiken | Zeigt Statistik-Dialog | assessment |
| Daten importieren | Reimport von Home Assistant | download |
| Export JSON | JSON-Export der gefilterten Daten | file_download |
| Export CSV | CSV-Export für Excel/Sheets | table_chart |

### Row-Actions

Jede Tabellenzeile bietet:
- **Info-Button** (Blau): Öffnet Detail-Dialog mit vollständigen Daten

### Dialoge

#### Detail-Dialog (HaDetailDialog)
- **Übersicht-Tab**: Kuratierte Felder je Entity-Typ
- **Raw Data-Tab**: JSON-Ansicht aller Daten
- **Verlauf-Tab** (nur Entities): State-History mit Timestamps

#### Statistik-Dialog (HaStatisticsDialog)
- Entity-Statistiken (nach Type gruppiert)
- Device-Statistiken (nach Hersteller gruppiert)
- Visual Cards mit Gesamtanzahl und Verteilung

## Verwendung

### Im Admin-Menü
```
Navigation: Menü → Administration → Homeassistent
```

### Routing
```
URL: /admin/homeassistant
```

### Komponente importieren
```typescript
import { AdminHomeAssistantComponent } from './features/admin/homeassistant/admin-homeassistant.component';
import { GenericDataTableComponent } from '@shared/components/generic-data-table/generic-data-table.component';
```

## Konfigurationen

### Generic Data Table - Spalten hinzufügen

```typescript
const config: DataTableConfig<MyType> = {
  columns: [
    { 
      field: 'name', 
      header: 'Name', 
      sortable: true,
      filterable: true,
      type: 'text',
      width: '200px'
    },
    { 
      field: 'createdAt', 
      header: 'Erstellt', 
      type: 'date',
      sortable: true,
      width: '150px'
    },
    { 
      field: 'status', 
      header: 'Status', 
      type: 'badge',
      sortable: true
    },
  ],
  data: myData,
  pagination: {
    enabled: true,
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
  },
  search: {
    enabled: true,
    placeholder: 'Suchen...',
  },
};
```

### Custom Row-Template

```typescript
const config: DataTableConfig<MyType> = {
  // ...
  columns: [
    {
      field: 'customField',
      header: 'Custom',
      type: 'custom',
      template: myCustomTemplate, // TemplateRef
    }
  ]
};
```

## Styling

### Design-System
- Gradient Header (Lila: #667eea → #764ba2)
- Material Design Icons
- Responsive Grid Layout
- Sticky Headers bei Scroll
- Badge-Styling für Status und Types

### CSS-Klassen

```scss
.admin-page              // Hauptcontainer
.admin-shell            // Inhalts-Wrapper
.admin-card             // Standard Card
.admin-header-card      // Header Card mit Gradient
.admin-tab-content      // Tab-Content
.generic-data-table-container  // Table-Wrapper
.table-toolbar          // Toolbar
.data-table             // Tabelle
```

## Erweiterungen

### Backend-Endpoints hinzufügen

Wenn neue Endpoints hinzugefügt werden:

1. **Service erweitern** (`homeassistant.service.ts`)
   ```typescript
   getAllMyData(): Observable<MyData[]> {
     return this.http.get<MyData[]>(`${this.apiBase}/my-data`, {
       withCredentials: true
     });
   }
   ```

2. **AdminHomeAssistant erweitern**
   ```typescript
   // In initializeTableConfigs()
   this.myDataConfig = {
     columns: [...],
     data: this.myData,
     // ...
   };

   // Loading-Methode
   private async loadMyData(): Promise<void> {
     this.loadingMyData = true;
     try {
       this.myData = await firstValueFrom(this.haService.getAllMyData());
       this.myDataConfig.data = this.myData;
     } catch (error) {
       this.showMessage('Fehler beim Laden', 'error');
     } finally {
       this.loadingMyData = false;
     }
   }
   ```

## Performance

- **Virtual Scrolling**: Bei >1000 Zeilen automatisch aktiviert
- **Lazy Loading**: Tabs laden Daten erst beim Aktivieren
- **Pagination**: Standard 25 Items pro Seite (konfigurierbar)
- **Memory**: Daten werden im Memory gecacht (können manuell neu geladen werden)

## Browser-Support

- Chrome (Latest)
- Firefox (Latest)
- Safari (Latest)
- Edge (Latest)

## Dependencies

Alle benötigten Angular Material Module sind bereits vorhanden:
- @angular/material/table
- @angular/material/paginator
- @angular/material/sort
- @angular/material/dialog
- @angular/material/tabs
- etc.

## Troubleshooting

### "API nicht verfügbar" Meldung
→ Der Backend-Endpoint existiert noch nicht
→ Prüfen Sie die Console für genaue Error-Messages

### Suche funktioniert nicht
→ Prüfen Sie, dass die Spalte `filterable: true` hat
→ Globale Suche sucht in ALLEN Spalten

### Export funktioniert nicht
→ Prüfen Sie Browser-Download-Einstellungen
→ CSV/JSON werden auf dem Client erzeugt

## Lizenz

Siehe Projekt-ROOT LICENSE Datei.

## Kontakt

Bei Fragen oder Problemen: [Support-Kontakt]

