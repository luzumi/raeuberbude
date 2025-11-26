# Transkript-Bearbeitung: Aktionen aus Entität ableiten

## Übersicht

Diese Implementierung erweitert den Admin-Bereich des Sprachassistenten um einen Dialog zur Bearbeitung von Transkripten. Der Dialog ermöglicht es, Transkripte mit Home Assistant Entitäten zu verknüpfen und automatisch passende Aktionen basierend auf den Fähigkeiten der Entität vorzuschlagen.

## Implementierte Komponenten

### 1. Dialog-Komponente
**Dateien:**
- `admin-transcript-edit-dialog.component.ts`
- `admin-transcript-edit-dialog.component.html`
- `admin-transcript-edit-dialog.component.scss`

### 2. Features

#### a) Metadaten-Anzeige
- Zeitstempel, User ID, Terminal ID
- STT Confidence Score
- Original-Transkript (read-only)

#### b) Text-Korrektur
- Textarea zum Bearbeiten des `aiAdjustedText`
- Wird für weitere Verarbeitung verwendet

#### c) Area-Auswahl
- Autocomplete-Suche durch alle verfügbaren Areas
- Anbindung an `/api/homeassistant/entities/areas`
- Filterfunktion für schnellere Suche

#### d) Entitäts-Suche
- Live-Suche mit `/api/homeassistant/entities/search?q=`
- Anzeige von Entity ID, Friendly Name und aktuellem Status
- Visuelle Markierung der ausgewählten Entität

#### e) Intelligente Aktions-Vorschläge
Nach Auswahl einer Entität werden automatisch passende Aktionen generiert basierend auf:

**Domänen-spezifische Aktionen:**

- **Light (Licht)**
  - turn_on / turn_off
  - set_brightness (wenn unterstützt) - Slider 0-100%
  - set_color (wenn unterstützt) - Color Picker mit RGB-Konvertierung

- **Switch (Schalter)**
  - turn_on / turn_off

- **Cover (Rollläden/Jalousien)**
  - open_cover / close_cover
  - set_position (wenn unterstützt) - Slider 0-100%

- **Climate (Heizung/Klima)**
  - set_temperature - Slider mit min_temp/max_temp aus Attributen
  - set_hvac_mode - Dropdown mit verfügbaren Modi

- **Media Player**
  - turn_on / turn_off
  - play / pause
  - set_volume (wenn unterstützt) - Slider 0-100%

- **Fan (Lüfter)**
  - turn_on / turn_off
  - set_percentage (wenn unterstützt) - Slider 0-100%

- **Lock (Schloss)**
  - lock / unlock

**Feature-Detection:**
Die Aktionen werden basierend auf dem `supported_features`-Bitfeld der Entität dynamisch generiert.

#### f) Parameter-Controls
Abhängig von der gewählten Aktion werden passende UI-Controls angezeigt:
- **Slider**: Für Prozent- oder Temperaturwerte
- **Color Picker**: Für RGB-Farben (Hex → RGB-Array)
- **Select Dropdown**: Für Modi/Optionen
- **Number Input**: Für numerische Werte
- **Text Input**: Für freie Texteingaben

#### g) Zusammenfassung
Vor dem Speichern wird eine Übersicht aller Einstellungen angezeigt:
- Ausgewählte Area
- Entität mit Friendly Name
- Aktion und Label
- Parameter mit Werten
- Trigger-Text

### 3. Backend-Anbindung

#### Schema-Erweiterung
**Datei:** `backend/nest-app/src/modules/logging/schemas/transcript.schema.ts`

Neue Felder:
```typescript
assignedAreaId: string           // Home Assistant Area ID
assignedEntityId: string         // Home Assistant Entity ID
assignedAction: {                // Strukturierte Aktionsdefinition
  type: string                   // z.B. 'set_brightness'
  label?: string                 // z.B. 'Helligkeit einstellen'
  params?: any                   // z.B. { brightness_pct: 75 }
}
assignedTrigger: string          // Natural Language Trigger
assignedTriggerAt?: Date         // Optional: geplanter Zeitpunkt
```

#### API-Endpunkt
**PUT /api/transcripts/:id**

Bereits vorhanden in `logging.controller.ts` und `logging.service.ts`
- Akzeptiert beliebige Update-Felder
- Validierung durch Mongoose Schema
- Gibt aktualisiertes Dokument zurück

### 4. Integration

**Datei:** `admin-speech-assistant.component.ts`

```typescript
async viewDetails(transcript: Transcript): Promise<void> {
  const dialogRef = this.dialog.open(AdminTranscriptEditDialogComponent, {
    width: '900px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    data: { transcript },
    disableClose: false
  });

  const result = await dialogRef.afterClosed().toPromise();
  if (result) {
    await this.loadTranscripts(); // Refresh nach Änderung
  }
}
```

## Verwendung

1. **Admin-Bereich öffnen**: Navigieren zu Sprachassistent Admin → Tab "Anfragen"
2. **Details anzeigen**: Auf das Auge-Icon bei einem Transkript klicken
3. **Dialog-Workflow**:
   - Text bei Bedarf korrigieren
   - Area auswählen (optional)
   - Entität suchen und auswählen
   - Automatisch vorgeschlagene Aktion wählen
   - Parameter anpassen (z.B. Helligkeit auf 75%)
   - Trigger-Text überprüfen/anpassen
   - Zusammenfassung prüfen
   - Speichern

## Nächste Schritte / Erweiterungen

1. **Zeit-basierte Trigger**: Parsing von "um 18 Uhr" → `assignedTriggerAt`
2. **Automatische Ausführung**: Service der regelmäßig Transcripts mit `assignedTrigger` prüft und bei Match ausführt
3. **Konditions-System**: Mehrfach-Bedingungen (z.B. "wenn niemand zuhause")
4. **Szenen-Unterstützung**: Mehrere Aktionen gruppieren
5. **Intent-Validierung**: LLM-basierte Überprüfung der Zuordnung
6. **Vorschau-Funktion**: Test-Ausführung vor Speichern
7. **Historie**: Tracking von Änderungen an Assignments

## Testing

Der Dialog kann getestet werden durch:
```bash
cd C:\Users\corat\IdeaProjects\raueberbude
npm run start
```

Dann navigieren zu:
`http://localhost:4200/admin/speech-assistant?tab=2`

## Technische Details

- **Standalone Component**: Vollständig eigenständig, keine zusätzlichen Module erforderlich
- **Material Design**: Konsistente UI mit Angular Material
- **Responsive**: Funktioniert auf Desktop und Tablet (Mobile optimierbar)
- **Type-Safe**: Vollständige TypeScript-Typisierung
- **Fehlerbehandlung**: Snackbar-Benachrichtigungen bei Erfolg/Fehler

## API-Abhängigkeiten

- `/api/homeassistant/entities/areas` - Area-Liste
- `/api/homeassistant/entities/search?q=` - Entitäts-Suche
- `/api/homeassistant/entities/:entityId` - Entitäts-Details
- `/api/transcripts/:id` - Transcript Update (PUT)

