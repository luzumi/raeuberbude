---
description: Testing Agent mit Komponententests, E2E-Tests und automatischem Bug-Reporting für Feature-Flow
---

## Rolle: Testing Agent (Enhanced)

Erstellt und führt **vollständige Tests** durch: Komponententests, E2E-Tests, manuelle Tests.
Erstellt automatisch Bug-Issues bei Fehlern.

## User Input

```text
$ARGUMENTS
```

Format: `/testing-agent <issue-id> [--mode=full|quick|regression] [--auto-report]`

**Modi:**
- `full`: Komponententests + E2E-Tests + Manuelle Tests (Standard)
- `quick`: Nur Komponententests + kritische E2E-Tests  
- `regression`: Nur Re-Test nach Bug-Fixes

**Flags:**
- `--auto-report`: Automatisch Bug-Issues erstellen ohne Nachfrage
- `--coverage-threshold=80`: Minimale Coverage (default: 80%)

## Ziel

100% Test-Abdeckung des Tickets mit Komponententests und E2E-Tests.
Bei Bugs: Automatisch Bug-Issues erstellen und zurück zum Coding Agent.

## Workflow

```
Testing Agent startet
    ↓
1. Komponententests schreiben
2. Komponententests ausführen
    ↓
3. E2E-Tests schreiben
4. E2E-Tests ausführen
    ↓
5. Manuelle Browser-Tests
    ↓
6. Test-Report generieren
    ↓
    ├─ Bugs? → Bug-Issues erstellen
    │           ↓
    │       Zurück zu Coding Agent
    └─ Alles grün? → PR freigeben ✅
```

## Ausführungsschritte

### 1. Issue laden und analysieren

```powershell
$issueId = $ARGUMENTS[0]  # z.B. "LUD28-36"
$mode = $ARGUMENTS[1] ?? "full"  # default: full
$autoReport = $ARGUMENTS.Contains("--auto-report")

Write-Output "🧪 Testing Agent startet..."
Write-Output "Issue: $issueId"
Write-Output "Mode: $mode"
Write-Output ""

# Issue laden
$headers = @{
    'Authorization' = 'Bearer perm:YWRtaW4=.NDUtMA==.VqVCNbrN5JRc1nEJiCuGSHOmqZa1HY'
    'Accept' = 'application/json'
}
$issue = Invoke-RestMethod -Uri "https://luzumi.youtrack.cloud/api/issues/$issueId?fields=id,idReadable,summary,description" -Headers $headers

Write-Output "Feature: $($issue.summary)"
Write-Output ""
```

### 2. Komponententests schreiben

```typescript
// BEISPIEL: orange-light-minimal.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrangeLightMinimal } from './orange-light-minimal';
import { HomeAssistantService } from '@services/home-assistant/home-assistant.service';
import { of } from 'rxjs';

describe('OrangeLightMinimal', () => {
  let component: OrangeLightMinimal;
  let fixture: ComponentFixture<OrangeLightMinimal>;
  let mockHomeAssistantService: jasmine.SpyObj<HomeAssistantService>;

  beforeEach(async () => {
    // Mock Service
    mockHomeAssistantService = jasmine.createSpyObj('HomeAssistantService', ['entities$']);
    mockHomeAssistantService.entities$ = of([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'off' }
    ]);

    await TestBed.configureTestingModule({
      imports: [OrangeLightMinimal],
      providers: [
        { provide: HomeAssistantService, useValue: mockHomeAssistantService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrangeLightMinimal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // TC-01: Komponente wird erstellt
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TC-02: Lampenbild wird angezeigt
  it('should display lamp image', () => {
    const compiled = fixture.nativeElement;
    const img = compiled.querySelector('img.lamp-icon');
    expect(img).toBeTruthy();
    expect(img.src).toContain('orange-light-lamp');
  });

  // TC-03: Off-Zustand hat korrekte CSS-Klasse
  it('should have "off" class when lamp is off', () => {
    mockHomeAssistantService.entities$ = of([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'off' }
    ]);
    fixture.detectChanges();
    
    const img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('off')).toBe(true);
  });

  // TC-04: On-Zustand hat korrekte CSS-Klasse
  it('should have "on" class when lamp is on', () => {
    mockHomeAssistantService.entities$ = of([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'on' }
    ]);
    fixture.detectChanges();
    
    const img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('on')).toBe(true);
  });

  // TC-05: Unavailable-Zustand hat Graustufen
  it('should have "unavailable" class when lamp is unavailable', () => {
    mockHomeAssistantService.entities$ = of([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'unavailable' }
    ]);
    fixture.detectChanges();
    
    const img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('unavailable')).toBe(true);
  });

  // TC-06: State-Änderung aktualisiert Darstellung
  it('should update display when state changes', (done) => {
    const subject = new BehaviorSubject([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'off' }
    ]);
    mockHomeAssistantService.entities$ = subject.asObservable();
    
    fixture.detectChanges();
    let img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('off')).toBe(true);
    
    // State ändern
    subject.next([
      { entity_id: 'light.wiz_tunable_white_640190', state: 'on' }
    ]);
    fixture.detectChanges();
    
    img = fixture.nativeElement.querySelector('img.lamp-icon');
    expect(img.classList.contains('on')).toBe(true);
    done();
  });
});
```

**Komponententests ausführen:**

```powershell
Write-Output "📝 Schreibe Komponententests..."
# Tests werden in .spec.ts Dateien geschrieben

Write-Output "▶️  Führe Komponententests aus..."
npm test -- --watch=false --code-coverage

# Coverage prüfen
$coverage = Get-Content "coverage/coverage-summary.json" | ConvertFrom-Json
$lineCoverage = $coverage.total.lines.pct

Write-Output ""
Write-Output "Code Coverage: $lineCoverage%"

if ($lineCoverage -lt 80) {
    Write-Output "⚠️ Coverage unter 80%! Mehr Tests erforderlich."
}
```

### 3. E2E-Tests schreiben

```typescript
// BEISPIEL: orange-light.e2e.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Orange Light Feature', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4200/bude');
    await page.waitForLoadState('networkidle');
  });

  // E2E-01: Kachel zeigt Lampenbild
  test('should display lamp image on tile', async ({ page }) => {
    const lampImage = page.locator('.grid-item.orange-light img.lamp-icon');
    await expect(lampImage).toBeVisible();
  });

  // E2E-02: Lampenbild zeigt Off-Zustand
  test('should show lamp in off state', async ({ page }) => {
    const lampImage = page.locator('.grid-item.orange-light img.lamp-icon.off');
    await expect(lampImage).toBeVisible();
  });

  // E2E-03: Klick auf Kachel schaltet Lampe ein
  test('should toggle lamp on when clicked', async ({ page }) => {
    const tile = page.locator('.grid-item.orange-light');
    
    // Before: off
    await expect(tile.locator('img.lamp-icon.off')).toBeVisible();
    
    // Click
    await tile.click();
    
    // After: on (warte auf State-Change)
    await expect(tile.locator('img.lamp-icon.on')).toBeVisible({ timeout: 5000 });
  });

  // E2E-04: Klick schaltet Lampe wieder aus
  test('should toggle lamp off when clicked again', async ({ page }) => {
    const tile = page.locator('.grid-item.orange-light');
    
    // Erst einschalten
    await tile.click();
    await expect(tile.locator('img.lamp-icon.on')).toBeVisible({ timeout: 5000 });
    
    // Dann ausschalten
    await tile.click();
    await expect(tile.locator('img.lamp-icon.off')).toBeVisible({ timeout: 5000 });
  });

  // E2E-05: Halten öffnet Detail-Ansicht
  test('should open detail view on long press', async ({ page }) => {
    const tile = page.locator('.grid-item.orange-light');
    
    // Long press simulieren
    await tile.hover();
    await page.mouse.down();
    await page.waitForTimeout(600); // > 500ms für Long Press
    await page.mouse.up();
    
    // Detail-Ansicht sollte offen sein
    await expect(page.locator('app-orange-light')).toBeVisible();
    await expect(page.locator('.back-button')).toBeVisible();
  });

  // E2E-06: Schnelles mehrfaches Klicken
  test('should handle rapid clicks gracefully', async ({ page }) => {
    const tile = page.locator('.grid-item.orange-light');
    
    // 5x schnell klicken
    for (let i = 0; i < 5; i++) {
      await tile.click({ delay: 50 });
    }
    
    // Sollte in konsistentem Zustand sein (entweder on oder off)
    const onVisible = await tile.locator('img.lamp-icon.on').isVisible();
    const offVisible = await tile.locator('img.lamp-icon.off').isVisible();
    
    expect(onVisible || offVisible).toBe(true);
    expect(onVisible && offVisible).toBe(false); // Nicht beides gleichzeitig!
  });

  // E2E-07: Responsive - Mobile
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    const lampImage = page.locator('.grid-item.orange-light img.lamp-icon');
    await expect(lampImage).toBeVisible();
    
    // Bild sollte skaliert sein
    const box = await lampImage.boundingBox();
    expect(box.width).toBeGreaterThan(50);
    expect(box.width).toBeLessThan(150);
  });
});
```

**E2E-Tests ausführen:**

```powershell
Write-Output ""
Write-Output "📝 Schreibe E2E-Tests..."
# Tests werden in .e2e.spec.ts Dateien geschrieben

Write-Output "▶️  Führe E2E-Tests aus..."

# App starten (im Hintergrund)
Start-Process -NoNewWindow npm "start"
Start-Sleep -Seconds 15

# Playwright Tests
npx playwright test

# App stoppen
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
```

### 4. Test-Results sammeln

```powershell
Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "📊 Test-Ergebnisse"
Write-Output ""

# Komponententests
$unitResults = Get-Content "test-results/unit/results.json" | ConvertFrom-Json
$unitTotal = $unitResults.numTotalTests
$unitPassed = $unitResults.numPassedTests
$unitFailed = $unitResults.numFailedTests

Write-Output "Komponententests:"
Write-Output "- Total: $unitTotal"
Write-Output "- Passed: $unitPassed ✅"
Write-Output "- Failed: $unitFailed $(if($unitFailed -gt 0){'❌'}else{''})"
Write-Output ""

# E2E-Tests
$e2eResults = Get-Content "test-results/e2e/results.json" | ConvertFrom-Json
$e2eTotal = $e2eResults.suites[0].specs.length
$e2ePassed = ($e2eResults.suites[0].specs | Where-Object { $_.ok -eq $true }).Count
$e2eFailed = $e2eTotal - $e2ePassed

Write-Output "E2E-Tests:"
Write-Output "- Total: $e2eTotal"
Write-Output "- Passed: $e2ePassed ✅"
Write-Output "- Failed: $e2eFailed $(if($e2eFailed -gt 0){'❌'}else{''})"
Write-Output ""

# Gesamt
$totalTests = $unitTotal + $e2eTotal
$totalPassed = $unitPassed + $e2ePassed
$totalFailed = $unitFailed + $e2eFailed
$passRate = [math]::Round(($totalPassed / $totalTests) * 100, 2)

Write-Output "Gesamt:"
Write-Output "- Total: $totalTests"
Write-Output "- Passed: $totalPassed ✅"
Write-Output "- Failed: $totalFailed $(if($totalFailed -gt 0){'❌'}else{''})"
Write-Output "- Pass-Rate: $passRate%"
Write-Output ""

# Code Coverage
Write-Output "Code Coverage:"
Write-Output "- Lines: $lineCoverage%"
Write-Output "- Branches: $($coverage.total.branches.pct)%"
Write-Output "- Functions: $($coverage.total.functions.pct)%"
Write-Output ""
```

### 5. Bug-Issues automatisch erstellen

```powershell
if ($totalFailed -gt 0) {
    Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Output "🐛 Bugs gefunden - Erstelle Bug-Issues..."
    Write-Output ""
    
    $bugs = @()
    
    # Komponententest-Fehler
    foreach ($failure in $unitResults.testResults.failureMessages) {
        $bug = @{
            title = "Unit Test Failure: $($failure.ancestorTitles -join ' > ')"
            description = @"
# Bug aus Komponententest

**Test:** $($failure.fullName)

**Fehlermeldung:**
\`\`\`
$($failure.failureMessages[0])
\`\`\`

**Erwartetes Verhalten:**
Wie im Test definiert

**Tatsächliches Verhalten:**
Test schlägt fehl

**Reproduce:**
\`\`\`bash
npm test -- --testNamePattern="$($failure.fullName)"
\`\`\`
"@
            severity = "High"
            type = "Bug"
        }
        $bugs += $bug
    }
    
    # E2E-Test-Fehler
    foreach ($failure in $e2eResults.suites[0].specs | Where-Object { $_.ok -eq $false }) {
        $bug = @{
            title = "E2E Test Failure: $($failure.title)"
            description = @"
# Bug aus E2E-Test

**Test:** $($failure.title)

**Fehlermeldung:**
\`\`\`
$($failure.tests[0].results[0].error.message)
\`\`\`

**Screenshot:**
[Siehe Anhang]

**Reproduce:**
\`\`\`bash
npx playwright test --grep="$($failure.title)"
\`\`\`
"@
            severity = "High"
            type = "Bug"
            screenshot = $failure.tests[0].results[0].attachments[0].path
        }
        $bugs += $bug
    }
    
    # Bug-Issues erstellen
    $bugIssues = @()
    foreach ($bug in $bugs) {
        if ($autoReport) {
            # Automatisch erstellen
            $bugIssue = New-YouTrackIssueComplete `
                -Summary "[BUG] $($bug.title)" `
                -Description $bug.description `
                -Type "Bug" `
                -Priority $bug.severity `
                -Screenshots @($bug.screenshot)
            
            # Mit Parent verlinken
            Add-YouTrackIssueLink -SourceIssue $bugIssue.idReadable -TargetIssue $issueId -LinkType "is caused by"
            
            $bugIssues += $bugIssue.idReadable
            Write-Output "  ✅ Bug-Issue: $($bugIssue.idReadable) - $($bug.title)"
        } else {
            # User fragen
            Write-Output "Bug gefunden: $($bug.title)"
            Write-Output "Soll ich ein Bug-Issue erstellen? (Ja/Nein)"
            # ... User-Input abwarten
        }
    }
    
    Write-Output ""
    Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Output "🔧 $($bugIssues.Count) Bug-Issues erstellt"
    Write-Output ""
    Write-Output "Nächster Schritt: Coding Agent beauftragt Bugs zu fixen"
    Write-Output ""
    foreach ($bugId in $bugIssues) {
        Write-Output "- /issue-worker $bugId"
    }
    
    # Rückgabe für Feature-Flow
    return @{
        status = "bugs_found"
        totalTests = $totalTests
        passed = $totalPassed
        failed = $totalFailed
        bugs = $bugIssues
    }
}
```

### 6. Success-Report (wenn alles grün)

```powershell
else {
    Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Output "✅ ALLE TESTS BESTANDEN!"
    Write-Output ""
    Write-Output "Feature ist bereit für Pull Request!"
    Write-Output ""
    
    # Test-Report in YouTrack
    $testReport = @"
📊 Test-Report für $issueId

**Komponententests:** $unitPassed/$unitTotal ✅
**E2E-Tests:** $e2ePassed/$e2eTotal ✅
**Code Coverage:** $lineCoverage% ✅

**Status:** Alle Tests bestanden, bereit für PR!

**Details:** Siehe angehängte Screenshots
"@
    
    Add-YouTrackComment -IssueId $issueId -Text $testReport
    
    # Screenshots hochladen
    Get-ChildItem "test-results/screenshots/*.png" | ForEach-Object {
        Add-YouTrackAttachment -IssueId $issueId -FilePath $_.FullName
    }
    
    # Rückgabe für Feature-Flow
    return @{
        status = "all_green"
        totalTests = $totalTests
        passed = $totalPassed
        failed = 0
        coverage = $lineCoverage
    }
}
```

## Test-Coverage-Ziele

- **Lines:** > 80%
- **Branches:** > 75%
- **Functions:** > 80%
- **Statements:** > 80%

## Context

$ARGUMENTS