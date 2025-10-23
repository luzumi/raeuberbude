---
description: Review Agent – Codeprüfung, Qualitätssicherung und Test-Issue-Erstellung
---

## Rolle: Review Agent

Prüft den implementierten Code (vom Coding-Agent), führt Checks und Builds aus, fasst Findings zusammen und erzeugt bei erfolgreichem Review ein Test-Issue auf YouTrack. Danach Handover an den Testing-Agent.

## User Input

```text
$ARGUMENTS
```

Format: `/review-agent <issue-id>`

## Ziel

- Statische und dynamische Checks (Build, Unit Tests)
- Review-Findings konsolidieren (Blocking/Non-Blocking)
- Bei Erfolg: Test-Issue für den Testing-Agent erstellen und zurückgeben

## Ablauf

### 1) Kontext laden

- Lies das YouTrack-Issue: Summary/Description/Type/Priority
- Ermittle den Branch-Namen falls bekannt (z.B. `feature/<issue-id>-...`)

### 2) Checks ausführen

```powershell
Write-Output "🔎 Review-Agent startet für $ARGUMENTS..."

# Optional: Lint (nur falls vorhanden)
try { npm run lint --silent } catch { Write-Output "ℹ️  Kein Lint-Script vorhanden oder Fehler – fahre fort" }

# Build
npm run build

# Unit Tests (ohne Watch)
npm test
```

### 2a) Status im YouTrack aktualisieren (In Review)

```powershell
$parentId = $ARGUMENTS[0]
try {
  Invoke-RestMethod -Uri "http://localhost:5180/issues/$parentId/commands" -Method POST -Body (@{ query='State In Review'; silent=$true } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
} catch { Write-Output "(Hinweis) Konnte Status nicht setzen: $_" }
```
### 2b) UI-/Responsive-Check (Header)

Prüfe visuell (oder per E2E), dass der Header korrekt dargestellt wird:

- Icons in `src/app/shared/components/header/header.component.html` liegen nebeneinander (nicht überlappend)
- Keine Überlappung bei Breakpoints: 1440px, 1024px, 768px, 375px
- Greet-Text blendet unter 960px aus, Avatar/Name bleiben sichtbar
- Farbkontrast ist ausreichend; Variablen `--header-bg` und `--header-fg` können überschrieben werden

Optional (manuell):
```powershell
npm start   # App im Browser öffnen und per DevTools Breakpoints prüfen
```

### 3) Findings zusammenstellen

- Sammle Compiler- und Test-Fehler aus der Konsole
- Kategorisiere: Blocking (muss gefixt werden) vs. Hinweise
- Erzeuge kurze Zusammenfassung für Kommentar

```powershell
$reviewSummary = @"
🧰 Code Review Ergebnisse

- Build: OK
- Hinweise:
  - (Beispiel) TODO-Kommentare entfernen
  - (Beispiel) Magic Numbers extrahieren

if ($LASTEXITCODE -eq 0) {
  try {
    Invoke-RestMethod -Uri "http://localhost:5180/issues/$parentId/commands" -Method POST -Body (@{ query='State Ready for Test'; silent=$true } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
  } catch { Write-Output "(Hinweis) Konnte Status nicht setzen: $_" }
  try {
    Invoke-RestMethod -Uri "http://localhost:5180/issues/$parentId/comments" -Method POST -Body (@{ text='[Review] Bestanden – Details im Build-Log.' } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
  } catch { Write-Output "(Hinweis) Konnte Kommentar nicht posten: $_" }
} else {
  try {
    Invoke-RestMethod -Uri "http://localhost:5180/issues/$parentId/commands" -Method POST -Body (@{ query='State Reopened'; silent=$true } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
  } catch { Write-Output "(Hinweis) Konnte Status nicht setzen: $_" }
  try {
    Invoke-RestMethod -Uri "http://localhost:5180/issues/$parentId/comments" -Method POST -Body (@{ text='[Review] Fehlgeschlagen – Details im Build/Test Output.' } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
  } catch { Write-Output "(Hinweis) Konnte Kommentar nicht posten: $_" }
}

### 4) Test-Issue auf YouTrack erstellen (lokaler MCP-Server)

```powershell
{{ ... }}
$testSummary = "[TEST] "$parentId" – Tests schreiben und ausführen"
$testDescription = @"
Automatisch vom Review-Agent erstellt.

Ziele:
- Komponententests vollständig (Lines ≥ 80%)
- E2E-Tests für Haupt-User-Flows
- Test-Report generieren und im Parent verlinken

Bitte nach Abschluss: PR vorbereiten.
@"

$payload = @{ summary=$testSummary; description=$testDescription; type='Task' } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:5180/issues" -Method POST -Body $payload -ContentType 'application/json'
$testIssueId = $response.idReadable

Write-Output "✅ Test-Issue erstellt: $testIssueId"
```

Optional: Parent kommentieren
```powershell
$comment = @"
🔎 Code Review abgeschlossen

- Ergebnis: BESTANDEN
- Test-Issue: $testIssueId
- Hinweise: (siehe Review-Zusammenfassung)
@"
Invoke-RestMethod -Uri "http://localhost:5180/issues/$parentId/comments" -Method POST -Body (@{ text=$comment } | ConvertTo-Json) -ContentType 'application/json'
```

### 5) Handover an Testing-Agent

```powershell
/testing-agent $testIssueId --auto-report
```

## Output

- `testIssueId`: ID des erstellten Test-Issues auf YouTrack
- Review-Kommentar im Parent-Issue

## Context

$ARGUMENTS
