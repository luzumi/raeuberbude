# Expandable Transcript Rows - Implementierung

## Übersicht

Die „Alle Sprach-Anfragen Übersicht" im Admin-Bereich wurde erweitert um aufklappbare Tabellenzeilen, die eine Inline-Bearbeitung von Transkripten ermöglichen.

## Features

### 1. Aufklappbare Rows
- **Expand/Collapse Icon**: Jede Zeile hat ein Icon (expand_more/expand_less) zum Aufklappen
- **Inline Edit**: Beim Aufklappen erscheint ein vollständiges Formular zur Bearbeitung
- **Animation**: Smooth expand/collapse Animation mit Material Design

### 2. Bearbeitbare Felder
Die aufgeklappte Row zeigt ein Formular mit folgenden Feldern:

- **Korrigierter Text (aiAdjustedText)**: Textarea für angepassten Erkennungstext
- **Area Auswahl**: Autocomplete mit Suchfunktion für Home Assistant Areas
  - Option „+ Neue Area anlegen" im Admin-Areas-Bereich
- **Entität Auswahl**: Autocomplete mit Suchfunktion
  - Zeigt erste 50 steuerbare Entitäten (light, switch, cover, etc.)
  - Echtzeit-Suche für mehr Entitäten
  - Anzeige von friendly_name und entity_id
- **Aktion Auswahl**: Dropdown basierend auf gewählter Entität
  - Domain-spezifische Actions (z.B. bei Lichtern: Einschalten, Ausschalten, Helligkeit, Farbe)
  - Dynamische Parameter je nach Aktion (Slider, Color Picker, Select, etc.)
- **Trigger (Natural Language)**: Textarea für natürlichsprachigen Auslöser

### 3. Action-Typen nach Domain

#### Light (Licht)
- turn_on / turn_off
- set_brightness (mit Slider 0-100%)
- set_color (mit Color Picker → RGB)

#### Switch (Schalter)
- turn_on / turn_off

#### Cover (Rollladen)
- open_cover / close_cover
- set_position (Position 0-100%)

#### Climate (Heizung)
- set_temperature (mit Min/Max aus Entity-Attributen)
- set_hvac_mode (Dropdown basierend auf verfügbaren Modi)

#### Media Player
- turn_on / turn_off / play / pause
- set_volume (Lautstärke 0-100%)

#### Fan (Lüfter)
- turn_on / turn_off
- set_percentage (Geschwindigkeit 0-100%)

#### Lock (Schloss)
- lock / unlock

### 4. Wiederverwendbare Komponente

**TranscriptAssignmentFormComponent** (`transcript-assignment-form.component.ts`)
- Standalone-Komponente für Formular-Logik
- Wird sowohl im Dialog als auch in der Inline-Ansicht verwendet
- Input: `transcript`, `showButtons`
- Output: `save`, `cancelled`

### 5. Speicherung

- **PUT** auf `/api/transcripts/:id`
- Payload: `aiAdjustedText`, `assignedAreaId`, `assignedEntityId`, `assignedTrigger`, `assignedAction`
- Erfolg: Snackbar + lokale Liste aktualisiert
- Fehler: Snackbar mit Fehlermeldung

## Dateien

### Neue Dateien
- `src/app/features/admin/speech-assistant/transcript.model.ts` - Shared Models
- `src/app/features/admin/speech-assistant/transcript-assignment-form.component.ts` - Formular-Logik
- `src/app/features/admin/speech-assistant/transcript-assignment-form.component.html` - Formular-Template
- `src/app/features/admin/speech-assistant/transcript-assignment-form.component.scss` - Formular-Styles

### Geänderte Dateien
- `admin-speech-assistant.component.ts` - Expandable rows State & onInlineSave()
- `admin-speech-assistant.component.html` - multiTemplateDataRows, expand column, detail row
- `admin-speech-assistant.component.scss` - Styles für expandable rows
- `admin-transcript-edit-dialog.component.ts` - Refactored to use shared form component
- `admin-transcript-edit-dialog.component.html` - Embedded TranscriptAssignmentFormComponent

## UX-Details

### Row-Verhalten
- **Klick auf Expand-Icon**: Toggle expand/collapse
- **Nur eine Row gleichzeitig**: `expandedElement` speichert aktuelle Row (oder null)
- **Checkbox/Buttons**: stopPropagation() verhindert ungewolltes Expandieren
- **Loading-State**: `isSavingTranscriptId` zeigt Speicher-Status

### Visuelle Highlights
- Expanded row: hellblaue Hintergrundfarbe
- Expand-Icon wechselt zwischen expand_more/expand_less
- Detailbereich: hellgrauer Hintergrund mit Border-Top

### Dialog weiterhin verfügbar
- Button „Im Dialog öffnen" (open_in_new Icon) für volle Ansicht
- Dialog zeigt zusätzlich Metadaten (User, Terminal, STT Confidence, Timestamp)
- Beide Modi nutzen dieselbe Formular-Komponente

## Backend API

Endpunkt: `PUT /api/transcripts/:id`

Request Body:
```json
{
  "aiAdjustedText": "Licht im Wohnzimmer einschalten",
  "assignedAreaId": "wohnzimmer",
  "assignedEntityId": "light.wohnzimmer_decke",
  "assignedTrigger": "Licht im Wohnzimmer einschalten",
  "assignedAction": {
    "type": "turn_on",
    "label": "Einschalten",
    "params": {}
  }
}
```

## Testing

1. **Navigiere zu Admin → Speech Assistant → Tab "Anfragen"**
2. **Klicke auf den Expand-Button** bei einer Transkript-Zeile
3. **Wähle Area, Entität, Aktion** aus den Dropdowns
4. **Passe Text an** und setze Trigger
5. **Klicke "Speichern"** → Snackbar + Row schließt sich
6. **Prüfe, ob Daten persistiert** wurden (Refresh oder erneut aufklappen)

## Erweiterungsmöglichkeiten

1. **Area „Neu anlegen" Inline-Dialog**: Kleiner Dialog zum Erstellen neuer Areas ohne Navigation
2. **Mehrere Rows gleichzeitig expandieren**: `Set<string>` statt `expandedElement: Transcript | null`
3. **Keyboard Navigation**: Arrow-Keys zum Navigieren, Enter zum Expandieren
4. **Expand beim Laden**: QueryParam `?expandId=...` um bestimmte Row automatisch zu öffnen
5. **Undo/Redo**: History-Stack für Änderungen vor dem Speichern

## Performance

- **Lazy Loading**: Form-Komponente wird nur gerendert wenn `expandedElement === row`
- **Change Detection**: OnPush Strategy könnte Rendering optimieren
- **Entity-Cache**: Entities könnten in Service gecacht werden statt bei jedem Expand neu geladen

## Styling-Anpassungen

Falls du die Farben/Animation anpassen möchtest:

```scss
// admin-speech-assistant.component.scss

.transcript-row.expanded-row {
  background-color: rgba(63, 81, 181, 0.08); // Blau-Ton
}

.expanded-row-content {
  background-color: #fafafa; // Hellgrau
  padding: 1.5rem;
}
```

Animation-Timing in `admin-speech-assistant.component.ts`:
```typescript
animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
```

---

**Status**: ✅ Implementierung abgeschlossen  
**Build**: ✅ Erfolgreich (nur Budget-Warnungen)  
**Fehler**: ❌ Keine

