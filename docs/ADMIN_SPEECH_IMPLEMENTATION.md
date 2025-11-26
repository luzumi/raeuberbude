# Admin Speech Assistant - Feature-Implementierung

## Übersicht
Vollständige Implementierung des Kategorie-Managements, LLM-Instanz-Verwaltung und erweiterte Admin-UI für den Sprachassistenten.

## Backend-Änderungen

### Neue Models
1. **Category.js** (`backend/models/Category.js`)
   - Felder: `key`, `label`, `createdAt`
   - Automatischer Seed beim Serverstart mit allen Intent-Kategorien

2. **LlmInstance.js** (`backend/models/LlmInstance.js`)
   - Felder: `name`, `url`, `model`, `enabled`, `isActive`, `systemPrompt`, `health`, `config`, `createdAt`
   - Automatischer Scan beim Serverstart (aus `LLM_URLS` in `.env`)

### Neue API-Endpoints

#### Kategorien
- `GET /api/categories` - Liste aller Kategorien
- `POST /api/categories` - Neue Kategorie anlegen (optional)

#### LLM-Instanzen
- `GET /api/llm-instances` - Liste aller LLM-Instanzen
- `POST /api/llm-instances/scan` - Manueller Scan-Trigger
- `POST /api/llm-instances/:id/activate` - LLM aktivieren (mit Health-Check)
- `GET /api/llm-instances/:id/system-prompt` - System-Prompt abrufen
- `PUT /api/llm-instances/:id/system-prompt` - System-Prompt speichern

#### Transcripts
- `PUT /api/transcripts/:id` - Einzelnes Transcript aktualisieren
- `POST /api/transcripts/bulk-update` - Bulk-Update für mehrere Transcripts

### Startup-Logik
```javascript
mongoose.connection.once('open', async () => {
  console.log('🔌 MongoDB connected');
  await seedCategories();      // Kategorien aus Seed-Liste
  await scanLlmInstances();    // LLMs aus LLM_URLS scannen
});
```

### Umgebungsvariablen
Neue Variable in `.env`:
```env
LLM_URLS=http://192.168.56.1:1234/v1/chat/completions,http://localhost:1234/v1/chat/completions
```

## Frontend-Änderungen

### Neue Services
1. **CategoryService** (`src/app/core/services/category.service.ts`)
   - `list()` - Alle Kategorien laden
   - `create()` - Neue Kategorie erstellen

2. **LlmService** (`src/app/core/services/llm.service.ts`)
   - `listInstances()` - Alle LLM-Instanzen
   - `scan()` - Manueller Scan
   - `activate(id)` - LLM aktivieren
   - `getSystemPrompt(id)` - Prompt abrufen
   - `setSystemPrompt(id, prompt)` - Prompt speichern
   - `testConnection(instance)` - Verbindungstest

### Neue Models
- `Category` (`src/app/core/models/category.model.ts`)
- `LlmInstance` (`src/app/core/models/llm-instance.model.ts`)

### Wiederverwendbare Dialog-Komponente
**ActionDialogComponent** (`src/app/shared/components/action-dialog/action-dialog.component.ts`)
- Dynamisch befüllbar
- 3 Schließ-Möglichkeiten: X, Abbrechen, Klick außerhalb
- Typen: `ha_command`, `ha_query`, `web_search`, `greeting`, `general`, `info`, `error`
- Loading-State unterstützt

### Admin-UI Erweiterungen

#### Tab 1: Modelle & Env
**Hinzugefügt:**
- System-Prompt Textarea (editierbar, mit Default-Prompt)
- LLM-Instanzen-Liste mit:
  - Status-Anzeige (healthy/unhealthy/unknown)
  - Aktivieren-Button
  - Test-Button
  - Scan-Button
- Fallback-Model als Select (statt Input)

#### Tab 2: Statistiken
**Hinzugefügt:**
- Checkbox-Spalte in Modell-Tabelle (erste Spalte)
- Header-Checkbox für "Alle auswählen/abwählen"
- Filter: Nur ausgewählte Modelle anzeigen
- Default: Alle Modelle beim Laden ausgewählt

#### Tab 3: Anfragen
**Hinzugefügt:**
- Dynamische Filter-Selects:
  - Terminal-Select (zeigt Name + ID)
  - Model-Select (aus LLM-Instanzen)
  - Kategorie-Select (aus DB-Kategorien)
- Checkbox-Spalte (erste Spalte)
- Bulk-Actions-Bar:
  - Kategorie-Select
  - "Anwenden auf ausgewählte" Button
- Inline Kategorie-Edit in jeder Zeile
- Zurück + Schließen Buttons im Header

### Intent-Action Service
**Erweitert:** `home_assistant_queryautomation` Case hinzugefügt (nutzt gleichen Handler wie `home_assistant_query`)

## System-Prompt (Default)

Der Standard-Systemprompt wurde implementiert und enthält:
- Rollenanweisungen für Smart-Home-Assistenz
- JSON-Schema für strukturierte Aktionen
- Sicherheitsregeln
- Beispiele für korrekte Ausgaben
- Deutsche Sprache

Der Prompt kann pro LLM-Instanz individuell angepasst werden.

## Workflow

### LLM-Management
1. Backend startet → scannt URLs aus `LLM_URLS`
2. Jedes gefundene Modell wird als `LlmInstance` gespeichert
3. Erstes gesundes Modell wird als aktiv markiert
4. Admin kann in UI:
   - Andere Instanz aktivieren (mit Health-Check)
   - System-Prompt bearbeiten
   - Verbindung testen
   - Manuellen Scan triggern

### Kategorie-Verwaltung
1. Backend startet → erstellt Kategorien aus Seed
2. Frontend lädt Kategorien dynamisch
3. Admin kann:
   - Einzelne Transcripts umkategorisieren (Inline-Select)
   - Mehrere Transcripts auswählen → Bulk-Kategorie-Änderung
   - Filter nach Kategorie
4. Im aktuellen Stand ist das Mikro an allen Terminals nutzbar, aktueller Codebase ist Basis dafür (keine unnötigen Konstrukte anfertigen)

### Fallback-Handling
- Konfigurierbar via `config.fallbackModel`
- Runtime-Adapter (geplant) verwendet fallbackModel bei Timeout/Fehler
- Protokolliert `fallbackUsed` im Transcript

## Testing

### Backend
```bash
cd backend
node server.js
```
Erwartete Console-Ausgabe:
```
🔌 MongoDB connected
✅ Categories seeded
✅ LLM instance registered: mistralai/mistral-7b-instruct-v0.3 @ 192.168.56.1
✅ Set mistralai/mistral-7b-instruct-v0.3 @ 192.168.56.1 as active LLM
HTTP logging server running on port 3000
```

### Frontend
```bash
ng serve
```
Navigiere zu: `http://localhost:4200/admin/speech-assistant`

### API-Tests
```bash
# Kategorien abrufen
curl http://localhost:3000/api/categories

# LLM-Instanzen abrufen
curl http://localhost:3000/api/llm-instances

# System-Prompt abrufen
curl http://localhost:3000/api/llm-instances/<ID>/system-prompt
```

## Nächste Schritte (Optional)

1. **Kategorie-UI erweitern**
   - Admin-Seite für Kategorie-CRUD
   - Kategorie-Farben/Icons

2. **LLM-Health-Monitoring**
   - Periodischer Health-Check im Hintergrund
   - Auto-Failover zu Fallback bei Ausfall

3. **Prompt-Templates**
   - Vordefinierte System-Prompts
   - Prompt-Vorschau/Test-Funktion

4. **Mikrofon-Nutzung**
   - Sicherstellen der Funktionalität des Mikrofon-Zugriffs gewehrleisten (Aktuelle reibungslose Nutzung an allen Terminals möglich)

## Dateien-Übersicht

### Backend
- `backend/models/Category.js` (neu)
- `backend/models/LlmInstance.js` (neu)
- `backend/server.js` (erweitert)
- `backend/.env` (erweitert um `LLM_URLS`)

### Frontend
- `src/app/core/models/category.model.ts` (neu)
- `src/app/core/models/llm-instance.model.ts` (neu)
- `src/app/core/services/category.service.ts` (neu)
- `src/app/core/services/llm.service.ts` (neu)
- `src/app/core/services/intent-action.service.ts` (erweitert)
- `src/app/shared/components/action-dialog/action-dialog.component.ts` (neu)
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.ts` (erweitert)
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.html` (erweitert)
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.scss` (erweitert)

## Known Issues / Warnungen

- TypeScript-Warnungen "Unused method" sind normal - Methoden werden im Template verwendet
- `_id` optional-Assertions (`!`) bei `activeInstance._id!` - bereits validiert via `if (activeInstance)`

## Erfolgreiche Features ✅

✅ Kategorien als DB-Entität mit Seed  
✅ LLM-Scan beim Serverstart  
✅ System-Prompt editierbar (Textarea)  
✅ LLM aktivieren/testen/scannen  
✅ Fallback-Model als Select  
✅ Checkboxen in Statistik-Tabelle  
✅ Checkboxen + Bulk-Update in Transcripts  
✅ Inline Kategorie-Edit  
✅ Dynamische Filter (Terminal, Model, Kategorie)  
✅ Wiederverwendbarer Dialog  
✅ Zurück/Schließen Buttons  
✅ `home_assistant_queryautomation` Intent-Case  

## Fertig! 🎉

Die Implementierung ist vollständig und bereit zum Testen. Der Backend-Server läuft bereits (Port 3000).

