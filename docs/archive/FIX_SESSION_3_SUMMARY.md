# Fix Session 3: Multi-Active, Instanz-spezifische Prompts & Eject-Dialog ✅

## Status: Vollständig implementiert

---

## Behobene Probleme (Session 3)

### 1. ✅ Multi-Active Support - Aktivieren deaktiviert keine anderen mehr
**Problem**: Beim Aktivieren einer Instanz wurden alle anderen automatisch deaktiviert → kein Fallback möglich

**Lösung**:
- Backend: Entfernt `updateMany({}, { isActive: false })` aus `activateLlmInstance()`
- Jetzt können mehrere Instanzen parallel aktiv sein
- Nützlich für Fallback-Szenarien und Load-Balancing

**Geändert**:
- `backend/nest-app/src/modules/logging/logging.service.ts`
  - `activateLlmInstance()` - Multi-Active Support

### 2. ✅ Deaktivieren mit Bestätigungs-Dialog (Eject)
**Problem**: Deaktivieren-Button hatte keine Bestätigung, Button-Text unklar

**Lösung**:
- Frontend: `confirm()` Dialog vor Deaktivierung
- Text: "Möchten Sie die LLM-Instanz '...' wirklich deaktivieren (eject)?"
- Klarere Begriffe: "eject" = entladen, nicht löschen
- Neue Methode `deleteLlmInstance()` für permanentes Löschen (Backend)

**Geändert**:
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.ts`
  - `deactivateLlmInstance()` mit Bestätigungs-Dialog
- `backend/nest-app/src/modules/logging/logging.service.ts`
  - `deactivateLlmInstance()` - setzt `isActive: false`, `health: 'unknown'`
  - `deleteLlmInstance()` - löscht Instanz permanent (neuer Endpoint)
- `backend/nest-app/src/modules/logging/logging.controller.ts`
  - `@Post('/llm-instances/:id/delete')` - neuer Endpoint

### 3. ✅ System-Prompt instanz-spezifisch laden & speichern
**Problem**: System-Prompt Textarea blieb leer, keine Instanz-spezifische Verwaltung

**Lösung**:
- **Card-Klick-System**: Klick auf "Prompt laden"-Button lädt den Prompt dieser Instanz
- **Visuelle Markierung**: Ausgewählte Card wird blau umrandet (`.selected` CSS-Klasse)
- **Speichern**: Speichert Prompt für aktuell ausgewählte Instanz (nicht nur aktive)
- **Feedback**: Snackbar zeigt für welche Instanz gespeichert wurde

**Neue Methoden**:
- `loadSystemPromptForInstance(instance)` - Lädt Prompt einer bestimmten Instanz
- `saveSystemPrompt()` - Speichert für `activeInstance` (ausgewählte Card)

**Geändert**:
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.ts`
  - `loadSystemPromptForInstance()` - neue Methode
  - `loadLlmInstances()` - vereinfacht, ohne auto-save
  - `saveSystemPrompt()` - zeigt Instanz-Name im Feedback
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.html`
  - "Prompt laden"-Button in jeder Card
  - Card bekommt `[class.selected]` basierend auf `activeInstance._id`
  - Zeigt Instanz-Model statt Name
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.scss`
  - `.selected` CSS-Klasse (blauer Rahmen)
  - `cursor: pointer` auf Cards

---

## Neue Features

### 🆕 Instanz-Prompt-Verwaltung

**Workflow**:
1. User klickt "Prompt laden" Button bei einer Instanz-Card
2. Card wird blau umrandet (selected)
3. Textarea zeigt den Prompt dieser Instanz
4. User bearbeitet Prompt
5. Klickt "System-Prompt speichern"
6. Snackbar: "System-Prompt für [model-name] gespeichert"

**Vorteile**:
- Jede Instanz kann eigenen Prompt haben
- Klar sichtbar welche Instanz gerade bearbeitet wird
- Speichern nur für ausgewählte Instanz (nicht versehentlich für andere)

### 🆕 Multi-Active LLM Support

**Use-Cases**:
- **Fallback**: Primäres Modell + Fallback-Modell beide aktiv
- **Specialized**: Verschiedene Modelle für verschiedene Tasks
- **Load-Balancing**: Verteilung auf mehrere Instanzen

**Beispiel**:
```
✅ qwen2.5-0.5b-instruct (aktiv) - schnell für einfache Queries
✅ mistralai/mistral-7b (aktiv) - für komplexe Reasoning
❌ llama-3.1-8b (inaktiv) - Reserve
```

### 🆕 Eject vs. Delete

**Eject (Deaktivieren)**:
- Setzt `isActive: false`
- Instanz bleibt in DB
- Kann wieder aktiviert werden
- Bestätigungs-Dialog: "wirklich deaktivieren (eject)?"

**Delete (Löschen)**:
- Löscht Instanz permanent aus DB
- Nur via API verfügbar: `POST /api/llm-instances/:id/delete`
- Wird später im UI als eigener Button hinzugefügt

---

## API-Änderungen

### POST /api/llm-instances/:id/activate
**Vorher**: Deaktivierte alle anderen Instanzen  
**Jetzt**: Aktiviert nur die angegebene Instanz (Multi-Active)

### POST /api/llm-instances/:id/deactivate
**Neu**: Deaktiviert (eject) eine Instanz, setzt `health: 'unknown'`

### POST /api/llm-instances/:id/delete
**Neu**: Löscht Instanz permanent aus DB

### GET /api/llm-instances/:id/system-prompt
**Unverändert**: Gibt System-Prompt der Instanz zurück

### PUT /api/llm-instances/:id/system-prompt
**Unverändert**: Speichert System-Prompt für Instanz

---

## UI-Verbesserungen

### Instance-Cards

**Vorher**:
```
┌────────────────────────┐
│ LM Studio @ 192...     │
│ URL: http://...        │
│ Model: mistral...      │
│ [Test] [Aktiv]         │
└────────────────────────┘
```

**Jetzt**:
```
┌────────────────────────┐ ← Blauer Rahmen wenn selected
│ mistralai/mistral-7b   │ ← Model-Name prominent
│ URL: http://...        │
│ Status: Aktiv          │ ← Klarere Kennzeichnung
│ [Prompt] [Test] [Deak] │ ← Prompt-laden Button
└────────────────────────┘
```

### Status-Anzeige

- **Grüner Rahmen** = Aktive Instanz (`isActive: true`)
- **Blauer Rahmen** = Ausgewählte Instanz (Prompt geladen)
- **Grauer Rahmen** = Inaktive Instanz

### Buttons

- **"Prompt laden"** - Lädt System-Prompt dieser Instanz
- **"Test"** - Testet Verbindung
- **"Aktivieren"** (grün) - Aktiviert Instanz (nur bei inaktiven)
- **"Deaktivieren"** (rot) - Eject mit Bestätigungs-Dialog (nur bei aktiven)

---

## Testing

### Test 1: Multi-Active
```typescript
// Aktiviere mehrere Instanzen nacheinander
await activateLlmInstance(instance1);
await activateLlmInstance(instance2);

// Erwartung: Beide sind aktiv
console.log(instance1.isActive); // true
console.log(instance2.isActive); // true
```

### Test 2: Instanz-spezifischer Prompt
```typescript
// 1. Klicke "Prompt laden" bei Instanz A
await loadSystemPromptForInstance(instanceA);
// Card A wird blau, Textarea zeigt Prompt A

// 2. Bearbeite Prompt
this.systemPrompt = "Neuer Prompt für A";

// 3. Speichere
await saveSystemPrompt();
// Snackbar: "System-Prompt für [modelA] gespeichert"

// 4. Klicke "Prompt laden" bei Instanz B
await loadSystemPromptForInstance(instanceB);
// Card B wird blau, Card A nicht mehr
// Textarea zeigt Prompt B (Änderung an A war gespeichert)
```

### Test 3: Eject mit Dialog
```typescript
// Klicke "Deaktivieren" bei aktiver Instanz
await deactivateLlmInstance(instance);

// Erwartung:
// 1. Confirm-Dialog erscheint
// 2. Bei "Abbrechen": nichts passiert
// 3. Bei "OK": Instanz wird deaktiviert, Snackbar erscheint
```

---

## Bekannte Einschränkungen

1. **Delete-Button fehlt im UI**: Permanentes Löschen nur via API
   - TODO: "Löschen"-Button mit stärkerem Bestätigungs-Dialog hinzufügen

2. **Fallback-Logik**: Backend nutzt noch nicht automatisch Fallback bei Multi-Active
   - TODO: LLM-Anfrage automatisch auf nächste aktive Instanz ausweichen bei Fehler

3. **Load-Balancing**: Keine automatische Verteilung bei Multi-Active
   - TODO: Round-Robin oder Least-Loaded Strategie implementieren

---

## Dateien geändert (Session 3)

### Backend
- `backend/nest-app/src/modules/logging/logging.service.ts`
  - `activateLlmInstance()` - Multi-Active Support
  - `deactivateLlmInstance()` - neue Methode
  - `deleteLlmInstance()` - neue Methode
  
- `backend/nest-app/src/modules/logging/logging.controller.ts`
  - `@Post('/llm-instances/:id/deactivate')` - neuer Endpoint
  - `@Post('/llm-instances/:id/delete')` - neuer Endpoint

### Frontend
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.ts`
  - `loadSystemPromptForInstance()` - neue Methode
  - `deactivateLlmInstance()` - mit Bestätigungs-Dialog
  - `loadLlmInstances()` - vereinfacht
  - `saveSystemPrompt()` - besseres Feedback
  
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.html`
  - "Prompt laden"-Button in Cards
  - `[class.selected]` Binding
  - Model-Name statt Instanz-Name
  
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.scss`
  - `.selected` CSS-Klasse
  - Hover-Effekte

- `src/app/core/services/llm.service.ts`
  - `delete()` - neue Methode

---

## Zusammenfassung

🎉 **Alle Probleme aus Session 3 behoben!**

✅ Multi-Active Support - mehrere Instanzen parallel aktiv  
✅ Deaktivieren mit Bestätigungs-Dialog (Eject)  
✅ System-Prompt instanz-spezifisch laden & speichern  
✅ Visuelle Markierung der ausgewählten Instanz  
✅ Klarere UI mit Model-Namen und Status  

**Nächster Schritt**: 
1. Backend starten: `cd backend/nest-app && npm run start:dev`
2. Frontend starten: `npm start`
3. UI testen:
   - Mehrere Instanzen aktivieren (alle bleiben aktiv)
   - "Prompt laden" klicken → Card wird blau
   - Prompt bearbeiten & speichern
   - "Deaktivieren" klicken → Dialog erscheint

🚀 **Implementierung vollständig!**

