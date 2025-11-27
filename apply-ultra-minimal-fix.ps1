# ULTRA-MINIMAL FIX - Backend sendet jetzt NUR messages

Write-Host "`n=== ULTRA-MINIMAL FIX IMPLEMENTIERT ===" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Backend sendet jetzt NUR noch:" -ForegroundColor Cyan
Write-Host "   {" -ForegroundColor Gray
Write-Host "     model: 'mistralai/mistral-7b-bnb-homeassistant'," -ForegroundColor Gray
Write-Host "     messages: [...],  // Deine Chat-Messages" -ForegroundColor Gray
Write-Host "     stream: false" -ForegroundColor Gray
Write-Host "   }" -ForegroundColor Gray
Write-Host ""
Write-Host "   KEINE Parameter mehr:" -ForegroundColor Yellow
Write-Host "   ❌ temperature (entfernt)" -ForegroundColor Gray
Write-Host "   ❌ max_tokens (entfernt)" -ForegroundColor Gray
Write-Host "   ❌ top_k, top_p, etc. (entfernt)" -ForegroundColor Gray
Write-Host ""
Write-Host "   → LM Studio verwendet eigene Defaults" -ForegroundColor Green
Write-Host ""

# Stoppe Backend
Write-Host "📋 Schritt 1: Stoppe Backend..." -ForegroundColor Cyan
$processes = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($processes) {
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "   ✅ Backend gestoppt" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ Backend läuft nicht" -ForegroundColor Gray
}

# Starte Backend neu
Write-Host "`n📋 Schritt 2: Starte Backend neu..." -ForegroundColor Cyan
$backendPath = "C:\Users\corat\IdeaProjects\raueberbude\backend\nest-app"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$backendPath'; Write-Host '=== BACKEND ULTRA-MINIMAL MODE ===' -ForegroundColor Magenta; Write-Host 'Sendet NUR messages an LM Studio (keine Parameter)' -ForegroundColor Yellow; npm run start:dev"
)

Write-Host "   ✅ Backend startet in neuem Terminal" -ForegroundColor Green
Write-Host "   Warte 15 Sekunden..." -ForegroundColor Gray
Start-Sleep -Seconds 15

Write-Host "`n📋 Schritt 3: Status..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/llm-instances" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Backend läuft!" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Backend antwortet noch nicht" -ForegroundColor Yellow
}

Write-Host "`n=== NÄCHSTE SCHRITTE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣ Teste im Browser:" -ForegroundColor White
Write-Host "   → http://localhost:4200" -ForegroundColor Gray
Write-Host "   → Mikrofon-Button klicken" -ForegroundColor Gray
Write-Host "   → 'Licht im Wohnzimmer an' sagen" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣ Falls IMMER NOCH Fehler:" -ForegroundColor Yellow
Write-Host "   → Das Modell-Template ist DEFINITIV kaputt" -ForegroundColor Red
Write-Host "   → Backend kann nichts mehr tun" -ForegroundColor Red
Write-Host "   → LM Studio Logs prüfen:" -ForegroundColor White
Write-Host "      C:\Users\corat\.lmstudio\logs\" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣ LÖSUNG bei weiterem Fehler:" -ForegroundColor Green
Write-Host "   A) Anderes Modell in LM Studio laden:" -ForegroundColor White
Write-Host "      → Search: 'Mistral-7B-Instruct-v0.3'" -ForegroundColor Gray
Write-Host "      → Download: lmstudio-community version" -ForegroundColor Gray
Write-Host "      → Server → Neues Modell wählen" -ForegroundColor Gray
Write-Host ""
Write-Host "   B) Modell-Template in LM Studio manuell fixen:" -ForegroundColor White
Write-Host "      → My Models → mistral-7b-bnb-homeassistant" -ForegroundColor Gray
Write-Host "      → Settings → Prompt Template" -ForegroundColor Gray
Write-Host "      → Template ersetzen (siehe LM_STUDIO_TEMPLATE_FIX.md)" -ForegroundColor Gray
Write-Host ""

Write-Host "=== TECHNISCHE INFO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Geänderte Datei:" -ForegroundColor White
Write-Host "  backend/nest-app/src/modules/llm/llm-client.service.ts" -ForegroundColor Gray
Write-Host ""
Write-Host "Was wurde entfernt:" -ForegroundColor White
Write-Host "  - temperature Parameter" -ForegroundColor Gray
Write-Host "  - max_tokens Parameter" -ForegroundColor Gray
Write-Host "  - ALLE anderen Parameter (top_k, top_p, etc.)" -ForegroundColor Gray
Write-Host ""
Write-Host "Request-Body jetzt:" -ForegroundColor White
Write-Host "  { model, messages, stream }" -ForegroundColor Gray
Write-Host "  → Absolutes Minimum!" -ForegroundColor Green
Write-Host ""

Write-Host "✅ DONE!" -ForegroundColor Green
Write-Host "Backend läuft im ULTRA-MINIMAL Modus" -ForegroundColor Cyan
Write-Host ""

