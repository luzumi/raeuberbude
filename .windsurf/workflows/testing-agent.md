---
description: Testing Agent – Automatischer Testlauf mit Bug-Reporting und YouTrack-Update
---

## Rolle: Testing Agent (Minimal)

Führt automatisierte Tests aus, sammelt Ergebnisse, erstellt bei Fehlern Bug-Issues und aktualisiert den Status/Kommentar im YouTrack-Parent-Issue.

## User Input

```text
$ARGUMENTS
```

Format: `/testing-agent <issue-id> [--mode=full|quick|regression] [--auto-report] [--config=test-config-<issue-id>.json]`

## Ziel

- Automatischer Testlauf via Puppeteer-Skript
- Ergebnisse analysieren (Pass-Rate, Errors)
- Bei Fehlern: Bug-Issues erzeugen (lokaler YouTrack MCP-Server)
- Bei Erfolg: Parent-Issue kommentieren und Status auf „To verify“ setzen

## Ablauf

### 1) Tests ausführen

```powershell
$issueId = $ARGUMENTS[0]
$configPath = "test-config-$issueId.json"
if (-not (Test-Path $configPath)) { Write-Output "ℹ️  Keine Config gefunden – Default Smoke Test wird verwendet" }

# Ergebnisse landen in test-results/auto-test-report.(json|md)
// turbo
node .specify/scripts/auto-test-feature.js "$configPath" "$issueId"
```

### 2) Ergebnisse analysieren

```powershell
$reportPath = "test-results/auto-test-report.json"
if (-not (Test-Path $reportPath)) { throw "Report nicht gefunden: $reportPath" }

$report = Get-Content $reportPath | ConvertFrom-Json
$failed = [int]$report.failed
$errors = [int]$report.logAnalysis.errors
$passed = [int]$report.passed
$total  = [int]$report.totalTests
$passRate = [int]$report.passRate

Write-Output "🧪 Tests: $passed/$total passed ($passRate%) | Console-Errors: $errors"
```

### 3A) Bei Fehlern: Bug-Issues erstellen und Parent kommentieren

```powershell
if ($failed -gt 0 -or $errors -gt 0) {
    Write-Output "🐛 Erstelle Bug-Issues für fehlgeschlagene Tests..."

    $bugs = @()
    foreach ($ft in $report.failedTests) {
        $summary = "[BUG] Test Failure: " + $ft.name
        $description = @"
# Automatischer Bug aus Testing Agent

**Parent:** $issueId
**Fehler:** $($ft.error)

**Reproduce:**
```bash
node .specify/scripts/auto-test-feature.js "$configPath" "$issueId"
```
@"

        try {
            $payload = @{ summary=$summary; description=$description; type='Bug' } | ConvertTo-Json
            $resp = Invoke-RestMethod -Uri "http://localhost:5180/issues" -Method POST -Body $payload -ContentType 'application/json'
            $bugs += $resp.idReadable
            Write-Output "  ✅ $($resp.idReadable): $summary"
        } catch {
            Write-Output "  ⚠️  Konnte Bug-Issue nicht anlegen: $summary"
        }
    }

    # Parent-Comment mit Zusammenfassung
    $comment = @"
📊 Auto-Test Report für $issueId

- Tests: $passed/$total passed ($passRate%)
- Console-Errors: $errors
- Bugs: $($bugs -join ', ')

Siehe: test-results/auto-test-report.md
@"
    try {
        Invoke-RestMethod -Uri "http://localhost:5180/issues/$issueId/comments" -Method POST -Body (@{ text=$comment } | ConvertTo-Json) -ContentType 'application/json'
    } catch { }

    return
}
```

### 3B) Bei Erfolg: Parent kommentieren und Status setzen

```powershell
Write-Output "✅ Alle Tests grün – aktualisiere YouTrack"

$commentOk = @"
✅ Alle Tests bestanden für $issueId

- Tests: $passed/$total passed ($passRate%)
- Console-Errors: $errors

Report: test-results/auto-test-report.md
@"

try { Invoke-RestMethod -Uri "http://localhost:5180/issues/$issueId/comments" -Method POST -Body (@{ text=$commentOk } | ConvertTo-Json) -ContentType 'application/json' } catch {}
try { Invoke-RestMethod -Uri "http://localhost:5180/issues/$issueId/state" -Method POST -Body (@{ name='To verify' } | ConvertTo-Json) -ContentType 'application/json' } catch {}
```

## Context

$ARGUMENTS
