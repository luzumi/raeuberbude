# Auto-Reload Feature für Sampling-Einstellungen

## Was wurde implementiert?

Beim Speichern von Sampling-Einstellungen wird das LLM-Modell automatisch neu geladen, damit die Änderungen sofort wirken.

## Warum ist das wichtig?

Manche Parameter (z.B. Context Length, CPU Threads, GPU Layers) werden nur **beim Laden des Modells** angewendet, nicht bei jedem Request. Ohne Reload würden diese Änderungen erst beim nächsten manuellen Laden wirken.

## Wie funktioniert es?

### 1. User-Perspektive

1. Öffne Admin → Speech Assistant
2. Wähle eine LLM-Instanz aus
3. Ändere Sampling-Einstellungen (z.B. Top-K von 40 auf 50)
4. Klicke "Konfiguration speichern"
5. **NEU:** Siehst du die Meldung:
   - "💾 Speichere Konfiguration... Modell wird neu geladen..." (während des Vorgangs)
   - "✅ Konfiguration gespeichert und Modell neu geladen!" (nach Erfolg)

### 2. Backend-Ablauf

```typescript
// LoggingService.updateInstanceConfig()

1. Config in DB speichern
2. Prüfen: Ist Instanz aktiv?
   JA → Auto-Reload durchführen:
      a) Modell via MCP ejecten
      b) 1 Sekunde warten
      c) Modell via MCP neu laden (mit neuen Parametern)
      d) Health-Status aktualisieren
   NEIN → Fertig
3. Instanz zurückgeben
```

### 3. Technische Details

**Backend:**
```typescript
// logging.service.ts
async updateInstanceConfig(id: string, config: any, autoReload = true) {
  // Config speichern
  const instance = await this.llmInstanceModel.findByIdAndUpdate(id, { config }, { new: true });
  
  // Auto-Reload wenn aktiv
  if (instance.isActive && autoReload) {
    await this.mcpService.unloadModel(instance.model);  // Eject
    await new Promise(r => setTimeout(r, 1000));        // Wait
    await this.mcpService.loadModel(instance.model);     // Load
  }
  
  return instance;
}
```

**Frontend:**
```typescript
// admin-speech-assistant.component.ts
async saveInstanceConfig() {
  const config = {
    ...allParameters,
    autoReload: true  // ← NEU: Triggert Auto-Reload
  };
  
  // Zeige Loading-Message
  const snackBar = this.snackBar.open(
    '💾 Speichere Konfiguration... Modell wird neu geladen...',
    '', 
    { duration: 0 }
  );
  
  await this.http.put(`/api/llm-instances/${id}/config`, config);
  
  // Erfolgs-Message
  this.snackBar.open(
    '✅ Konfiguration gespeichert und Modell neu geladen!',
    'OK',
    { duration: 5000 }
  );
}
```

## Welche Parameter profitieren davon?

### Benötigen Reload (beim Laden angewendet):
- ✅ `n_ctx` (Context Length) - Buffer-Größe
- ✅ `n_threads` (CPU Threads) - CPU-Parallelität
- ✅ `n_batch` (Eval Batch Size) - Verarbeitungs-Batch-Größe
- ✅ `n_gpu_layers` (GPU Offload) - Welche Layer auf GPU
- ✅ `flash_attn` (Flash Attention) - Optimierungs-Algorithmus
- ✅ `cache_prompt` (Keep in Memory) - Caching-Strategie

### Funktionieren ohne Reload (bei jedem Request):
- `temperature` - Kreativität
- `max_tokens` - Maximale Antwortlänge
- `top_k` - Token-Auswahl
- `top_p` - Nucleus Sampling
- `repeat_penalty` - Wiederholungsvermeidung
- `min_p` - Minimum-Wahrscheinlichkeit

## Optional: Auto-Reload deaktivieren

Falls du das Modell manuell verwalten möchtest:

```typescript
// Im Frontend
const config = {
  ...allParameters,
  autoReload: false  // ← Deaktiviert Auto-Reload
};
```

## Fehlerbehandlung

### Was passiert wenn MCP fehlschlägt?

1. **Eject schlägt fehl:**
   - Wird geloggt als Warning
   - Load wird trotzdem versucht
   - Modell könnte bereits entladen sein

2. **Load schlägt fehl:**
   - Config ist trotzdem gespeichert
   - Health-Status bleibt 'unhealthy'
   - User sieht Warning im Snackbar

3. **MCP nicht verfügbar:**
   - Config ist trotzdem gespeichert
   - User muss Modell manuell in LM Studio laden
   - Beim nächsten Load via UI werden neue Parameter verwendet

## Backend-Logs

Erfolgreicher Reload:
```
[LoggingService] Updated config for instance mistral-7b-bnb-homeassistant: {...}
[LoggingService] Instance mistral-7b-bnb-homeassistant is active, triggering reload...
[LoggingService] Ejected mistral-7b-bnb-homeassistant before reload
[LoggingService] ✅ Successfully reloaded mistral-7b-bnb-homeassistant with new config
```

Fehler beim Reload:
```
[LoggingService] Updated config for instance mistral-7b-bnb-homeassistant: {...}
[LoggingService] Instance mistral-7b-bnb-homeassistant is active, triggering reload...
[LoggingService] ⚠️ Reload failed: MCP error - Config saved but model may need manual reload
```

## Testing

### 1. Test mit Parameter der Reload braucht
```
1. Ändere Context Length von 4096 auf 8192
2. Speichere Config
3. Prüfe Backend-Log: "Successfully reloaded"
4. Sende Test-Request
5. Prüfe LM Studio: Context sollte 8192 sein
```

### 2. Test mit Parameter der keinen Reload braucht
```
1. Ändere Top-K von 40 auf 50
2. Speichere Config (Reload passiert trotzdem)
3. Sende Test-Request
4. Prüfe Backend-Log: top_k sollte 50 sein
```

## Vorteile

✅ **Sofortige Wirkung** - Keine manuellen Schritte nötig  
✅ **Transparenz** - User sieht, dass Reload passiert  
✅ **Robustheit** - Fehler beim Reload = Config trotzdem gespeichert  
✅ **Optional** - Kann deaktiviert werden für Experten

## Betroffene Dateien

**Backend:**
- `backend/nest-app/src/modules/logging/logging.service.ts` - Auto-Reload Logik
- `backend/nest-app/src/modules/logging/logging.controller.ts` - autoReload Parameter

**Frontend:**
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.ts` - UI Feedback

**Dokumentation:**
- `docs/SAMPLING_QUICKTEST.md` - Test-Anleitung aktualisiert
- `docs/LLM_SAMPLING_CONFIG_FIX.md` - Feature dokumentiert
- `docs/AUTO_RELOAD_FEATURE.md` - Diese Datei

