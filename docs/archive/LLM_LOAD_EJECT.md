# LLM Load/Eject Implementation

## Übersicht

Die LLM-Verwaltung wurde von "Aktivieren/Deaktivieren" auf "Load/Eject" umgestellt. Dies spiegelt besser wider, dass ein geladenes Modell automatisch aktiv ist und ein entladenes Modell inaktiv ist.

## Konzeptänderung

### Vorher (Aktivieren/Deaktivieren)
- **Aktivieren**: Markierte ein Modell als aktiv in der App
- **Deaktivieren**: Markierte ein Modell als inaktiv, versuchte optional MCP-Eject

**Problem**: Verwirrend, da "Aktivieren" nicht bedeutete, dass das Modell geladen wird, und "Deaktivieren" nicht garantierte, dass es entladen wird.

### Nachher (Load/Eject)
- **Load**: Versucht das Modell in LM Studio zu laden (via MCP) und markiert es als aktiv
- **Eject**: Versucht das Modell aus LM Studio zu entladen (via MCP) und markiert es als inaktiv

**Vorteil**: Klare Semantik - ein geladenes Modell ist automatisch aktiv, ein entladenes Modell ist inaktiv.

## Technische Änderungen

### Backend

#### API Endpoints (logging.controller.ts)
```typescript
// Alt
POST /api/llm-instances/:id/activate
POST /api/llm-instances/:id/deactivate

// Neu
POST /api/llm-instances/:id/load
POST /api/llm-instances/:id/eject
```

#### Service Methoden (logging.service.ts)
```typescript
// Alt
async activateLlmInstance(id: string)
async deactivateLlmInstance(id: string, options?: { tryEject?: boolean })

// Neu
async loadLlmInstance(id: string)
async ejectLlmInstance(id: string)
```

**Load-Logik**:
1. Nutzt `LmStudioMcpService.loadModel(modelId)` - kommuniziert mit MCP Server
2. MCP Server sendet Load-Request an LM Studio via JSON-RPC
3. Prüft Health-Status des Modells (separate HTTP-Abfrage)
4. Markiert Instanz als `isActive = true`
5. Gibt `loadResult` mit Erfolg/Fehler zurück

**Eject-Logik**:
1. Nutzt `LmStudioMcpService.unloadModel(modelId)` - kommuniziert mit MCP Server
2. MCP Server sendet Unload-Request an LM Studio via JSON-RPC
3. Markiert Instanz als `isActive = false`
4. Setzt Health-Status auf 'unknown'
5. Gibt `ejectResult` mit Erfolg/Fehler zurück

### Frontend

#### Service (llm.service.ts)
```typescript
// Alt
activate(id: string): Observable<LlmInstance>
deactivate(id: string, tryEject?: boolean): Observable<any>

// Neu
load(id: string): Observable<LlmInstance & { loadResult?: {...} }>
eject(id: string): Observable<LlmInstance & { ejectResult?: {...} }>
```

#### Component (admin-speech-assistant.component.ts)
```typescript
// Alt
async activateLlmInstance(instance: LlmInstance)
async deactivateLlmInstance(instance: LlmInstance)

// Neu
async loadLlmInstance(instance: LlmInstance)
async ejectLlmInstance(instance: LlmInstance)
```

#### Template (admin-speech-assistant.component.html)
```html
<!-- Alt -->
<button *ngIf="!instance.isActive" (click)="activateLlmInstance(instance)">
  <mat-icon>play_arrow</mat-icon>
  Aktivieren
</button>
<button *ngIf="instance.isActive" (click)="deactivateLlmInstance(instance)">
  <mat-icon>block</mat-icon>
  Deaktivieren
</button>

<!-- Neu -->
<button *ngIf="!instance.isActive" (click)="loadLlmInstance(instance)">
  <mat-icon>download</mat-icon>
  Load
</button>
<button *ngIf="instance.isActive" (click)="ejectLlmInstance(instance)">
  <mat-icon>eject</mat-icon>
  Eject
</button>
```

#### Model (llm-instance.model.ts)
Erweitert um optionale Result-Properties:
```typescript
export interface LlmInstance {
  // ...existing properties...
  loadResult?: {
    success: boolean;
    message?: string;
    error?: string;
  };
  ejectResult?: {
    success: boolean;
    message?: string;
    error?: string;
  };
}
```

## MCP Server Integration

### Architektur

```
Frontend (Angular)
    ↓ HTTP
Backend (NestJS LoggingService)
    ↓ Dependency Injection
LmStudioMcpService
    ↓ JSON-RPC (stdio)
MCP Server (.specify/mcp-servers/lm-studio-mcp-server.js)
    ↓ HTTP API
LM Studio (http://192.168.56.1:1234)
```

### MCP Server Setup

Der MCP Server läuft als Node.js Child Process und wird automatisch vom `LmStudioMcpService` gestartet:

**Module Integration** (`logging.module.ts`):
```typescript
providers: [LoggingService, LmStudioMcpService]
```

**Service Integration** (`logging.service.ts`):
```typescript
constructor(
  // ... other dependencies
  private readonly mcpService: LmStudioMcpService,
) {}

async loadLlmInstance(id: string) {
  const mcpResult = await this.mcpService.loadModel(modelId);
  // ...
}
```

### MCP Server Tools

Der MCP Server (`.specify/mcp-servers/lm-studio-mcp-server.js`) bietet:

- `list_models`: Liste aller geladenen Modelle
- `load_model`: Modell laden (via `tools/call` JSON-RPC)
- `unload_model`: Modell entladen (via `tools/call` JSON-RPC)
- `get_model_status`: Status eines Modells abfragen
- `chat`: Chat-Anfrage an geladenes Modell

### JSON-RPC Kommunikation

**Load Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "load_model",
    "arguments": { "modelId": "model-name" }
  }
}
```

**Response (Success)**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "text": "{\"success\": true, \"message\": \"Model loaded\"}"
    }]
  }
}
```

**Response (Error - API nicht unterstützt)**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "text": "{\"success\": false, \"error\": \"LM Studio does not support load API\"}"
    }]
  }
}
```

### Fallback Handling

**Hinweis**: Nicht alle LM Studio Versionen unterstützen load/unload APIs. In diesem Fall:
- Load: Modell muss manuell in LM Studio UI geladen werden
- Eject: Modell muss manuell in LM Studio UI entladen werden

Die App zeigt entsprechende Fehlermeldungen, wenn die APIs nicht verfügbar sind.

**MCP Server Verhalten**:
- Prüft ob LM Studio die API unterstützt (HTTP 404/405 = nicht unterstützt)
- Gibt strukturiertes Error-Objekt zurück statt zu crashen
- Backend propagiert Fehler mit klaren Meldungen an Frontend

## UI Feedback

### Load Feedback
- ✅ **Erfolg**: "✅ {model} geladen!"
- ⚠️ **API nicht unterstützt**: "⚠️ {model} als aktiv markiert (LM Studio load API nicht verfügbar - Modell manuell laden)"
- ❌ **Fehler**: "Laden fehlgeschlagen"

### Eject Feedback
- ✅ **Erfolg**: "✅ {model} aus LM Studio entladen!"
- ⚠️ **API nicht unterstützt**: "⚠️ {model} als inaktiv markiert, aber Eject fehlgeschlagen: LM Studio API unterstützt Eject nicht - bitte manuell entladen"
- ❌ **Fehler**: "Eject fehlgeschlagen"

## Status-Anzeige

Die Instanz-Karte zeigt den Status:
- **Geladen ✅**: `isActive = true`
- **Nicht geladen 🔴**: `isActive = false`

## Migration

### Für Entwickler
- Alle Referenzen zu `activate`/`deactivate` wurden zu `load`/`eject` umbenannt
- Keine Breaking Changes für gespeicherte Daten (DB-Schema unverändert)
- `isActive` Flag hat gleiche Bedeutung

### Für Benutzer
- Buttons im Admin-UI haben neue Labels und Icons
- Funktionalität ist identisch, nur semantisch klarer
- Bestehende Instanzen funktionieren weiterhin

## Testing

### Backend Test
```bash
# Load
curl -X POST http://localhost:3001/api/llm-instances/{id}/load

# Eject
curl -X POST http://localhost:3001/api/llm-instances/{id}/eject
```

### Frontend Test
1. Öffne Admin → Sprachassistent → Modelle & Env
2. Wähle eine Instanz aus
3. Klicke auf "Load" → Modell sollte in LM Studio geladen werden
4. Klicke auf "Eject" → Modell sollte aus LM Studio entladen werden

## Bekannte Einschränkungen

1. **LM Studio API Unterstützung**: Nicht alle Versionen unterstützen load/unload
2. **Manuelle Fallback**: Bei fehlender API-Unterstützung manuell in LM Studio laden/entladen
3. **Health Check**: Prüft nur Erreichbarkeit, nicht ob Modell tatsächlich geladen ist

## Zukunft

Mögliche Erweiterungen:
- Automatische Modell-Rotation (älteste unbenutzte Modelle automatisch ejekten)
- Preload-Queue (Modelle im Hintergrund vorladen)
- GPU-Speicher-Monitoring (Warnung bei zu vielen geladenen Modellen)

## Siehe auch

- [MCP_EJECT_IMPLEMENTATION.md](./MCP_EJECT_IMPLEMENTATION.md) - Ursprüngliche Eject-Implementation
- [LLM_IMPLEMENTATION_SUMMARY.md](./LLM_IMPLEMENTATION_SUMMARY.md) - LLM System Übersicht
- [SPEECH_QUICKSTART.md](./SPEECH_QUICKSTART.md) - Schnellstart Guide

