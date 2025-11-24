# Fix: System-Prompt & Deaktivierungs-Feature

## Problem 1: System-Prompt wird überschrieben ❌
**Vorher**: Beim Scannen neuer LLM-Instanzen wurde `systemPrompt: ''` gesetzt
**Nachteil**: Bestehende Default-Prompts gingen verloren

### Lösung ✅
1. **Default-Prompt im Backend** (`LoggingService`)
   - Konstante `DEFAULT_SYSTEM_PROMPT` hinzugefügt
   - Enthält vollständigen Smart-Home-Assistent-Prompt mit JSON-Schema
   - Wird bei neuen Instanzen automatisch gesetzt

2. **Änderungen**:
   ```typescript
   // backend/nest-app/src/modules/logging/logging.service.ts
   private readonly DEFAULT_SYSTEM_PROMPT = `Du bist ein intelligenter deutschsprachiger Smart-Home-Assistent...`;
   
   // Bei Erstellung neuer Instanz:
   systemPrompt: this.DEFAULT_SYSTEM_PROMPT  // statt ''
   ```

## Problem 2: Modelle können nicht deaktiviert werden ❌
**Vorher**: Nur "Aktivieren"-Button, kein "Deaktivieren"
**Nachteil**: Aktive Modelle konnten nicht manuell deaktiviert werden

### Lösung ✅

#### Backend
1. **Controller** (`logging.controller.ts`)
   ```typescript
   @Post('/llm-instances/:id/deactivate')
   deactivate(@Param('id') id: string) {
     return this.svc.deactivateLlmInstance(id);
   }
   ```

2. **Service** (`logging.service.ts`)
   ```typescript
   async deactivateLlmInstance(id: string) {
     const instance = await this.llmInstanceModel.findById(id);
     if (!instance) throw new Error('LLM instance not found');
     
     instance.isActive = false;
     await instance.save();
     this.logger.log(`Deactivated instance: ${instance.model}`);
     return instance;
   }
   ```

#### Frontend
1. **LlmService** (`llm.service.ts`)
   ```typescript
   deactivate(id: string): Observable<LlmInstance> {
     return this.http.post<LlmInstance>(`${this.apiUrl}/${id}/deactivate`, {});
   }
   ```

2. **Admin-Komponente** (`admin-speech-assistant.component.ts`)
   ```typescript
   async deactivateLlmInstance(instance: LlmInstance): Promise<void> {
     if (!instance._id) return;
     
     try {
       await lastValueFrom(this.llmService.deactivate(instance._id));
       this.snackBar.open('LLM-Instanz deaktiviert', 'OK', { duration: 3000 });
       await this.loadLlmInstances();
     } catch (error) {
       console.error('Failed to deactivate LLM instance:', error);
       this.snackBar.open('Deaktivierung fehlgeschlagen', 'OK', { duration: 3000 });
     }
   }
   ```

3. **HTML-Template** (`admin-speech-assistant.component.html`)
   ```html
   <!-- Aktivieren-Button (nur wenn nicht aktiv) -->
   <button mat-raised-button color="primary"
           *ngIf="!instance.isActive"
           (click)="activateLlmInstance(instance)"
           [disabled]="!instance.enabled">
     <mat-icon>check_circle</mat-icon>
     Aktivieren
   </button>
   
   <!-- Deaktivieren-Button (nur wenn aktiv) -->
   <button mat-raised-button color="warn"
           *ngIf="instance.isActive"
           (click)="deactivateLlmInstance(instance)">
     <mat-icon>cancel</mat-icon>
     Deaktivieren
   </button>
   ```

## Verwendung

### System-Prompt prüfen
1. Backend starten
2. Scan durchführen: `POST /api/llm-instances/scan`
3. Neue Instanzen erhalten automatisch Default-Prompt
4. Bestehende Instanzen behalten ihren Prompt

### Modell deaktivieren
1. In Admin-UI zu "Sprachassistent Admin"
2. Tab "Modelle & Env"
3. Bei aktiver Instanz: **roter "Deaktivieren"-Button**
4. Klicken → Snackbar: "LLM-Instanz deaktiviert"
5. Button wechselt zu grünem "Aktivieren"

### Modell aktivieren
1. Bei inaktiver Instanz: **grüner "Aktivieren"-Button**
2. Klicken → Snackbar: "LLM-Instanz aktiviert"
3. Andere aktive Instanzen werden automatisch deaktiviert
4. Button wechselt zu rotem "Deaktivieren"

## API-Referenz

### POST /api/llm-instances/:id/deactivate
Deaktiviert eine LLM-Instanz

**Request**:
```bash
curl -X POST http://localhost:3001/api/llm-instances/<ID>/deactivate \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response**:
```json
{
  "_id": "...",
  "name": "LM Studio @ 192.168.56.1",
  "url": "http://192.168.56.1:1234/v1/chat/completions",
  "model": "qwen2.5-0.5b-instruct",
  "isActive": false,
  "health": "healthy",
  ...
}
```

### POST /api/llm-instances/:id/activate
Aktiviert eine LLM-Instanz (bestehendes Feature)

**Verhalten**:
- Setzt alle anderen Instanzen auf `isActive: false`
- Aktiviert die angegebene Instanz
- Prüft Health-Status vorher

## Default System-Prompt

Der neue Default-Prompt enthält:
- ✅ Rollendeklaration (Smart-Home-Assistent)
- ✅ Sprachhinweis (Deutsch)
- ✅ JSON-Schema für strukturierte Antworten
- ✅ Intent-Typen (home_assistant_command, query, automation, web_search, etc.)
- ✅ Beispiele für korrekte Antworten
- ✅ Sicherheitsregeln

**Vollständiger Prompt**: siehe `backend/nest-app/src/modules/logging/logging.service.ts::DEFAULT_SYSTEM_PROMPT`

## Testing

### Test 1: System-Prompt bei neuen Instanzen
```powershell
# Scan durchführen
curl -Method POST "http://localhost:3001/api/llm-instances/scan" -ContentType "application/json" -Body '{}'

# Instanzen abrufen und System-Prompt prüfen
$instances = curl http://localhost:3001/api/llm-instances | ConvertFrom-Json
$instances | ForEach-Object { 
  Write-Host "Model: $($_.model)"
  Write-Host "System-Prompt Länge: $($_.systemPrompt.Length) Zeichen"
  Write-Host "---"
}
```

**Erwartung**: Neue Instanzen haben `systemPrompt.Length > 1500` (voller Default-Prompt)

### Test 2: Deaktivierung
```powershell
# Aktive Instanz finden
$instances = curl http://localhost:3001/api/llm-instances | ConvertFrom-Json
$activeId = ($instances | Where-Object { $_.isActive -eq $true } | Select-Object -First 1)._id

# Deaktivieren
curl -Method POST "http://localhost:3001/api/llm-instances/$activeId/deactivate" -ContentType "application/json" -Body '{}'

# Prüfen
$updated = curl "http://localhost:3001/api/llm-instances" | ConvertFrom-Json
$updated | Where-Object { $_._id -eq $activeId } | Select-Object model, isActive
```

**Erwartung**: `isActive: false`

### Test 3: UI-Buttons
1. Frontend starten: `npm start`
2. Navigiere zu Admin-UI
3. **Bei aktiver Instanz**: Roter "Deaktivieren"-Button sichtbar
4. Klicken → Button wechselt zu grünem "Aktivieren"
5. **Bei inaktiver Instanz**: Grüner "Aktivieren"-Button sichtbar
6. Klicken → Button wechselt zu rotem "Deaktivieren"

## Checkliste

- [x] Default-System-Prompt in Backend definiert
- [x] Neue Instanzen erhalten Default-Prompt
- [x] Bestehende Prompts bleiben erhalten
- [x] `POST /api/llm-instances/:id/deactivate` Endpoint
- [x] `deactivateLlmInstance` Service-Methode
- [x] Frontend `deactivate()` in LlmService
- [x] Admin-Komponente `deactivateLlmInstance()` Methode
- [x] HTML: Conditional Buttons (`*ngIf="instance.isActive"`)
- [x] Snackbar-Feedback beim Deaktivieren
- [x] Instance-Liste wird nach Aktion neu geladen

## Bekannte Einschränkungen

1. **Mehrere aktive Instanzen**: Aktuell kann nur eine Instanz aktiv sein
   - Beim Aktivieren werden alle anderen deaktiviert
   - Beim Deaktivieren wird keine andere automatisch aktiviert

2. **System-Prompt Migration**: Bestehende Instanzen mit leerem Prompt werden nicht automatisch aktualisiert
   - Workaround: Manuell über UI editieren oder Instanz löschen und neu scannen

## Verbesserungsvorschläge

1. **Multi-Active Support**: Mehrere Modelle parallel aktiv (Load-Balancing)
2. **Prompt-Templates**: Verschiedene vordefinierte Prompts zur Auswahl
3. **Prompt-Versionierung**: Historie von Prompt-Änderungen
4. **Auto-Activate**: Option "Automatisch aktivieren wenn kein anderes Modell aktiv ist"
5. **Batch-Operations**: Mehrere Instanzen gleichzeitig aktivieren/deaktivieren

## Zusammenfassung

✅ **Problem 1 gelöst**: Neue Instanzen erhalten vollständigen Default-System-Prompt
✅ **Problem 2 gelöst**: Aktive Modelle können über UI und API deaktiviert werden

Beide Features sind vollständig implementiert und einsatzbereit!

