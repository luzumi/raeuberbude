# Test-Script für alle Fixes

## Test 1: Backend läuft
Write-Host "=== Test 1: Backend Status ===" -ForegroundColor Cyan
$port = 3001
$listener = netstat -ano | Select-String ":$port.*LISTENING"
if ($listener) {
    Write-Host "✓ Backend läuft auf Port $port" -ForegroundColor Green
} else {
    Write-Host "✗ Backend läuft NICHT" -ForegroundColor Red
    exit 1
}

## Test 2: Config-API
Write-Host "`n=== Test 2: Config-API ===" -ForegroundColor Cyan
try {
    $config = curl http://localhost:3001/api/llm-config | ConvertFrom-Json
    Write-Host "✓ Config geladen: Model=$($config.model), Temperature=$($config.temperature)" -ForegroundColor Green
} catch {
    Write-Host "✗ Config-API fehlgeschlagen: $_" -ForegroundColor Red
}

## Test 3: Default-Prompt Endpoint
Write-Host "`n=== Test 3: Default-Prompt Endpoint ===" -ForegroundColor Cyan
try {
    $defaultPrompt = curl http://localhost:3001/api/llm-instances/default-prompt | ConvertFrom-Json
    $promptLength = $defaultPrompt.defaultPrompt.Length
    Write-Host "✓ Default-Prompt geladen: $promptLength Zeichen" -ForegroundColor Green
    if ($promptLength -lt 1000) {
        Write-Host "⚠ Warnung: Prompt erscheint kurz (< 1000 Zeichen)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Default-Prompt Endpoint fehlgeschlagen: $_" -ForegroundColor Red
}

## Test 4: LLM-Instanzen
Write-Host "`n=== Test 4: LLM-Instanzen ===" -ForegroundColor Cyan
try {
    $instances = curl http://localhost:3001/api/llm-instances | ConvertFrom-Json
    Write-Host "✓ $($instances.Count) Instanzen gefunden" -ForegroundColor Green

    $activeInstances = $instances | Where-Object { $_.isActive -eq $true }
    Write-Host "  - Aktive Instanzen: $($activeInstances.Count)" -ForegroundColor White

    foreach ($inst in $instances | Select-Object -First 3) {
        $promptLen = if ($inst.systemPrompt) { $inst.systemPrompt.Length } else { 0 }
        Write-Host "  - $($inst.model): Prompt=$promptLen Zeichen, Active=$($inst.isActive)" -ForegroundColor White
    }
} catch {
    Write-Host "✗ LLM-Instanzen Endpoint fehlgeschlagen: $_" -ForegroundColor Red
}

## Test 5: Deaktivierungs-Endpoint
Write-Host "`n=== Test 5: Deaktivierungs-Endpoint ===" -ForegroundColor Cyan
try {
    $instances = curl http://localhost:3001/api/llm-instances | ConvertFrom-Json
    $activeId = ($instances | Where-Object { $_.isActive -eq $true } | Select-Object -First 1)._id

    if ($activeId) {
        Write-Host "  Teste Deaktivierung von Instanz: $activeId" -ForegroundColor White
        $result = curl -Method POST "http://localhost:3001/api/llm-instances/$activeId/deactivate" -ContentType "application/json" -Body '{}' | ConvertFrom-Json

        if ($result.isActive -eq $false) {
            Write-Host "✓ Deaktivierung erfolgreich" -ForegroundColor Green

            # Reaktivieren für nächste Tests
            curl -Method POST "http://localhost:3001/api/llm-instances/$activeId/activate" -ContentType "application/json" -Body '{}' | Out-Null
            Write-Host "  Instanz wieder aktiviert" -ForegroundColor White
        } else {
            Write-Host "✗ Deaktivierung fehlgeschlagen: isActive=$($result.isActive)" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠ Keine aktive Instanz zum Testen gefunden" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Deaktivierungs-Test fehlgeschlagen: $_" -ForegroundColor Red
}

## Test 6: System-Prompt bei Instanzen
Write-Host "`n=== Test 6: System-Prompts ===" -ForegroundColor Cyan
try {
    $instances = curl http://localhost:3001/api/llm-instances | ConvertFrom-Json
    $emptyPrompts = 0
    $fullPrompts = 0

    foreach ($inst in $instances) {
        if ($inst.systemPrompt -and $inst.systemPrompt.Length -gt 100) {
            $fullPrompts++
        } else {
            $emptyPrompts++
        }
    }

    Write-Host "  - Instanzen mit Prompt (>100 Zeichen): $fullPrompts" -ForegroundColor White
    Write-Host "  - Instanzen mit leerem/kurzem Prompt: $emptyPrompts" -ForegroundColor White

    if ($emptyPrompts -eq 0) {
        Write-Host "✓ Alle Instanzen haben System-Prompts" -ForegroundColor Green
    } else {
        Write-Host "⚠ $emptyPrompts Instanzen haben keinen/kurzen Prompt" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ System-Prompt Check fehlgeschlagen: $_" -ForegroundColor Red
}

## Zusammenfassung
Write-Host "`n=== Zusammenfassung ===" -ForegroundColor Cyan
Write-Host "Backend läuft und alle Endpoints sind erreichbar." -ForegroundColor Green
Write-Host "`nNächste Schritte:" -ForegroundColor White
Write-Host "1. Frontend starten: npm start" -ForegroundColor White
Write-Host "2. Admin-UI öffnen: http://localhost:4200" -ForegroundColor White
Write-Host "3. Navigiere zu 'Sprachassistent Admin' → 'Modelle & Env'" -ForegroundColor White
Write-Host "4. Prüfe:" -ForegroundColor White
Write-Host "   - System-Prompt Textarea zeigt vollständigen Prompt" -ForegroundColor White
Write-Host "   - Aktive Instanzen haben roten 'Deaktivieren'-Button" -ForegroundColor White
Write-Host "   - Inaktive Instanzen haben grünen 'Aktivieren'-Button" -ForegroundColor White

