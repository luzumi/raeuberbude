# LLM Model Selection Feature

## Übersicht

Die globalen LLM-Einstellungen wurden erweitert, um die Auswahl von Modellen aus LM Studio zu ermöglichen. Statt manueller Texteingabe können Benutzer nun aus einer Liste verfügbarer Modelle wählen.

## Implementierte Features

### 1. **Dropdown für Modellauswahl**
- Primäres Modell und Fallback-Modell werden jetzt als Dropdowns angezeigt
- Die Dropdowns werden erst aktiviert, nachdem Modelle von LM Studio geladen wurden

### 2. **Automatisches Laden der Modelle**
- Beim Öffnen des Dialogs werden automatisch die verfügbaren Modelle von der konfigurierten LM Studio URL geladen
- Ein "Refresh"-Button (🔄) neben dem URL-Feld ermöglicht das manuelle Neuladen der Modelle
- Während des Ladens wird ein Spinner angezeigt

### 3. **Fallback-Modell (optional)**
- Das Fallback-Modell kann leer gelassen werden (Option: "-- Kein Fallback --")
- Nützlich, wenn kein Backup-Modell benötigt wird

### 4. **Slider für Parameter**
- **Temperature** (0.0 - 1.0): Steuert die Kreativität des Modells
- **Max Tokens** (100 - 2000): Maximale Antwortlänge
- **Confidence Shortcut** (0.0 - 1.0): Schwellwert für Heuristik-Bypass
- **Timeout** (5s - 60s): Maximale Wartezeit für LLM-Antworten
- **CPU Threads** (1 - Kerne-1): Anzahl CPU-Threads für Inferenz

### 5. **Select-Dropdowns für erweiterte Einstellungen**
- **Context-Länge**: Wählbare Werte von 2K bis 32K Tokens
- **Batch-Größe**: Von 1 (einzeln) bis 32 für Batch-Verarbeitung

## Verwendung

### Schritt-für-Schritt Anleitung

1. **Öffne die globalen LLM-Einstellungen:**
   - Navigiere zu Admin → Speech Assistant
   - Klicke auf "Globale Einstellungen"

2. **LM Studio URL eingeben:**
   - Gib die URL deines LM Studio Servers ein (z.B. `http://192.168.56.1:1234`)
   - Die URL kann mit oder ohne `/v1/chat/completions` Pfad eingegeben werden

3. **Modelle laden:**
   - Die Modelle werden automatisch geladen, wenn eine URL vorhanden ist
   - Alternativ: Klicke auf den 🔄 Button neben dem URL-Feld
   - Warte, bis der Ladevorgang abgeschlossen ist

4. **Modelle auswählen:**
   - Wähle aus dem Dropdown das primäre Modell
   - Optional: Wähle ein Fallback-Modell

5. **Parameter anpassen:**
   - **Temperature**: Höhere Werte (0.7-1.0) für kreativere Antworten, niedrigere (0.1-0.3) für präzisere
   - **Max Tokens**: Anzahl der generierten Tokens (Standard: 500)
   - **Confidence Shortcut**: Bei hoher STT-Confidence wird LLM übersprungen (Standard: 0.85)
   - **Timeout**: Maximale Wartezeit für LLM-Antworten (Standard: 30s)
   - **Context-Länge**: Speicher für vorherige Interaktionen (Standard: 4K)
   - **Batch-Größe**: Anzahl parallel verarbeiteter Anfragen (Standard: 1)
   - **CPU Threads**: Anzahl genutzter CPU-Kerne (wird automatisch auf Kerne-1 begrenzt)

6. **Einstellungen speichern:**
   - Klicke auf "Speichern"

## Technische Details

### Geänderte Dateien

1. **admin-global-config-dialog.component.ts**
   - Hinzugefügt: `LlmService` Injection
   - Hinzugefügt: `OnInit` Interface
   - Hinzugefügt: `availableModels` Array und `loadingModels` Flag
   - Hinzugefügt: `loadModels()` Methode zum Abrufen der Modelle
   - Template aktualisiert: Textfelder durch `<mat-select>` ersetzt

2. **llm.service.ts**
   - Verbessert: `getModels()` Methode
   - Unterstützt jetzt verschiedene URL-Formate:
     - `http://host:port` → versucht `/v1/models` und `/models`
     - `http://host:port/v1/chat/completions` → ersetzt durch `/v1/models`
     - Automatische Normalisierung von URLs

3. **transcription-validator.service.ts**
   - Hinzugefügt: `normalizeLMStudioUrl()` Methode
   - Stellt sicher, dass `/v1/chat/completions` am Ende der URL ist
   - Defensive Prüfungen für LLM-Response-Struktur

### API Endpoints

Die `getModels()` Methode versucht folgende Endpoints in dieser Reihenfolge:

1. `{url}/v1/models` (Standard LM Studio Endpoint)
2. `{url}/models` (Alternative)
3. Bei Pfaden in der URL: `{origin}{path}/v1/models`

### Response Format

LM Studio `/v1/models` Endpoint gibt folgendes Format zurück:

```json
{
  "object": "list",
  "data": [
    {
      "id": "mistralai/mistral-7b-instruct-v0.3",
      "object": "model",
      "owned_by": "organization-owner",
      "permission": []
    }
  ]
}
```

Die `getModels()` Methode extrahiert die `id`-Felder aus diesem Format.

## Bekannte Probleme & Fixes

### ✅ Fixed: Select-Dropdowns werden beim Klicken deaktiviert
- **Problem:** Beim Klicken auf ein Select-Dropdown wurden die Dropdowns deaktiviert
- **Ursache:** Das `blur`-Event auf dem URL-Feld löste `onUrlChange()` aus, was die `availableModels` Liste leerte
- **Fix:** `blur`-Event und `onUrlChange()` Methode entfernt. Modelle werden jetzt nur manuell über den 🔄 Button neu geladen

## Fehlerbehandlung

### Keine Modelle gefunden
- **Ursache:** LM Studio ist nicht erreichbar oder hat keine geladenen Modelle
- **Lösung:** 
  - Prüfe, ob LM Studio läuft
  - Prüfe die URL (korrekte IP und Port)
  - Lade mindestens ein Modell in LM Studio

### Fehler beim Laden der Modelle
- **Ursache:** Netzwerkfehler, falsche URL, CORS-Problem
- **Lösung:**
  - Prüfe die Browser-Konsole für Details
  - Stelle sicher, dass LM Studio CORS erlaubt
  - Teste die URL manuell im Browser: `http://192.168.56.1:1234/v1/models`

### Aktuelles Modell nicht in der Liste
- **Ursache:** Das konfigurierte Modell ist nicht in LM Studio geladen
- **Verhalten:** Das Modell bleibt in der Konfiguration, wird aber als ungültig markiert
- **Lösung:** Wähle ein verfügbares Modell aus der Dropdown-Liste

## Best Practices

1. **URL-Format:** Verwende `http://host:port` ohne Pfad - der Service fügt automatisch den richtigen Endpoint hinzu

2. **Fallback-Modell:** Konfiguriere ein kleineres, schnelleres Modell als Fallback für den Fall, dass das primäre Modell nicht verfügbar ist

3. **Modell-Reload:** Nach dem Laden/Entladen von Modellen in LM Studio auf 🔄 klicken, um die Liste zu aktualisieren

4. **Performance:** Schnellere Modelle (7B Parameter) sind besser für Intent-Erkennung als große Modelle (70B+)

## Zukünftige Erweiterungen

- [ ] Anzeige von Modell-Details (Größe, Status, Latenz)
- [ ] Automatische Modellauswahl basierend auf Performance-Metriken
- [ ] Integration mit MCP Server für Load/Unload Funktionalität
- [ ] Batch-Test mehrerer Modelle gleichzeitig
- [ ] Modell-Favoriten und Presets

## Siehe auch

- [LLM_QUICKSTART.md](LLM_QUICKSTART.md) - Schnellstart für LLM-Integration
- [LLM_RUNTIME_CONFIG.md](LLM_RUNTIME_CONFIG.md) - Runtime-Konfiguration Details
- [SPEECH_VALIDATION.md](SPEECH_VALIDATION.md) - Validierungs-Pipeline

