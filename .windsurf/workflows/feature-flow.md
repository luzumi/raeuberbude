---
description: Vollautomatischer Feature-Workflow - Von Issue bis Pull Request mit Testing-Loop
---

## Rolle: Feature-Flow Orchestrator

Koordiniert den kompletten Feature-Entwicklungsprozess mit Coding Agent und Testing Agent.

## User Input

```text
$ARGUMENTS
```

Format: `/feature-flow <issue-id>`

## Ziel

Vollautomatische Feature-Implementierung mit Testing-Feedback-Loop bis Pull Request.

## Workflow-Übersicht

```
Issue (z.B. LUD28-36)
    ↓
Feature-Flow startet
    ↓
Coding Agent implementiert
    ↓
Testing Agent testet (Component + E2E)
    ↓
    ├─ Bugs gefunden? → Bug-Issues erstellen
    │                   ↓
    │              Coding Agent fixt
    │                   ↓
    │              Testing Agent nochmal
    │                   ↓
    └─ Alles grün? → Pull Request ✅
```

## Ausführungsschritte

### Phase 1: Initialisierung

```powershell
$issueId = $ARGUMENTS  # z.B. "LUD28-36"

Write-Output "🚀 Feature-Flow gestartet für $issueId"
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output ""
```

### Phase 2: Coding Agent beauftragen (VOLLAUTOMATISCH)

// turbo

```powershell
Write-Output "📝 Phase 1: Implementierung"
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output ""
Write-Output "👨‍💻 Coding Agent startet automatisch..."
Write-Output ""

# Rufe issue-worker workflow auf (vollautomatisch)
# Der Agent macht:
# 1. Issue laden
# 2. Status → "In Progress"
# 3. Branch erstellen
# 4. Code implementieren
# 5. Committen & Pushen
```

**Coding Agent läuft vollautomatisch durch - KEIN USER-INPUT ERFORDERLICH!**

**Output:** Branch-Name, Commit-Hash

### Phase 3: Automatisches Testing (VOLLAUTOMATISCH)

// turbo

```powershell
Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "🧪 Phase 2: Automatisches Testing"
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output ""
Write-Output "🤖 Starte vollautomatischen Test-Runner..."
Write-Output ""

# Führe automatische Tests durch mit Puppeteer
node .specify/scripts/auto-test-feature.js "test-config-$issueId.json"
```

**Was passiert vollautomatisch:**
1. ✅ Dev-Server startet
2. ✅ Browser öffnet (headless)
3. ✅ Tests werden durchgeführt
4. ✅ Console-Logs gesammelt
5. ✅ Screenshots erstellt
6. ✅ Report generiert
7. ✅ Server stoppt

**KEIN USER-INPUT! Keine Browser-Logs manuell kopieren!**

**Output:** `test-results/auto-test-report.md` mit allen Infos

### Phase 4: Bug-Analyse (AUTOMATISCH)

// turbo

```powershell
Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "📊 Analysiere Test-Ergebnisse..."
Write-Output ""

# Test-Results auswerten (automatisch generiert)
$testReport = Get-Content "test-results/auto-test-report.json" | ConvertFrom-Json

$totalTests = $testReport.totalTests
$passedTests = $testReport.passed
$failedTests = $testReport.failed
$passRate = $testReport.passRate
$consoleErrors = $testReport.logAnalysis.errors

Write-Output "🧪 Test-Ergebnisse:"
Write-Output "   Tests: $passedTests/$totalTests passed ($passRate%)"
Write-Output "   Console-Errors: $consoleErrors"
Write-Output "   Screenshots: $($testReport.screenshots.Count)"
Write-Output ""

# Entscheidung: Bugs oder fertig?
$hasCriticalIssues = ($failedTests -gt 0) -or ($consoleErrors -gt 0)

if ($hasCriticalIssues) {
    Write-Output "⚠️ Bugs gefunden!"
    Write-Output "   - $failedTests Test(s) fehlgeschlagen"
    Write-Output "   - $consoleErrors Console-Error(s)"
    Write-Output ""
    Write-Output "🔧 Starte Bug-Fix-Loop..."
} else {
    Write-Output "✅ Alle Tests bestanden! Keine Console-Errors!"
    Write-Output "📝 Bereit für Pull Request."
}
```

### Phase 5A: Bug-Fix-Loop (falls Bugs)

```markdown
🐛 **Bug-Fix-Loop**

Testing Agent hat $failedTests Bugs gefunden.
```

**Testing Agent erstellt Bug-Issues:**

```powershell
# Für jeden Bug ein Issue
foreach ($bug in $testResults.bugs) {
    Write-Output "Creating bug issue for: $($bug.title)"
    
    # Bug-Issue erstellen
    $bugIssue = New-YouTrackIssue `
        -Summary "[BUG] $($bug.title)" `
        -Description $bug.description `
        -Type "Bug" `
        -Priority $bug.severity `
        -Parent $issueId
    
    Write-Output "  ✅ Bug-Issue: $($bugIssue.idReadable)"
}

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "🔧 Coding Agent fixt Bugs..."
Write-Output ""
```

**Coding Agent fixt Bugs:**

```powershell
# Für jeden Bug
foreach ($bugId in $bugIssues) {
    Write-Output "Fixing $bugId..."
    
    # Coding Agent beauftragt Bug zu fixen
    # /issue-worker $bugId
    
    # ... Fix-Implementierung ...
    
    Write-Output "  ✅ $bugId gefixt"
}
```

**Zurück zum Testing Agent:**

```powershell
Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "🧪 Re-Testing nach Bug-Fixes..."
Write-Output ""

# Testing Agent nochmal
/testing-agent $issueId --mode=regression --auto-report
```

**Loop wiederholen bis alle Tests grün:**

```powershell
$maxIterations = 3
$iteration = 1

while ($failedTests -gt 0 -and $iteration -le $maxIterations) {
    Write-Output "Loop Iteration $iteration von $maxIterations"
    
    # Testing
    # Bug-Fixing
    # Re-Testing
    
    $iteration++
}

if ($failedTests -gt 0) {
    Write-Output "⚠️ Nach $maxIterations Iterationen noch Bugs vorhanden!"
    Write-Output "Manuelle Intervention erforderlich."
    exit 1
}
```

### Phase 5B: Pull Request (wenn alles grün)

```markdown
✅ **Alle Tests bestanden!**

Bereit für Pull Request.
```

```powershell
Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "✅ Alle Tests grün!"
Write-Output ""
Write-Output "📊 Finale Statistiken:"
Write-Output "- Komponententests: $componentTestsPassed von $componentTestsTotal ✅"
Write-Output "- E2E-Tests: $e2eTestsPassed von $e2eTestsTotal ✅"
Write-Output "- Manuelle Tests: $manualTestsPassed von $manualTestsTotal ✅"
Write-Output "- Code Coverage: $codeCoverage%"
Write-Output ""
```

**Branch pushen:**

```powershell
git push -u origin $branchName
```

**Pull Request erstellen:**

```powershell
$prBody = @"
## 📋 Feature: $issueId

**Issue:** https://luzumi.youtrack.cloud/issue/$issueId

## ✅ Implementierung
- Branch: $branchName
- Commits: $commitCount
- Dateien geändert: $filesChanged

## 🧪 Tests
✅ **Alle Tests bestanden!**

### Komponententests
- Total: $componentTestsTotal
- Passed: $componentTestsPassed ✅
- Failed: 0

### E2E-Tests
- Total: $e2eTestsTotal
- Passed: $e2eTestsPassed ✅
- Failed: 0

### Code Coverage
- Lines: $codeCoverage%
- Branches: $branchCoverage%

## 📸 Screenshots
[Siehe Test-Issue: $testIssueId]

## 🐛 Bugs
Gefunden: $totalBugsFound
Gefixt: $totalBugsFixed
Offen: 0 ✅

## ✅ Ready to Merge
- [x] Code implementiert
- [x] Tests geschrieben
- [x] Tests bestanden (100%)
- [x] Code Coverage > 80%
- [x] Keine offenen Bugs
- [x] Screenshots dokumentiert

## 🔗 Links
- Feature-Issue: https://luzumi.youtrack.cloud/issue/$issueId
- Test-Issue: https://luzumi.youtrack.cloud/issue/$testIssueId
"@

# GitHub CLI (falls vorhanden)
gh pr create `
    --title "[$issueId] $issueSummary" `
    --body $prBody `
    --base main

Write-Output ""
Write-Output "✅ Pull Request erstellt!"
```

### Phase 6: Finalisierung

```powershell
# Issue-Status aktualisieren
Update-YouTrackIssueState -IssueId $issueId -State "To Review"

# Kommentar hinzufügen
Add-YouTrackComment -IssueId $issueId -Text @"
✅ Feature-Flow abgeschlossen!

**Pull Request:** $prUrl

**Test-Ergebnisse:**
- Komponententests: $componentTestsPassed/$componentTestsTotal ✅
- E2E-Tests: $e2eTestsPassed/$e2eTestsTotal ✅
- Bugs gefunden: $totalBugsFound
- Bugs gefixt: $totalBugsFixed

**Bereit für Code-Review!**
"@

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "🎉 Feature-Flow erfolgreich abgeschlossen!"
Write-Output ""
Write-Output "Issue: $issueId ✅"
Write-Output "Branch: $branchName ✅"
Write-Output "Pull Request: $prUrl ✅"
Write-Output "Tests: 100% passed ✅"
Write-Output ""
Write-Output "Nächste Schritte:"
Write-Output "1. Code-Review durchführen"
Write-Output "2. PR approven"
Write-Output "3. Mergen"
Write-Output "4. Issue auf 'Done' setzen"
Write-Output ""
```

## Zusammenfassung des Workflows

### Erfolgreicher Durchlauf (keine Bugs)
```
1. Coding Agent implementiert      (10-30 Min)
2. Testing Agent testet            (5-10 Min)
3. Alle Tests grün ✅             (0 Bugs)
4. Pull Request automatisch        (1 Min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: ~20-40 Minuten
```

### Mit Bug-Fix-Loop (1-2 Iterationen)
```
1. Coding Agent implementiert      (10-30 Min)
2. Testing Agent testet            (5-10 Min)
3. Bugs gefunden ❌               (3 Bugs)
4. Coding Agent fixt               (10-20 Min)
5. Testing Agent re-testet         (5-10 Min)
6. Alle Tests grün ✅             (0 Bugs)
7. Pull Request automatisch        (1 Min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: ~35-70 Minuten (inkl. 1 Loop)
```

### Mit mehreren Bug-Fix-Loops (3+ Iterationen)
```
Falls nach 3 Iterationen noch Bugs → Manuelle Intervention
```

## Verwendung

### Standard-Feature-Flow
```bash
/feature-flow LUD28-36
```

### Mit Optionen
```bash
/feature-flow LUD28-36 --auto-confirm --max-loops=5
```

**Optionen:**
- `--auto-confirm`: Keine Bestätigungen, komplett automatisch
- `--max-loops=N`: Maximal N Bug-Fix-Loops (default: 3)
- `--skip-e2e`: E2E-Tests überspringen
- `--coverage-threshold=80`: Minimale Code-Coverage (default: 80%)

## Erfolg-Kriterien

Ein erfolgreicher Feature-Flow hat:
✅ Feature implementiert
✅ Komponententests geschrieben und bestanden
✅ E2E-Tests geschrieben und bestanden
✅ Code Coverage > 80%
✅ Alle Bugs gefixt
✅ Pull Request erstellt
✅ Issue auf "To Review" gesetzt
✅ Dokumentation vollständig

## Context

$ARGUMENTS
