# Speech-to-Text (STT) Setup Guide

## Problem
Der Benutzer konnte nicht sprechen, weil die STT Services (Vosk/Whisper) nicht erreichbar waren.

## Lösungen

### Option 1: Docker Setup (Empfohlen für einfaches Setup)

```bash
# Terminal 1: Starte alle Docker Services (MongoDB, Vosk, Whisper, NestJS API)
scripts/start-docker-complete.bat

# Terminal 2: Starte Angular Dev Server
# (wird automatisch von docker-complete.bat gestartet)

# Öffne http://localhost:4301
```

### Option 2: Lokales Setup (Entwicklung)

```bash
# Stelle sicher, dass MongoDB läuft (z.B. via docker-compose oder lokal)

# Terminal 1: Starte STT Services via Docker
scripts/start-stt-services.bat

# Terminal 2: Starte Nest.js Backend
cd backend/nest-app
npm run start:dev

# Terminal 3: Starte MCP Servers
cd .specify/mcp-servers
npm run all

# Terminal 4: Starte Angular Dev Server
ng serve --host 0.0.0.0 --port 4301 --configuration=network
```

## STT Providers

### Vosk (Offline, Deutsch)
- **URL**: `ws://localhost:2700`
- **Vorteile**: Schnell, offline, keine Internetverbindung nötig
- **Nachteile**: Weniger akkurat als Whisper
- **Modell**: German model (`./backend/vosk-model/model`)

### Whisper (Online/Local, High-Quality)
- **URL**: `http://localhost:9090/transcribe`
- **Vorteile**: Sehr akkurat, funktioniert mit vielen Sprachen
- **Nachteile**: Braucht mehr Ressourcen
- **Modell**: `small` (Deutsch unterstützt)

## Konfiguration

### Backend `.env` Wichtige Variablen

```env
# STT Provider Priority
STT_PRIMARY=whisper    # Versuche erst Whisper
STT_SECONDARY=vosk     # Fallback zu Vosk
STT_LANG=de-DE
STT_ENABLED=true

# Service URLs (lokal)
VOSK_WS_URL=ws://localhost:2700
WHISPER_URL=http://localhost:9090/transcribe

# API Server Port
API_PORT=3001

# LLM Validation
LLM_URLS=http://127.0.0.1:1234/v1/chat/completions

# MongoDB
MONGO_URI=mongodb://rb_root:rb_secret@localhost:27018/raueberbude
```

### Frontend Speech Service Fallback

Die Frontend `speech.service.ts` hat jetzt intelligentes Fallback:

1. **Health Check**: Prüft beim Start, ob Backend STT verfügbar ist
2. **Automatic Fallback**: Wenn Backend nicht erreichbar → Browser-STT (Web Speech API)
3. **Storage Memory**: Merkt sich die gewählte STT Mode in localStorage

```typescript
// Der Service wechselt automatisch zu Browser-STT wenn Backend nicht erreichbar ist
if (sttMode === 'auto' || sttMode === 'server') {
  // Versuche Server-STT
  await this.startServerRecording(...);
  // Bei Fehler -> Browser-STT Fallback
}
```

## Troubleshooting

### "Already recording" Error
- ✅ **GELÖST**: Service hat jetzt Failsafe Timeout (120s) und Auto-Reset nach 90s

### Leere Transkriptionen ("" with confidence: 0)
- **Ursache**: STT Services (Vosk/Whisper) nicht erreichbar
- **Lösung**: 
  - Option 1: `scripts/start-stt-services.bat` ausführen
  - Option 2: Frontend wechselt automatisch zu Browser-STT

### LLM nicht erreichbar
- **Ursache**: Alte VM IP `192.168.56.1` statt `127.0.0.1`
- **Status**: ✅ GELÖST in:
  - `src/environments/environment.ts`
  - `backend/.env`
  - `backend/docker-compose.yml`

### Backend auf falscher Port (3002 statt 3001)
- **Status**: ✅ GELÖST in `backend/.env` (API_PORT=3001)

## URLs im Setup

| Service | URL | Docker | Local |
|---------|-----|--------|-------|
| Angular Dev | http://localhost:4301 | ✅ | ✅ |
| NestJS API | http://localhost:3001 | ✅ | ✅ |
| MongoDB | mongodb://rb_root:rb_secret@localhost:27018 | ✅ | ❌ |
| Vosk STT | ws://localhost:2700 | ✅ | ❌ |
| Whisper STT | http://localhost:9090 | ✅ | ❌ |
| LM Studio | http://127.0.0.1:1234 | (Host) | ✅ |

## Next Steps

1. Versuche das Docker Setup: `scripts/start-docker-complete.bat`
2. Wenn das nicht funktioniert: `scripts/start-stt-services.bat` + lokales Backend
3. Der User sollte jetzt sprechen können mit automatischem Fallback


