# Dual Speech-to-Text (STT) Integration

## Übersicht

Die Räuberbude-App unterstützt nun zwei STT-Provider für maximale Zuverlässigkeit:
- **Vosk** (Offline, Standard): Läuft lokal ohne Internet, deutsches Modell
- **Whisper** (High-Quality): OpenAI Whisper für höchste Transkriptionsqualität

## Features

### Backend
- **Dual-Provider-Architektur**: Automatisches Failover von Primary zu Secondary Provider
- **Audio-Konvertierung**: Automatische Umwandlung in optimale Formate (PCM für Vosk, WAV für Whisper)
- **RESTful API**: `POST /api/speech/transcribe` für Audio-Transkription
- **Konfigurierbar**: Alle Parameter über Environment-Variablen steuerbar

### Frontend
- **Drei Modi**: 
  - `auto`: Automatische Wahl zwischen Browser und Server STT
  - `browser`: Nur Browser Web Speech API
  - `server`: Nur Server-STT (Vosk/Whisper)
- **Automatischer Fallback**: Bei Browser-Netzwerkfehlern wechsel zu Server-STT
- **MediaRecorder**: Direkte Audioaufnahme für Server-Transkription

## Installation & Setup

### 1. Docker Services starten

```bash
cd backend
docker-compose up -d
```

Dies startet:
- MongoDB (Port 27018)
- Vosk Server (Port 2700) 
- Whisper Server (Port 9090)

### 2. Environment-Variablen

Kopiere `.env.example` zu `.env` und passe an:

```env
# STT Konfiguration
STT_ENABLED=true
STT_PRIMARY=vosk        # oder 'whisper'
STT_SECONDARY=whisper   # oder 'vosk' oder 'none'
STT_LANG=de-DE
STT_MAX_DURATION_MS=30000

# Vosk Server
VOSK_WS_URL=ws://localhost:2700
VOSK_PORT=2700

# Whisper Server  
WHISPER_URL=http://localhost:9090/transcribe
WHISPER_PORT=9090
WHISPER_MODEL=base      # base, small, medium, large
WHISPER_LANGUAGE=de

# Upload Limits
NEST_BODY_LIMIT_MB=25
```

### 3. Backend starten

```bash
cd backend/nest-app
npm install
npm run start:dev
```

### 4. Frontend starten

```bash
ng serve
```

## Verwendung

### Browser STT (Standard)
1. Klick auf Mikrofon-Button im Header
2. Browser fragt nach Mikrofon-Berechtigung
3. Sprechen → automatische Transkription
4. Bei Netzwerkfehler: Automatischer Wechsel zu Server-STT

### Server STT (Manuell aktivieren)
```javascript
// In Browser-Console:
const speechService = window.ng.getComponent(document.querySelector('app-root')).speechService;
speechService.setSTTMode('server');
```

### STT-Status prüfen
```bash
# Provider-Status
curl http://localhost:3001/api/speech/transcribe/status

# Response:
{
  "success": true,
  "data": {
    "providers": {
      "vosk": true,
      "whisper": true
    },
    "config": {
      "primary": "vosk",
      "secondary": "whisper",
      "language": "de-DE"
    }
  }
}
```

## API Endpoints

### POST /api/speech/transcribe

Transkribiert Audio zu Text.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Fields:
  - `audio`: Audio-Datei (webm, wav, mp3, ogg)
  - `language`: Sprache (optional, default: de-DE)
  - `maxDurationMs`: Max. Dauer in ms (optional, default: 30000)

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "vosk",
    "transcript": "Das ist ein Test",
    "confidence": 0.95,
    "durationMs": 1234,
    "language": "de-DE",
    "audioDurationMs": 3000
  }
}
```

**Beispiel mit curl:**
```bash
curl -X POST http://localhost:3001/api/speech/transcribe \
  -F "audio=@test.wav" \
  -F "language=de-DE"
```

## Troubleshooting

### Vosk startet nicht
```bash
# Logs prüfen
docker logs backend-vosk-1

# Modell manuell herunterladen
docker exec -it backend-vosk-1 bash
cd /opt
wget https://alphacephei.com/vosk/models/vosk-model-small-de-0.15.zip
unzip vosk-model-small-de-0.15.zip
mv vosk-model-small-de-0.15 vosk-model-de
```

### Whisper zu langsam
- Modellgröße reduzieren: `WHISPER_MODEL=tiny` oder `base`
- GPU aktivieren: Docker Image auf GPU-Version umstellen
- CPU-Limits erhöhen in docker-compose.yml

### Browser STT funktioniert nicht
- HTTPS erforderlich (außer localhost)
- Chrome/Edge empfohlen
- Internetverbindung prüfen (Web Speech API braucht Google Server)
- In Console: `speechService.setSTTMode('server')` für Server-STT

### "Network error" bei Browser STT
- Automatischer Fallback zu Server-STT in `auto` Modus
- Manuell umschalten: `speechService.setSTTMode('server')`

## Performance-Optimierung

### Vosk
- Kleineres Modell für schnellere Antwort: `vosk-model-small-de`
- WebSocket-Connection pooling bei vielen Anfragen

### Whisper
- VAD (Voice Activity Detection) aktiviert
- Modellgröße anpassen: 
  - `tiny`: ~1s für 10s Audio
  - `base`: ~2s für 10s Audio  
  - `small`: ~5s für 10s Audio

### Allgemein
- Audio-Kompression: opus codec in WebM
- Chunk-basiertes Streaming für lange Aufnahmen
- Redis-Cache für häufige Phrasen (optional)

## Entwicklung

### Neue Provider hinzufügen

1. Provider-Klasse erstellen:
```typescript
// backend/nest-app/src/modules/speech/stt/custom.provider.ts
@Injectable()
export class CustomProvider implements STTProvider {
  async transcribe(audio: Buffer, mimeType: string): Promise<TranscriptionResult> {
    // Implementation
  }
}
```

2. In Module registrieren:
```typescript
// speech.module.ts
providers: [..., CustomProvider]
```

3. In STTProviderService registrieren:
```typescript
this.providers.set('custom', this.customProvider);
```

## Testing

### Unit Tests
```bash
cd backend/nest-app
npm run test:watch speech
```

### E2E Test
```bash
# Terminal 1: Backend
cd backend/nest-app
npm run start:dev

# Terminal 2: Test
curl -X POST http://localhost:3001/api/speech/transcribe \
  -F "audio=@../../tests/fixtures/test-audio-de.wav"
```

### Browser Test
1. Öffne App: http://localhost:4200
2. Browser Console: `F12`
3. Test Server-STT:
```javascript
const service = window.ng.getComponent(document.querySelector('app-root')).speechService;
service.setSTTMode('server');
await service.startRecording();
// Sprechen...
await service.stopRecording();
```

## Sicherheit

- **File Upload Limits**: Max 25MB
- **Audio Duration Limits**: Max 30 Sekunden
- **MIME-Type Validation**: Nur Audio-Formate erlaubt
- **Rate Limiting**: Empfohlen für Production
- **CORS**: Konfiguriert für erlaubte Origins

## Monitoring

### Metriken
- Transkriptions-Dauer pro Provider
- Erfolgsrate Primary vs Secondary
- Audio-Größen und Formate
- Fehlerrate nach Typ

### Logging
```typescript
// Alle STT-Operationen werden geloggt
[2024-01-07 15:30:00] [STTProviderService] Transcription successful with vosk in 1234ms
[2024-01-07 15:30:05] [STTProviderService] Primary provider vosk failed: Connection timeout
[2024-01-07 15:30:06] [STTProviderService] Falling back to secondary provider: whisper
```

## Roadmap

- [ ] GPU-Support für Whisper
- [ ] Streaming-Transkription
- [ ] Speaker Diarization
- [ ] Multi-Language Support
- [ ] Cloud-Provider Integration (Azure, AWS)
- [ ] WebRTC für Echtzeit-Streaming
