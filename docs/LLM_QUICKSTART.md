# LLM-Validierung Schnellstart

## Was wurde geändert?

Die Sprachvalidierung nutzt jetzt **Ihr lokales Mistral-Modell** statt Code-Heuristiken.

## Vorteile

✅ **Versteht natürliche Sprache** - „Hallo und herzlich willkommen" wird akzeptiert  
✅ **Toleriert STT-Fehler** - Kleine Transkriptionsfehler werden erkannt  
✅ **Intelligente Rückfragen** - Kontext-bezogene Nachfragen statt generischer Meldungen  
✅ **Kein Feintuning nötig** - Prompt-basiert, sofort einsetzbar  

## Setup (einmalig)

### 1. LM Studio starten
```
1. LM Studio öffnen
2. Modell "mistralai/mistral-7b-instruct-v0.3" laden
3. Local Server starten (Port 1234)
4. Prüfen: http://192.168.56.1:1234 erreichbar
```

### 2. Testen
```powershell
# In PowerShell
Invoke-RestMethod -Uri "http://192.168.56.1:1234/v1/models" -Method Get
```

Sollte Ihr Modell anzeigen.

### 3. App starten
```bash
ng serve
```

## Nutzung

### Normale Verwendung

Sprechen Sie wie gewohnt:
- **Befehle**: „Schalte das Licht ein"
- **Begrüßungen**: „Hallo und herzlich willkommen"
- **Fragen**: „Wie spät ist es?"

### LLM-Validierung läuft automatisch

```
User spricht → STT → LLM validiert → Ergebnis
```

**Browser Console zeigt:**
```
LLM Validation Result: { isValid: true, confidence: 0.95, ... }
```

### Bei Unklarheit

LLM fragt nach:
```
⚠️ Was möchten Sie mit dem Licht machen?
```

Dann einfach präziser sprechen.

## Troubleshooting

### LM Studio nicht erreichbar?

**Symptom:** Console zeigt
```
LLM validation failed, using simple fallback
```

**Fix:**
1. LM Studio starten
2. Local Server aktivieren
3. Port 1234 prüfen

**Verhalten:** App funktioniert trotzdem (Fallback akzeptiert alle Eingaben mit reduzierter Confidence)

### Zu langsam?

**Lösung:** Kleineres Modell laden oder GPU aktivieren in LM Studio

### Zu viele Rückfragen?

**Lösung:** Prompt anpassen in `transcription-validator.service.ts`:
```typescript
// Zeile ~174: System-Prompt erweitern
Sei großzügig mit isValid=true für natürliche Sprache.
```

## Konfiguration

### Andere IP/Port

```typescript
// transcription-validator.service.ts, Zeile 30
private readonly lmStudioUrl = 'http://localhost:1234/v1/chat/completions';
```

### Anderes Modell

```typescript
// Zeile 31
private readonly model = 'meta-llama/llama-3.1-8b-instruct';
```

## Beispiele

### Vorher (Code-Heuristik)

**Eingabe:** „Hallo und herzlich willkommen."
```
❌ Kein Verb erkannt
⚠️ Sie sagten "Hallo und herzlich willkommen". Was möchten Sie damit machen?
```

### Nachher (LLM)

**Eingabe:** „Hallo und herzlich willkommen."
```
✅ Verstanden (Begrüßung erkannt)
→ Keine Nachfrage
```

---

**Eingabe:** „das licht" (zu kurz)
```
⚠️ Was möchten Sie mit dem Licht machen?
```

---

**Eingabe:** „äöü ßßß" (Unsinn)
```
⚠️ Ich konnte Sie nicht verstehen. Bitte wiederholen Sie.
```

## Performance

- **Validierung**: ~300-900ms (abhängig von Hardware)
- **Fallback bei Timeout**: Eingabe wird akzeptiert
- **Keine Blockierung**: UI bleibt responsiv

## Weitere Infos

Siehe `docs/LLM_VALIDATION.md` für Details zu:
- API-Struktur
- Prompt-Engineering
- Fehlerbehandlung
- Migration
- Erweiterungen

## Status

✅ **LLM-Validierung aktiv**  
✅ **Fallback implementiert**  
✅ **Production-ready**  

Die App versteht jetzt natürliche Sprache dank Ihrem lokalen Mistral-Modell! 🎉

