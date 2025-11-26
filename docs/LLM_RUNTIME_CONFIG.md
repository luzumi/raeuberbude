# LLM-Kommunikation: App ↔ LM Studio

## Übersicht

Die Kommunikation zwischen der Räuberbude-App und LM Studio wurde umgebaut:
- **Runtime-Konfiguration**: Alle LLM-Einstellungen (URL, Model, Temperature, etc.) werden zur Laufzeit geladen und gespeichert
- **Persistenz**: Backend speichert Settings in `backend/nest-app/config/llm-config.json`
- **Multi-Model Support**: Scan zeigt alle verfügbaren Modelle als separate Instanzen
- **Sofort-Update**: Änderungen in der Admin-UI werden sofort wirksam (kein Rebuild nötig)

## Architektur

### Frontend
- **SettingsService** (`src/app/core/services/settings.service.ts`):
  - Lädt Config vom Backend beim App-Start
  - Speichert Änderungen persistent
  - Bietet Observable für reaktive UI-Updates
  - Normalisiert URLs (entfernt `/v1/chat/completions` aus gespeicherter URL)

- **Admin-Komponente** (`src/app/features/admin/speech-assistant/`):
  - Nutzt SettingsService statt `environment.ts`
  - Zeigt alle verfügbaren Modelle als Cards
  - Speichern-Button → sofortiges Update

### Backend
- **LoggingController** (`backend/nest-app/src/modules/logging/logging.controller.ts`):
  - `GET /api/llm-config` - Config laden (merged mit ENV-Defaults)
  - `POST /api/llm-config` - Config speichern
  - `GET /api/llm-config/runtime` - Reine Runtime-Config

- **LoggingService** (`backend/nest-app/src/modules/logging/logging.service.ts`):
  - Persistiert Config in `config/llm-config.json`
  - URL-Normalisierung (Basis-URL ohne Endpoint)
  - Numerische Werte werden korrekt gecastet
  - `scanLlmInstances`: Holt alle Modelle von `/v1/models` und erstellt separate Instanzen

## Verwendung

### 1. Backend starten
```bash
cd backend/nest-app
npm run start:dev
```

### 2. LM Studio konfigurieren
- LM Studio öffnen
- Server starten (Port 1234)
- Modell laden (z.B. `qwen2.5-0.5b-instruct` oder `mistralai/mistral-7b-instruct-v0.3`)

### 3. Admin-UI nutzen
1. In der App zu "Sprachassistent Admin" navigieren
2. Tab "Modelle & Env" öffnen
3. "LLM-Instanzen scannen" klicken → zeigt alle verfügbaren Modelle
4. Gewünschtes Modell in "Primäres Modell" auswählen
5. Temperature/Max Tokens anpassen
6. "Speichern" klicken
7. **Änderungen sind sofort aktiv** (kein Rebuild!)

### 4. Testen
```bash
# Direkter Test gegen LM Studio
curl -X POST 'http://192.168.56.1:1234/v1/chat/completions' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "qwen2.5-0.5b-instruct",
    "messages":[{"role":"user","content":"Hallo"}],
    "max_tokens":50
  }'

# Config-API testen
curl http://localhost:3001/api/llm-config

# Config speichern
curl -X POST http://localhost:3001/api/llm-config \
  -H 'Content-Type: application/json' \
  -d '{
    "temperature": 0.8,
    "model": "mistralai/mistral-7b-instruct-v0.3"
  }'
```

## Config-Datei

Die Datei `backend/nest-app/config/llm-config.json` enthält die Runtime-Settings:

```json
{
  "url": "http://192.168.56.1:1234",
  "model": "qwen2.5-0.5b-instruct",
  "useGpu": true,
  "timeoutMs": 30000,
  "targetLatencyMs": 2000,
  "maxTokens": 500,
  "temperature": 0.8,
  "fallbackModel": "",
  "confidenceShortcut": 0.85,
  "heuristicBypass": false
}
```

**Wichtig**: Diese Datei ist in `.gitignore`, damit User-Settings nicht committed werden.

## URL-Normalisierung

URLs werden automatisch normalisiert:
- Eingabe: `http://192.168.56.1:1234/v1/chat/completions`
- Gespeichert: `http://192.168.56.1:1234`
- Client hängt Endpoint an: `/v1/chat/completions` oder `/v1/models`

Vorteil: Flexibilität bei verschiedenen Endpoints (Chat, Models, etc.)

## Fehlerbehebung

### Problem: UI zeigt alte Werte nach Speichern
**Lösung**: Browser-Cache leeren oder Hard-Reload (Ctrl+Shift+R)

### Problem: Nur ein Modell wird in Cards angezeigt
**Ursache**: `scanLlmInstances` holt Modelle von `/v1/models`
**Lösung**: 
1. Prüfe, ob LM Studio läuft und Modelle geladen sind
2. Browser-Console prüfen auf Fehler
3. Backend-Logs prüfen: sollte zeigen "Found N models: ..."

### Problem: Temperature in LM Studio stimmt nicht mit UI überein
**Ursache**: LM Studio hat eigene Temperature-Einstellung (unabhängig von API)
**Lösung**: Temperature wird im API-Request (`POST /v1/chat/completions`) übergeben und überschreibt LM Studio Default

### Problem: Config wird nicht gespeichert
**Prüfen**:
1. Backend-Logs: "LLM config saved to file"
2. Datei existiert: `backend/nest-app/config/llm-config.json`
3. Schreibrechte für Verzeichnis
4. Network-Tab: POST zu `/api/llm-config` liefert `200` mit `success: true`

## Nächste Schritte

- [ ] Multi-LLM-Support: Mehrere LM Studio Instanzen parallel
- [ ] Cloud-Provider (OpenAI, Anthropic) Integration
- [ ] Model-Switch zur Laufzeit ohne UI-Reload
- [ ] Performance-Monitoring pro Modell
- [ ] Automatischer Fallback bei Timeout

## API-Referenz

### `GET /api/llm-config`
Lädt aktuelle Config (Runtime + ENV-Defaults)

**Response**:
```json
{
  "url": "http://192.168.56.1:1234",
  "model": "qwen2.5-0.5b-instruct",
  "temperature": 0.8,
  ...
}
```

### `POST /api/llm-config`
Speichert Config-Updates

**Request**:
```json
{
  "temperature": 0.7,
  "maxTokens": 300
}
```

**Response**:
```json
{
  "success": true,
  "config": { /* merged config */ }
}
```

### `POST /api/llm-instances/scan`
Scannt verfügbare Modelle und erstellt Instanzen

**Request**:
```json
{
  "llmUrls": "http://192.168.56.1:1234",
  "defaultModel": "mistralai/mistral-7b-instruct-v0.3"
}
```

**Response**:
```json
[
  {
    "_id": "...",
    "name": "LM Studio @ 192.168.56.1",
    "url": "http://192.168.56.1:1234/v1/chat/completions",
    "model": "qwen2.5-0.5b-instruct",
    "health": "healthy",
    "isActive": true,
    ...
  },
  ...
]
```

