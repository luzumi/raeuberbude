# LLM Runtime Config - Implementierungs-Test

## Test 1: Backend Config API

### GET /api/llm-config
```powershell
curl http://localhost:3001/api/llm-config
```

**Erwartetes Ergebnis**: JSON mit allen Config-Feldern (url, model, temperature, etc.)

### POST /api/llm-config
```powershell
curl -X POST http://localhost:3001/api/llm-config `
  -H "Content-Type: application/json" `
  -d '{\"temperature\": 0.7, \"maxTokens\": 600}'
```

**Erwartetes Ergebnis**: 
```json
{
  "success": true,
  "config": { "temperature": 0.7, "maxTokens": 600, ... }
}
```

### Persistenz prüfen
```powershell
Get-Content C:\Users\corat\IdeaProjects\raueberbude\backend\nest-app\config\llm-config.json
```

**Erwartetes Ergebnis**: JSON-Datei mit gespeicherten Werten

## Test 2: LLM-Instanzen Scan

```powershell
curl -X POST http://localhost:3001/api/llm-instances/scan `
  -H "Content-Type: application/json" `
  -d '{}'
```

**Erwartetes Ergebnis**: Array mit allen verfügbaren Modellen als separate Instanzen

## Test 3: Frontend Settings Service

1. App im Browser öffnen: http://localhost:4200
2. Browser Console öffnen (F12)
3. Prüfe Console-Log: "LLM settings loaded"
4. Im Console: `window.ng.getComponent(document.querySelector('app-root'))`

## Test 4: Admin UI

1. Navigiere zu "Sprachassistent Admin"
2. Tab "Modelle & Env"
3. Prüfe, ob alle Felder korrekt gefüllt sind
4. Ändere Temperature auf 0.9
5. Klicke "Speichern"
6. Prüfe Snackbar: "Konfiguration gespeichert"
7. Reload Page (F5)
8. Prüfe, ob Temperature immer noch 0.9 ist

## Test 5: Model Scan & Display

1. In Admin UI: Klicke "LLM-Instanzen scannen"
2. Warte auf Abschluss
3. Prüfe "LLM-Instanzen" Sektion
4. **Erwartung**: Mehrere Cards, eine pro Modell
5. Jede Card sollte zeigen:
   - Model-ID (z.B. "qwen2.5-0.5b-instruct")
   - Health status ("healthy")
   - Test/Aktiv Buttons

## Test 6: URL-Normalisierung

### Test-Szenarien:
```powershell
# Test 1: Vollständige URL
curl -X POST http://localhost:3001/api/llm-config `
  -H "Content-Type: application/json" `
  -d '{\"url\": \"http://192.168.56.1:1234/v1/chat/completions\"}'

# Prüfe gespeicherte URL (sollte normalisiert sein)
curl http://localhost:3001/api/llm-config | ConvertFrom-Json | Select-Object -ExpandProperty url
```

**Erwartetes Ergebnis**: `http://192.168.56.1:1234` (ohne `/v1/chat/completions`)

## Test 7: Direct LLM Communication

```powershell
# Test mit aktuell konfiguriertem Modell
$config = curl http://localhost:3001/api/llm-config | ConvertFrom-Json
$model = $config.model
$url = "$($config.url)/v1/chat/completions"

curl -X POST $url `
  -H "Content-Type: application/json" `
  -d "{`\"model`\": `\"$model`\", `\"messages`\": [{`\"role`\": `\"user`\", `\"content`\": `\"Test`\"}], `\"max_tokens`\": 50, `\"temperature`\": $($config.temperature)}"
```

**Erwartetes Ergebnis**: Chat-Completion Response mit Antwort

## Test 8: Temperature Sync

1. In LM Studio: Prüfe aktuelle Temperature-Einstellung
2. In Admin UI: Setze Temperature auf anderen Wert (z.B. 0.5)
3. Speichere
4. Sende Chat-Request (Test 7)
5. Prüfe in Response, ob `"temperature": 0.5` verwendet wird

**Wichtig**: LM Studio UI-Temperature ist nur Default; API-Request überschreibt dies.

## Checkliste: Implementierung erfolgreich

- [ ] Backend startet ohne Fehler
- [ ] Config-Datei wird bei POST erstellt
- [ ] GET /api/llm-config liefert merged config
- [ ] Frontend lädt Settings beim Start
- [ ] Admin UI zeigt aktuelle Config
- [ ] Speichern persistiert Änderungen
- [ ] Nach Reload bleiben Änderungen erhalten
- [ ] Scan zeigt mehrere Modell-Instanzen
- [ ] URL-Normalisierung funktioniert
- [ ] Direct LLM-Request mit Config-Werten klappt

## Fehlersuche

### Problem: "Failed to load LLM config"
**Check**: 
- Backend läuft auf Port 3001?
- CORS-Einstellungen korrekt?
- Browser Network Tab: Request zu `/api/llm-config` sichtbar?

### Problem: Config wird nicht persistiert
**Check**:
- Verzeichnis `backend/nest-app/config/` existiert?
- Schreibrechte?
- Backend-Log zeigt "LLM config saved to file"?

### Problem: Nur ein Modell in Cards
**Check**:
- LM Studio läuft?
- `/v1/models` Endpoint erreichbar?
- Backend-Log: "Found N models: ..."
- Sind tatsächlich mehrere Modelle in LM Studio geladen?

### Problem: Temperature stimmt nicht
**Check**:
- Config-API: `curl http://localhost:3001/api/llm-config | ConvertFrom-Json | Select temperature`
- Admin UI zeigt gleichen Wert?
- Nach Änderung: Backend-Log "LLM config saved"?
- Config-Datei enthält neuen Wert?

## Performance-Check

```powershell
# Measure Config-Load Time
Measure-Command { curl http://localhost:3001/api/llm-config }
```

**Erwartung**: < 100ms

```powershell
# Measure Config-Save Time
Measure-Command { curl -X POST http://localhost:3001/api/llm-config -H "Content-Type: application/json" -d '{\"temperature\": 0.8}' }
```

**Erwartung**: < 200ms (inkl. File-Write)

