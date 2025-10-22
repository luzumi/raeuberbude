---
description: Nimmt ein YouTrack-Issue, implementiert die Lösung, erstellt einen Pull Request und fragt bei Problemen nach
---

## Rolle: Issue Worker / Coding Agent

**Wichtig**: Als Coding Agent **darfst du Code schreiben und ändern**. Deine Aufgabe ist die vollständige Implementierung von Issues.

## User Input

```text
$ARGUMENTS
```

Du **MUSST** die Issue-ID und zusätzliche Anweisungen berücksichtigen.

## Ziel

Nimm ein YouTrack-Issue, implementiere die Lösung vollständig, teste sie und erstelle einen Pull Request zur Review.

## Ausführungsschritte

### 1. Issue aus YouTrack laden

Lade das Issue mit allen Details:

```powershell
$issueId = "LUD28-35"  # Aus User Input
$headers = @{ 
  'Authorization' = 'Bearer perm:YWRtaW4=.NDUtMA==.VqVCNbrN5JRc1nEJiCuGSHOmqZa1HY'
  'Accept' = 'application/json'
}
$issue = Invoke-RestMethod -Uri "https://luzumi.youtrack.cloud/api/issues/$issueId?fields=id,idReadable,summary,description,customFields(name,value(name))" -Headers $headers
$issue | Format-List
```

Extrahiere:
- **Summary**: Zusammenfassung des Issues
- **Description**: Detaillierte Beschreibung
- **Type**: Bug/Feature/Task/Improvement
- **Priority**: Low/Normal/High/Critical

### 2. Issue-Status aktualisieren auf "In Progress"

**KRITISCH:** Status MUSS gesetzt werden, sobald Arbeit beginnt!

```powershell
Write-Output "📝 Setze Issue-Status auf 'In Progress'..."

$body = @{
  customFields = @(
    @{
      name = 'State'
      '$type' = 'StateIssueCustomField'
      value = @{ name = 'In Progress' }
    }
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://luzumi.youtrack.cloud/api/issues/$issueId" -Method POST -Headers $headers -Body $body -ContentType "application/json"

Write-Output "✅ Issue-Status: In Progress"
```

### 3. Branch erstellen

// turbo
Erstelle einen Feature-Branch:

```powershell
$branchName = "feature/$issueId-$(($issue.summary -replace '[^a-zA-Z0-9]', '-').ToLower())"
git checkout -b $branchName
```

Beispiel: `feature/LUD28-35-transparentes-lampenbild`

### 4. Codebase analysieren

Analysiere die betroffenen Dateien aus der Issue-Beschreibung:

- Lies die vorhandenen Dateien
- Verstehe die Architektur
- Identifiziere Abhängigkeiten
- Prüfe existierenden Code-Stil

**Wichtige Verzeichnisse:**
- `src/app/` - Angular Frontend
- `backend/` - Node.js Backend
- `public/assets/` - Statische Assets
- `src/app/services/` - Services
- `src/app/components/` - Wiederverwendbare Komponenten

### 5. Implementierung durchführen

Implementiere die Lösung Schritt für Schritt:

**A. Frontend-Änderungen (Angular)**
- HTML-Templates anpassen
- TypeScript-Komponenten erweitern
- SCSS-Styling hinzufügen
- Services nutzen (z.B. HomeAssistantService)

**B. Backend-Änderungen (Node.js)**
- Express-Routen hinzufügen
- MongoDB-Modelle erstellen/anpassen
- API-Endpunkte implementieren

**C. Assets hinzufügen**
- Bilder, Icons, SVGs in `public/assets/` ablegen
- Optimierung (Kompression, SVG-Cleanup)

**Verfügbare Tools:**
- **Angular CLI**: `ng generate component/service/module`
- **TypeScript Compiler**: Automatische Typchecks
- **SCSS**: Styling mit Variablen und Mixins
- **Material Design**: `@angular/material` Komponenten
- **RxJS**: Reactive Programming
- **Mongoose**: MongoDB ODM (Backend)
- **Express**: REST-API (Backend)

### 6. Code-Qualität sicherstellen

Stelle sicher, dass der Code die Projekt-Standards erfüllt:

✅ **Code-Style:**
- Angular Best Practices
- TypeScript Strict Mode
- ESLint/TSLint Regeln befolgen
- Komponenten modular und wiederverwendbar

✅ **Kommentare:**
- JSDoc für Funktionen/Klassen
- Inline-Kommentare für komplexe Logik
- README aktualisieren falls nötig

✅ **Performance:**
- Change Detection optimieren (OnPush)
- Lazy Loading wo sinnvoll
- Assets optimieren (Bilder komprimieren)

### 7. Testen (ENHANCED)

**WICHTIG:** Teste GRÜNDLICH vor dem Commit!

**A. Unit Tests (falls vorhanden)**
```powershell
npm test

# Falls Tests fehlen: Erstelle mindestens einen Basis-Test
# Beispiel: orange-light.spec.ts
```

**B. Manuelle Tests**
- Starte die Anwendung: `npm start`
- Öffne `http://localhost:4200`
- Teste alle Szenarien:
  - Happy Path (normaler Ablauf)
  - Edge Cases (Grenzfälle)
  - Error Cases (Fehlerfälle)

**C. Browser-Tests mit Screenshots**

```powershell
# App starten
Start-Process -NoNewWindow npm "start"
Start-Sleep -Seconds 10

# Erstelle Test-Screenshots Verzeichnis
New-Item -ItemType Directory -Force -Path "test-screenshots"

# Öffne die implementierte Funktion
Start-Process "http://localhost:4200/bude"

# Screenshots machen:
# 1. Before-State (Initial)
# 2. After-State (Nach Interaktion)
# 3. Loading-State (falls relevant)
# 4. Error-State (falls vorhanden)

# Chrome DevTools prüfen
# - Console auf Fehler
# - Network-Tab (API-Calls)
# - Performance
# - Responsive Design
```

**Screenshots speichern in:** `test-screenshots/`
- `before.png` - Ausgangszustand
- `after.png` - Nach Implementierung
- `loading.png` - Loading-State
- `error.png` - Error-Handling (falls getestet)

**D. Manuelle Test-Checkliste (KRITISCH!)**

Teste ALLE folgenden Szenarien:

```markdown
### Test-Checkliste für manuelle Verifikation

#### Basis-Funktionalität
- [ ] Feature funktioniert wie erwartet (Happy Path)
- [ ] Keine Console-Errors
- [ ] Keine visuellen Bugs

#### Interaktionen
- [ ] Einfacher Klick funktioniert
- [ ] Doppelklick wird korrekt behandelt
- [ ] Halten (Long-Press) funktioniert (falls relevant)
- [ ] Hover-State wird angezeigt
- [ ] Focus-State funktioniert (Tastatur)

#### Zustände
- [ ] On/Off-Zustand wechselt korrekt
- [ ] Loading-State wird angezeigt
- [ ] Disabled-State funktioniert
- [ ] Error-State wird angezeigt (bei Fehler)

#### Toggle-Spezifisch (falls Toggle verwendet)
- [ ] Toggle lässt sich EINschalten ✅
- [ ] Toggle lässt sich AUSschalten ✅ (KRITISCH!)
- [ ] Toggle bleibt im richtigen Zustand
- [ ] State wird korrekt persistiert

#### Edge Cases
- [ ] Schnelle mehrfache Klicks (Race Conditions)
- [ ] Während Loading-State klicken
- [ ] Netzwerk-Fehler (Home Assistant offline)
- [ ] Browser-Refresh (State bleibt erhalten?)

#### Performance
- [ ] Keine Memory Leaks (DevTools Memory Profiler)
- [ ] Animationen laufen smooth (60fps)
- [ ] Keine verzögerten Reaktionen
```

**Falls IRGENDEIN Test fehlschlägt: NICHT committen!** Erst fixen, dann nochmal testen.

### 8. Problem-Handling

Falls Probleme auftreten:

**A. Analysiere das Problem**
- Was ist die Fehlermeldung?
- Wo tritt der Fehler auf?
- Ist es ein einfaches Problem oder komplex?

**B. Lösungsstrategie**

**Einfaches Problem** (< 30 Min Fix):
- ✅ Selbst lösen
- Commit mit Beschreibung
- Weiter mit nächstem Schritt

**Komplexes Problem** (> 30 Min):
- ⚠️ Nutzer fragen:
  ```
  ⚠️ Problem erkannt: [Beschreibung]
  
  Mögliche Lösungen:
  1. [Lösungsansatz 1] - Aufwand: ca. X Stunden
  2. [Lösungsansatz 2] - Aufwand: ca. Y Stunden
  
  Soll ich:
  A) Selbst lösen (kann länger dauern)
  B) Neuen Issue erstellen und später bearbeiten
  C) Abbruch und Review des bisherigen Codes
  
  Was möchtest du?
  ```

**Blockendes Problem** (nicht lösbar):
- ❌ Issue zurück auf "Open" setzen
- Kommentar in YouTrack hinzufügen
- Nutzer informieren

### 9. Commits erstellen

Erstelle aussagekräftige Commits:

```powershell
git add .
git commit -m "feat(orange-light): Add transparent lamp image with on/off state

- Add transparent SVG lamp image to assets
- Update lamp-toggle component with visual representation
- Add CSS styling for on/off states with glow effect
- Optimize existing light.svg for transparency

Resolves LUD28-35"
```

**Commit-Message Format:**
```
<type>(<scope>): <subject>

<body>

Resolves <issue-id>
```

**Types:**
- `feat`: Neues Feature
- `fix`: Bugfix
- `refactor`: Code-Umstrukturierung
- `style`: Styling-Änderungen
- `docs`: Dokumentation
- `test`: Tests

### 10. Branch pushen

```powershell
git push -u origin $branchName
```

### 11. Pull Request erstellen

**KRITISCH:** PR MUSS im YouTrack-Ticket verlinkt werden!

**Option A: Via GitHub CLI** (falls installiert)
```powershell
Write-Output "📝 Erstelle Pull Request..."

$prOutput = gh pr create --title "[$issueId] $($issue.summary)" --body "## 🎯 Beschreibung
Implementierung von $issueId: $($issue.summary)

## ✅ Änderungen
- [Liste der wichtigsten Änderungen]

## 🧪 Tests
- [x] Komponententests geschrieben
- [x] Manuell getestet
- [x] Edge Cases geprüft

## 📸 Screenshots
Siehe Anhänge im YouTrack-Issue

## 📋 Checklist
- [x] Code implementiert und getestet
- [x] Code-Style befolgt
- [x] Kommentare hinzugefügt
- [x] Issue aktualisiert

## 🔗 YouTrack
https://luzumi.youtrack.cloud/issue/$issueId

Closes #$issueId" --base main

# PR-URL extrahieren
$prUrl = ($prOutput | Select-String -Pattern "https://github.com/.*/pull/\d+").Matches.Value
Write-Output "✅ PR erstellt: $prUrl"
```

**Option B: Manuell via Browser**
```powershell
$prUrl = "https://github.com/luzumi/raeuberbude/compare/main...$branchName"
Write-Output "📝 Öffne GitHub für manuelle PR-Erstellung..."
Start-Process $prUrl

# Warte auf User-Input für PR-URL
Write-Output ""
Write-Output "Bitte erstelle den PR manuell und kopiere die URL hier:"
$prUrl = Read-Host "PR-URL"
```

### 12. YouTrack-Issue aktualisieren mit PR-Link

**KRITISCH:** Dies ist der wichtigste Schritt für die Nachverfolgbarkeit!

```powershell
Write-Output "📝 Aktualisiere YouTrack-Issue mit PR-Link..."

$headers = @{
  'Authorization' = 'Bearer perm:YWRtaW4=.NDUtMA==.VqVCNbrN5JRc1nEJiCuGSHOmqZa1HY'
  'Content-Type' = 'application/json'
}

# 1. Test-Screenshots hochladen
Write-Output "📸 Lade Test-Screenshots hoch..."
if (Test-Path "test-screenshots/*.png") {
    Get-ChildItem "test-screenshots/*.png" | ForEach-Object {
        $file = [System.IO.File]::ReadAllBytes($_.FullName)
        $fileName = $_.Name
        
        $uri = "https://luzumi.youtrack.cloud/api/issues/$issueId/attachments?fields=id,name"
        Invoke-RestMethod -Uri $uri -Method POST -Headers @{
            'Authorization' = $headers.Authorization
            'Content-Type' = 'image/png'
            'Content-Disposition' = "attachment; filename=`"$fileName`""
        } -Body $file
    }
}

# 2. PR-Link im Issue verlinken (als Custom Field oder Kommentar)
Write-Output "🔗 Verlinke Pull Request im Issue..."

$prComment = @{
  text = "🔄 **Pull Request erstellt**

**PR-URL:** $prUrl

✅ **Implementierung abgeschlossen:**
- Code implementiert und getestet
- $(if (Test-Path 'test-screenshots/*.png') {(Get-ChildItem 'test-screenshots/*.png').Count} else {0}) Test-Screenshots hochgeladen
- Bereit für Code Review

**Nächste Schritte:**
1. Code Review durchführen
2. Bei Freigabe: PR mergen
3. Issue automatisch schließen"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://luzumi.youtrack.cloud/api/issues/$issueId/comments" -Method POST -Headers $headers -Body $prComment -ContentType "application/json"

# 3. Status auf "In Review" oder "To Verify" setzen
Write-Output "📝 Setze Issue-Status auf 'To Verify'..."

$statusBody = @{
  customFields = @(
    @{
      name = 'State'
      '$type' = 'StateIssueCustomField'
      value = @{ name = 'To verify' }  # Standard YouTrack Status
    }
  )
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "https://luzumi.youtrack.cloud/api/issues/$issueId" -Method POST -Headers $headers -Body $statusBody
    Write-Output "✅ Status: To verify"
} catch {
    # Fallback: Setze auf "Open" wenn "To verify" nicht existiert
    $statusBody = @{
      customFields = @(
        @{
          name = 'State'
          '$type' = 'StateIssueCustomField'
          value = @{ name = 'Open' }
        }
      )
    } | ConvertTo-Json -Depth 10
    
    Invoke-RestMethod -Uri "https://luzumi.youtrack.cloud/api/issues/$issueId" -Method POST -Headers $headers -Body $statusBody
    Write-Output "✅ Status: Open (To verify nicht verfügbar)"
}

# 4. Arbeitszeit erfassen
Write-Output "⏱️ Erfasse Arbeitszeit..."
$workMinutes = 90  # Anpassen basierend auf tatsächlichem Aufwand

$workItem = @{
  text = "Feature implementiert, getestet und dokumentiert"
  date = (Get-Date).ToString("yyyy-MM-dd")
  duration = @{
    minutes = $workMinutes
  }
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "https://luzumi.youtrack.cloud/api/issues/$issueId/timeTracking/workItems" -Method POST -Headers $headers -Body $workItem -ContentType "application/json"
    Write-Output "✅ Arbeitszeit erfasst: $workMinutes Min"
} catch {
    Write-Output "⚠️ Arbeitszeit konnte nicht erfasst werden (kein Problem)"
}

Write-Output ""
Write-Output "✅ Issue erfolgreich aktualisiert mit PR-Link und Screenshots!"
```

### 13. Wichtiger Hinweis: Automatisches Issue-Schließen

```
🤖 AUTOMATISCHER WORKFLOW NACH PR-MERGE:

Wenn der Pull Request gemerged wird:
1. GitHub Action startet automatisch
2. Issue-ID wird aus PR-Titel extrahiert
3. YouTrack-Issue erhält Kommentar "PR gemerged"
4. Issue-Status wird auf "Fixed" gesetzt
5. Issue ist automatisch geschlossen ✅

KEINE MANUELLEN SCHRITTE ERFORDERLICH!

Details: Siehe .specify/GITHUB-YOUTRACK-INTEGRATION.md
```

### 14. Zusammenfassung ausgeben

```
✅ Issue LUD28-35 erfolgreich bearbeitet!

## Zusammenfassung
- Branch: feature/LUD28-35-transparentes-lampenbild
- Commits: 3
- Dateien geändert: 4
- Pull Request: [URL]
- Issue-Status: To Verify

## Nächste Schritte
1. Code-Review durchführen
2. Bei Approval: Branch mergen
3. Issue auf "Done" setzen
4. Branch löschen

## Geänderte Dateien
- src/app/components/lamp-toggle/lamp-toggle.html
- src/app/components/lamp-toggle/lamp-toggle.scss
- public/assets/icons/light.svg
- (weitere Dateien)
```

## Betriebsregeln

### Was du DARFST:
✅ Code schreiben und ändern
✅ Dateien erstellen und löschen
✅ Branches erstellen
✅ Commits machen
✅ Pull Requests erstellen
✅ Dependencies installieren (nach Rückfrage)
✅ Tests ausführen
✅ Assets hinzufügen/optimieren
✅ Issue-Status aktualisieren

### Was du NICHT DARFST:
❌ Main-Branch direkt ändern (immer Feature-Branch!)
❌ Issues ohne Rücksprache löschen
❌ Breaking Changes ohne Warnung
❌ Dependencies ohne Grund hinzufügen
❌ Sicherheitskritische Änderungen ohne Review
❌ Production-Datenbank direkt ändern

## Verfügbare Tools

### Frontend (Angular)
- **ng**: Angular CLI - Komponenten, Services, etc. generieren
- **npm**: Package Manager
- **TypeScript**: Typ-sicherer Code
- **RxJS**: Reactive Programming
- **Material Design**: UI-Komponenten
- **SCSS**: Advanced Styling

### Backend (Node.js)
- **Express**: REST-API Framework
- **Mongoose**: MongoDB ODM
- **axios**: HTTP-Client
- **dotenv**: Environment Variables
- **WebSocket**: Real-time Communication

### Development
- **Git**: Version Control
- **npm test**: Unit Tests ausführen
- **npm start**: Dev-Server starten
- **ESLint**: Code-Linting
- **Chrome DevTools**: Browser-Debugging

### Assets
- **SVG**: Vektorgrafiken (bevorzugt)
- **PNG**: Rastergrafiken (mit Transparenz)
- **WebP**: Moderne Bildformate
- **ImageOptim**: Bild-Optimierung

## Kontext-Quellen

- `roles.md` - Rollendefinitionen
- `AGENT.md` - Projektstruktur und Guidelines
- `README.md` - Projekt-Übersicht
- `package.json` - Dependencies
- `angular.json` - Angular-Konfiguration
- Issue-Beschreibung aus YouTrack

## Fehlerbehandlung

### Compiler-Fehler
1. Fehler analysieren
2. TypeScript-Typen prüfen
3. Imports prüfen
4. Falls unlösbar: Nutzer fragen

### Runtime-Fehler
1. Console-Logs prüfen
2. Breakpoints setzen
3. Debugging durchführen
4. Falls persistent: Nutzer fragen

### Merge-Konflikte
1. Main-Branch pullen: `git pull origin main`
2. Konflikte manuell lösen
3. Testen ob alles funktioniert
4. Neuer Commit

### Build-Fehler
1. `npm install` ausführen
2. Cache löschen: `npm cache clean --force`
3. `node_modules` löschen und neu installieren
4. Falls persistent: Nutzer fragen

## Erfolg-Kriterien

Ein erfolgreicher Issue-Worker-Durchlauf hat:
✅ Issue aus YouTrack geladen
✅ Feature-Branch erstellt
✅ Code implementiert (funktionierend!)
✅ Code-Qualität sichergestellt
✅ Manuell getestet
✅ Commits mit aussagekräftigen Messages
✅ Branch gepusht
✅ Pull Request erstellt
✅ Issue-Status aktualisiert
✅ Dokumentation aktualisiert (falls nötig)

## Context

$ARGUMENTS