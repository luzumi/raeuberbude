# Fix Session 4: Instanz-spezifische Config per Card-Klick ✅

## Status: Vollständig implementiert

---

## Problem & Lösung

### Das Problem
- System-Prompt Textarea blieb leer
- Config-Werte (Temperature, Max Tokens, etc.) waren nur global
- Nicht klar welche Instanz gerade bearbeitet wird
- "Prompt laden" Button war umständlich
- "Deaktivieren" nicht klar genug (sollte "Eject" sein)

### Die Lösung ✅
**Card-Klick lädt ALLE instanz-spezifischen Werte:**
- System-Prompt
- Temperature
- Max Tokens
- Timeout
- Target Latency
- Confidence Shortcut
- Use GPU
- Heuristic Bypass
- Fallback Model

**Änderungen werden LLM-spezifisch gespeichert:**
- Mistral kann 0.3 Temperature haben
- Qwen kann 0.5 haben
- Jedes LLM hat eigene optimale Settings

**UI-Verbesserungen:**
- Card-Klick statt Button
- Visuelle Markierung (blauer Rahmen + "✓ Ausgewählt" Badge)
- Info-Banner zeigt ob global oder instanz-spezifisch
- "Load" statt "Aktivieren" (klarer)
- "Eject" statt "Deaktivieren" (entlädt aus LM Studio)
- Speichern-Button zeigt Model-Name

---

## Implementierung

### 1. Model erweitert
```typescript
// src/app/core/models/llm-instance.model.ts
export interface LlmInstance {
  // ...existing fields...
  config?: {
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    targetLatencyMs?: number;
    confidenceShortcut?: number;
    useGpu?: boolean;
    heuristicBypass?: boolean;
    fallbackModel?: string;
  };
}
```

### 2. selectInstance() Methode
**Was sie macht:**
- Lädt System-Prompt der Instanz
- Lädt alle Config-Werte aus `instance.config`
- Füllt Formular-Felder
- Setzt `activeInstance` (für visuelle Markierung)
- Zeigt Snackbar: "Konfiguration für [model] geladen"

**Null-Handling:**
- `selectInstance(null)` → Auswahl aufheben, globale Config laden

### 3. saveConfig() & saveInstanceConfig()
**saveConfig():**
- Prüft ob Instanz ausgewählt
- Ja → `saveInstanceConfig()`
- Nein → Globale Config speichern

**saveInstanceConfig():**
- Speichert Config-Objekt an `PUT /api/llm-instances/:id/config`
- Speichert auch System-Prompt
- Zeigt Snackbar: "Konfiguration für [model] gespeichert"

### 4. Backend-Endpoints
```typescript
// PUT /api/llm-instances/:id/config
// Speichert instanz-spezifische Config
async updateInstanceConfig(id: string, config: any) {
  const instance = await this.llmInstanceModel.findByIdAndUpdate(
    id,
    { config: config },
    { new: true }
  );
  return instance;
}
```

### 5. HTML-Änderungen
**Card-Klick:**
```html
<div class="instance-card" 
     (click)="selectInstance(instance)"
     [class.selected]="activeInstance?._id === instance._id">
  <!-- Card Content -->
</div>
```

**Info-Banner:**
- Blau: "Instanz-spezifische Konfiguration für [model]"
- Grau: "Globale Konfiguration"

**Buttons:**
- "Load" (grün) statt "Aktivieren"
- "Eject" (rot) statt "Deaktivieren"
- "Für [model] speichern" statt "Speichern"
- "Auswahl aufheben" wenn Instanz selected

**Card zeigt Config-Preview:**
```html
<p *ngIf="instance.config?.temperature">
  <strong>Temperature:</strong> {{ instance.config.temperature }}
</p>
<p *ngIf="instance.config?.maxTokens">
  <strong>Max Tokens:</strong> {{ instance.config.maxTokens }}
</p>
```

### 6. CSS-Verbesserungen
**Selected Card:**
- Blauer Rahmen (3px)
- "✓ Ausgewählt" Badge oben rechts
- Leichte Elevation
- Hover: `translateY(-2px)` Animation

---

## Workflow

### Instanz-spezifische Config bearbeiten
1. **Klicke auf eine LLM-Card**
   - Card wird blau umrandet
   - Badge "✓ Ausgewählt" erscheint
   - Info-Banner zeigt: "Instanz-spezifische Konfiguration für [model]"

2. **Formular wird gefüllt**
   - System-Prompt Textarea zeigt Prompt der Instanz
   - Temperature, Max Tokens, etc. zeigen instanz-spezifische Werte
   - Falls keine Config gesetzt: Fallback auf globale Werte

3. **Bearbeiten**
   - Ändere Temperature z.B. auf 0.5
   - Bearbeite System-Prompt
   - Ändere Max Tokens

4. **Speichern**
   - Klicke "Für [model] speichern"
   - Snackbar: "Konfiguration für [model] gespeichert"
   - Instanz-Config wird in DB gespeichert

5. **Andere Instanz auswählen**
   - Klicke auf andere Card
   - Formular zeigt deren Config
   - Vorherige Änderungen bleiben gespeichert

6. **Auswahl aufheben**
   - Klicke "Auswahl aufheben"
   - Formular zeigt globale Config
   - Info-Banner wechselt zu grau

### Load & Eject
**Load (Aktivieren):**
- Markiert Modell als aktiv für Verwendung
- Setzt `isActive: true`
- Andere Instanzen bleiben aktiv (Multi-Active)
- Card-Rahmen wird grün
- Button wird zu "Eject"
- **Hinweis**: Modell muss in LM Studio manuell geladen sein!

**Eject (Deaktivieren):**
- Bestätigungs-Dialog: "Wirklich ejec

ten?"
- **Deaktiviert nur die Verwendung in der App**
- Setzt `isActive: false`, `health: 'unknown'`
- **ENTLÄDT NICHT aus LM Studio** (muss manuell in LM Studio geschehen)
- Button wird zu "Load"
- **Klarstellung**: "Eject" = "nicht mehr verwenden", kein physisches Entladen

---

## Vorteile

### 🎯 Pro-Modell-Optimierung
- **Mistral**: Temperature 0.3, Max Tokens 500 (präzise)
- **Qwen**: Temperature 0.5, Max Tokens 300 (schnell)
- **Llama**: Temperature 0.2, Max Tokens 1000 (ausführlich)
- Jedes Modell optimal konfiguriert für seinen Use-Case

### 🎨 Bessere UX
- **Klare visuelle Zuordnung**: Blauer Rahmen + Badge
- **Weniger Klicks**: Card-Klick statt Button
- **Klarere Begriffe**: Load/Eject statt Aktivieren/Deaktivieren
- **Sofort-Feedback**: Info-Banner zeigt aktuellen Modus

### 💾 Persistenz
- Config überlebt Neustarts
- Pro-Instanz gespeichert in DB
- Globale Config als Fallback
- Keine versehentlichen Überschreibungen

### ⚡ Performance
- **Wichtig**: Eject deaktiviert nur die Verwendung, entlädt NICHT physisch aus LM Studio
- Um RAM zu sparen: Modelle manuell in LM Studio entladen (Eject-Button dort)
- Multi-Active für Fallback-Szenarien
- App verwendet nur Modelle mit `isActive: true`

---

## API-Referenz

### PUT /api/llm-instances/:id/config
Speichert instanz-spezifische Config

**Request:**
```json
{
  "temperature": 0.5,
  "maxTokens": 300,
  "timeoutMs": 30000,
  "targetLatencyMs": 2000,
  "confidenceShortcut": 0.85,
  "useGpu": true,
  "heuristicBypass": false,
  "fallbackModel": ""
}
```

**Response:**
```json
{
  "_id": "...",
  "model": "qwen2.5-0.5b-instruct",
  "config": {
    "temperature": 0.5,
    "maxTokens": 300,
    ...
  },
  ...
}
```

---

## Testing

### Test 1: Instanz-spezifische Config
```typescript
// 1. Klicke auf Mistral-Card
await selectInstance(mistralInstance);
// Formular zeigt: temperature: 0.3

// 2. Ändere auf 0.7
this.config.temperature = 0.7;

// 3. Speichere
await saveConfig();
// Snackbar: "Konfiguration für mistralai/mistral-7b gespeichert"

// 4. Klicke auf Qwen-Card
await selectInstance(qwenInstance);
// Formular zeigt: temperature: 0.3 (nicht 0.7!)

// 5. Klicke zurück auf Mistral
await selectInstance(mistralInstance);
// Formular zeigt: temperature: 0.7 ✓
```

### Test 2: Card-Visuals
```typescript
// Klicke auf Card
await selectInstance(instance);

// Erwartung:
// - Card hat blauen Rahmen (3px)
// - Badge "✓ Ausgewählt" oben rechts
// - Info-Banner ist blau
// - Speichern-Button: "Für [model] speichern"
```

### Test 3: Eject & Load
```typescript
// Aktive Instanz: Load-Button nicht sichtbar, Eject-Button sichtbar
// Klicke Eject → Confirm-Dialog
// Nach Bestätigung: isActive: false, Button wechselt zu Load
// Klicke Load → isActive: true, Button wechselt zu Eject
```

---

## Dateien geändert

### Frontend
- `src/app/core/models/llm-instance.model.ts`
  - Config-Interface erweitert (8 neue Felder)
  
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.ts`
  - `selectInstance()` - lädt alle Config-Werte
  - `saveConfig()` - delegiert an saveInstanceConfig wenn Instanz selected
  - `saveInstanceConfig()` - neue Methode
  
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.html`
  - Card (click)="selectInstance(instance)"
  - Info-Banner (blau/grau)
  - "Prompt laden" Button entfernt
  - "Eject" statt "Deaktivieren"
  - "Load" statt "Aktivieren"
  - "Für [model] speichern" Button
  - "Auswahl aufheben" Button
  - Config-Preview in Cards
  
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.scss`
  - `.selected` CSS mit Badge
  - Hover-Animation
  - Elevation

### Backend
- `backend/nest-app/src/modules/logging/logging.controller.ts`
  - `@Put('/llm-instances/:id/config')` - neuer Endpoint
  
- `backend/nest-app/src/modules/logging/logging.service.ts`
  - `updateInstanceConfig()` - neue Methode

---

## Zusammenfassung

🎉 **Vollständig implementiert!**

✅ Card-Klick lädt alle instanz-spezifischen Werte  
✅ Jedes LLM kann eigene Temperature/Tokens haben  
✅ Visuelle Markierung (blauer Rahmen + Badge)  
✅ Info-Banner zeigt aktuellen Modus  
✅ "Load" & "Eject" Buttons (kla rere Begriffe)  
✅ Config-Preview in Cards  
✅ "Für [model] speichern" Button  
✅ Backend persistiert pro-Instanz  

**Workflow:**
1. Klicke Card → Config lädt
2. Bearbeite Werte
3. Speichere → nur für diese Instanz
4. Andere Card → deren Config
5. Auswahl aufheben → globale Config

🚀 **Bereit zum Testen!**

