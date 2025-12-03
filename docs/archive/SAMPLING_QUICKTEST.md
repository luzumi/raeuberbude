# Schnelltest: Sampling-Parameter in LM Studio

## Problem
Die Sampling-Einstellungen werden in der DB gespeichert, aber LM Studio verwendet sie nicht.

## Ursache
Die Parameter wurden nur gesendet, wenn sie in der Config explizit gesetzt waren (`!== undefined`).
Wenn die Felder `null` oder nicht vorhanden waren, wurden sie übersprungen.

## Fix
**Alle Sampling-Parameter werden jetzt IMMER gesendet** (mit Defaults wenn nicht gesetzt):
- `top_k` → Default: 40
- `top_p` → Default: 0.95  
- `repeat_penalty` → Default: 1.1
- `min_p` → Default: 0.05

## Test-Anleitung

### 1. Backend neu starten
```powershell
cd backend\nest-app
npm run build
# Backend-Prozess stoppen (Strg+C)
npm run start:dev
```

### 2. Test-Request senden
```powershell
# In PowerShell
$body = @{
    prompt = "Schalte das Licht im Wohnzimmer ein"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/llm-instances/test-request" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

### 3. Backend-Log prüfen
Im Backend-Terminal solltest du sehen:
```
[LlmClientService] Sending request to LM Studio with parameters: {
  model: 'mistral-7b-bnb-homeassistant',
  temperature: 0.3,
  max_tokens: 600,
  top_k: 40,              ← MUSS JETZT IMMER DA SEIN!
  top_p: 0.95,            ← MUSS JETZT IMMER DA SEIN!
  repeat_penalty: 1.1,    ← MUSS JETZT IMMER DA SEIN!
  min_p: 0.05,            ← MUSS JETZT IMMER DA SEIN!
  n_ctx: undefined,
  n_batch: undefined,
  n_threads: undefined
}
```

### 4. Deine Werte testen
1. Admin-UI öffnen: http://localhost:4200/admin/speech-assistant
2. Deine Instanz auswählen
3. Werte ändern:
   - Top-K: 50
   - Top-P: 0.92
   - Repeat Penalty: 1.5
4. "Konfiguration speichern" klicken
5. Test-Request erneut senden (siehe Schritt 2)
6. Backend-Log prüfen - sollte jetzt zeigen:
```
  top_k: 50,              ← DEIN WERT!
  top_p: 0.92,            ← DEIN WERT!
  repeat_penalty: 1.5,    ← DEIN WERT!
```

### 5. LM Studio prüfen
Öffne LM Studio und prüfe die Server-Logs.
Wenn die Parameter ankommen, solltest du Einträge wie diese sehen:
```
Received request with top_k=50, top_p=0.92
```

## Was ist anders jetzt?

### Vorher (FALSCH):
```typescript
// Nur senden wenn gesetzt
if (config.topK !== undefined) requestBody.top_k = config.topK;
```
→ **Problem:** Wenn `config.topK` `null` oder fehlt, wird nichts gesendet!

### Jetzt (RICHTIG):
```typescript
// IMMER senden mit Default
requestBody.top_k = config.topK ?? 40;
```
→ **Lösung:** Parameter wird immer gesendet, entweder mit deinem Wert oder Default!

## Wichtig!

### ✅ Automatisches Neu-Laden (NEU!)

**Das System lädt jetzt automatisch das Modell neu**, wenn du Sampling-Einstellungen änderst!

Beim Speichern der Konfiguration:
1. Config wird in DB gespeichert
2. Wenn die Instanz aktiv ist:
   - Modell wird aus LM Studio entladen (eject)
   - 1 Sekunde Pause
   - Modell wird mit neuen Parametern neu geladen
3. Du siehst die Meldung: "✅ Konfiguration gespeichert und Modell neu geladen!"

### Welche Parameter brauchen Reload?

**Benötigen Reload (beim Laden angewendet):**
- `n_ctx` (Context Length)
- `n_threads` (CPU Threads)  
- `n_batch` (Eval Batch Size)
- `n_gpu_layers` (GPU Offload)
- `flash_attn` (Flash Attention)
- `cache_prompt` (Keep in Memory)

**Funktionieren bei jedem Request (kein Reload nötig):**
- `temperature`
- `max_tokens`
- `top_k` ← Diese ändern sich sofort!
- `top_p` ← Diese ändern sich sofort!
- `repeat_penalty` ← Diese ändern sich sofort!
- `min_p` ← Diese ändern sich sofort!

## Wenn es immer noch nicht funktioniert

### Mögliche Ursachen:
1. **LM Studio ignoriert Parameter** - Manche Versionen unterstützen nicht alle Parameter
2. **Modell überschreibt Parameter** - Manche Modelle haben fest codierte Werte
3. **Cache** - LM Studio cached möglicherweise alte Requests

### Debug:
```powershell
# Prüfe, was in der DB steht
mongosh logging --eval "db.llminstances.findOne({isActive:true}).config"

# Sollte zeigen:
{
  temperature: 0.3,
  maxTokens: 600,
  topK: 50,        ← Deine Werte
  topP: 0.92,
  repeatPenalty: 1.5,
  minPSampling: 0.05,
  ...
}
```

### Noch ein Test:
Ändere die `temperature` auf einen extremen Wert (z.B. 2.0) und sende einen Request.
Wenn die Antwort kreativer/zufälliger wird, funktionieren die Parameter!

Wenn `temperature` funktioniert aber top_k/top_p nicht, liegt es an LM Studio selbst.

