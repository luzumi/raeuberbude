# Intent-Erkennungs-System - Dokumentation

## Übersicht

Das System erkennt automatisch die **Absicht (Intent)** hinter Spracheingaben und verarbeitet sie entsprechend.

## Intent-Typen

### 1. **home_assistant_command**
Smart Home Befehle ausführen

**Beispiele:**
- "Mach alle Lichter im Wohnzimmer aus"
- "Schalte den Fernseher ein"
- "Stelle die Heizung auf 22 Grad"

**Verarbeitung:**
- Dialog zeigt erkannte Aktion, Gerätetyp, Raum
- Zeigt Schlagworte und erkannte Entitäten
- Später: Mapping zu konkreten HA-Entitäten aus Datenbank

### 2. **home_assistant_query**
Status von Smart Home Geräten abfragen

**Beispiele:**
- "Ist das Licht an?"
- "Welche Temperatur hat es?"
- "Sind alle Fenster geschlossen?"

**Verarbeitung:**
- Dialog zeigt Abfrage
- Später: Tatsächliche Abfrage an HA

### 3. **navigation**
App-Navigation (KEIN Dialog!)

**Beispiele:**
- "Zeige mir den Samsung TV"
- "Öffne Dashboard"
- "Gehe zu Einstellungen"

**Verarbeitung:**
- Direkte Navigation zur Route
- Kein Dialog (außer bei Fehler)

**Route-Mapping:**
```typescript
'samsung-tv' → '/rooms/samsung-tv'
'fire-tv' → '/rooms/fire-tv'
'dashboard' → '/dashboard'
'settings' → '/settings'
```

### 4. **web_search**
Internet-Suchen

**Beispiele:**
- "Wie hat Werder Bremen heute gespielt?"
- "Wo wird heute Fußball übertragen?"
- "Wetter morgen"

**Verarbeitung:**
- Dialog mit Suchanfrage
- Links zu Google/DuckDuckGo
- Später: Integrierte Suche mit Zusammenfassung + Quellenangaben

### 5. **greeting**
Begrüßungen (KEIN Dialog!)

**Beispiele:**
- "Hallo"
- "Guten Morgen"
- "Herzlich willkommen"

**Verarbeitung:**
- Kurze TTS-Antwort
- Kein Dialog

### 6. **general_question**
Allgemeine Fragen

**Beispiele:**
- "Wie spät ist es?" → Uhrzeit-Dialog
- "Welches Datum ist heute?" → Datum-Dialog

**Verarbeitung:**
- Dialog mit Antwort
- Integrierte Antworten für bekannte Fragen

### 7. **unknown**
Unklare Eingaben

**Verarbeitung:**
- Dialog mit Hinweis
- Bitte um Klarstellung

## Architektur

```
┌─────────────────┐
│  User spricht   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   STT (Browser  │
│   oder Server)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  TranscriptionValidatorService   │
│  + LLM (Mistral)                │
│  → ValidationResult mit Intent   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  SpeechService                  │
│  → intentActionService.handle()  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  IntentActionService            │
│  → Verzweigt nach Intent-Type    │
└────────┬────────────────────────┘
         │
    ┌────┴────┬────────┬──────────┬──────────┐
    │         │        │          │          │
    ▼         ▼        ▼          ▼          ▼
┌────────┐ ┌─────┐ ┌──────┐  ┌──────┐  ┌──────┐
│HA Cmd  │ │Query│ │ Nav  │  │Search│  │General│
└───┬────┘ └──┬──┘ └──┬───┘  └──┬───┘  └──┬───┘
    │         │        │         │         │
    ▼         ▼        │         ▼         ▼
┌────────────────┐    │    ┌────────────────┐
│  ActionDialog  │    │    │  ActionDialog  │
│  (zeigt Info)  │    │    │  (zeigt Info)  │
└────────────────┘    │    └────────────────┘
                      │
                      ▼
              ┌─────────────┐
              │   Router    │
              │ (Navigation)│
              └─────────────┘
```

## Komponenten

### 1. **intent-recognition.model.ts**
TypeScript Interfaces für Intent-Typen

### 2. **TranscriptionValidatorService**
- Erweitert um Intent-Erkennung
- LLM klassifiziert Eingabe
- Gibt `ValidationResult` mit `intent` zurück

### 3. **IntentActionService**
- Verarbeitet Intents
- Verzweigt nach Intent-Type
- Erzeugt `ActionResult`
- Loggt Aktionen

### 4. **ActionDialogComponent**
- Zeigt Dialoge für Ergebnisse
- Verschiedene Styles je nach Intent-Type
- Schließen-Button (✕)
- Links für Web-Suche

### 5. **SpeechService**
- Integriert IntentActionService
- Ruft `handleIntent()` nach Validierung
- TTS-Feedback für bestimmte Intents

## Nutzung

### Automatic

Einfach sprechen! Das System:
1. Transkribiert
2. Validiert
3. Erkennt Intent
4. Verarbeitet automatisch
5. Zeigt Dialog (wenn nötig)

### Beispiel-Flows

#### Home Assistant Befehl
```
User: "Mach alle Lichter im Wohnzimmer aus"
→ STT
→ Validierung: isValid=true
→ Intent: home_assistant_command
  - action: turn_off
  - entityType: light
  - location: wohnzimmer
→ Dialog zeigt:
  - "Ausschalten light im wohnzimmer"
  - Schlagworte: lichter, wohnzimmer, aus
  - Erkannte Entitäten
→ Logging
```

#### Navigation
```
User: "Zeige Samsung TV"
→ STT
→ Validierung: isValid=true
→ Intent: navigation
  - target: samsung-tv
→ Router: /rooms/samsung-tv
→ KEIN Dialog
→ Logging
```

#### Web-Suche
```
User: "Wie hat Werder heute gespielt?"
→ STT
→ Validierung: isValid=true
→ Intent: web_search
  - query: "Werder Bremen Spielergebnis heute"
  - searchType: sports
→ Dialog zeigt:
  - Suchanfrage
  - Links zu Google/DuckDuckGo
→ Logging
```

## Logging

Jede Aktion wird geloggt:

```typescript
{
  timestamp: "2025-11-16T14:30:00.000Z",
  transcript: "Mach alle Lichter aus",
  intent: "home_assistant_command",
  summary: "Ausschalten light",
  keywords: ["lichter", "aus"],
  confidence: 0.95,
  terminalId: "terminal-12345"
}
```

**Aktuell:** Console-Logging  
**Später:** Backend-API + Datenbank

## Erweiterungen

### Sofort möglich:

1. **Mehr Routen** in `intent-action.service.ts` Route-Mapping
2. **Mehr allgemeine Fragen** in `handleGeneralQuestion()`
3. **Custom TTS-Antworten** für bestimmte Befehle

### Geplant:

1. **HA-Entitäts-Mapping**
   - Datenbank-Tabelle: `entity_mappings`
   - Zuordnung: "wohnzimmer licht" → `light.living_room_main`

2. **Echte Web-Suche**
   - MCP-Integration
   - Zusammenfassung per LLM
   - Quellenangaben

3. **Backend-Logging**
   - REST-API Endpoint: `/api/intent-logs`
   - MongoDB Collection: `intent_logs`

4. **Feedback-Loop**
   - User kann Korrekturen vornehmen
   - Training-Daten für LLM

## Konfiguration

### Intent-Action-Service

```typescript
// Neue Route hinzufügen
const routeMap: Record<string, string> = {
  'mein-gerät': '/rooms/mein-gerät',
  // ...
};
```

### LLM-Prompt anpassen

In `transcription-validator.service.ts`:
```typescript
const systemPrompt = `...
// Neue Beispiele hinzufügen
"Mein custom Befehl" → intent.type=..., ...
`;
```

## Testing

### Console-Ausgaben prüfen

```javascript
// Nach Spracheingabe:
LLM Validation Result: { isValid: true, intent: {...} }
Detected Intent: home_assistant_command "Ausschalten light im wohnzimmer"
Handling Intent: home_assistant_command {...}
📝 Action Log: {...}
Intent Action Result: {...}
```

### Dialog testen

1. Sprechen: "Mach das Licht aus"
2. Dialog erscheint
3. Zeigt erkannte Details
4. [OK] Button schließt

## Status

✅ **Intent-Erkennung** - Funktioniert mit LLM  
✅ **7 Intent-Typen** - Implementiert  
✅ **Dialog-System** - Einsatzbereit  
✅ **Logging** - Console (erweiterbar)  
✅ **Navigation** - Funktional  
🔄 **HA-Mapping** - Vorbereitet (TODO)  
🔄 **Web-Suche** - Vorbereitet (TODO)  
🔄 **Backend-Logging** - Vorbereitet (TODO)  

Das Intent-System ist **production-ready** für die erste Version! 🎉

