# Firewall-Regel für Raeuberbude erstellen
# MUSS als Administrator ausgeführt werden!

Write-Host "`nRaeuberbude - Firewall-Regel erstellen" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Prüfe Admin-Rechte
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ FEHLER: Dieses Script muss als Administrator ausgeführt werden!" -ForegroundColor Red
    Write-Host "`nRechtsklick auf PowerShell → Als Administrator ausführen`n" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "✅ Administrator-Rechte erkannt`n" -ForegroundColor Green

# Prüfe ob Regel bereits existiert
$existingRule = Get-NetFirewallRule -DisplayName "Raeuberbude Dev Server" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "⚠️  Regel 'Raeuberbude Dev Server' existiert bereits!" -ForegroundColor Yellow
    $answer = Read-Host "Möchten Sie sie löschen und neu erstellen? (j/n)"

    if ($answer -eq 'j' -or $answer -eq 'y') {
        Remove-NetFirewallRule -DisplayName "Raeuberbude Dev Server"
        Write-Host "✅ Alte Regel gelöscht" -ForegroundColor Green
    } else {
        Write-Host "Abgebrochen." -ForegroundColor Yellow
        pause
        exit
    }
}

# Erstelle neue Regel
try {
    New-NetFirewallRule `
        -DisplayName "Raeuberbude Dev Server" `
        -Description "Erlaubt Zugriff auf Angular (4200), NestJS (3001) und Backend Express (3000)" `
        -Direction Inbound `
        -LocalPort 3000,3001,4200 `
        -Protocol TCP `
        -Action Allow `
        -Profile Private,Domain `
        -Enabled True

    Write-Host "`n✅ Firewall-Regel erfolgreich erstellt!" -ForegroundColor Green
    Write-Host "`nErlaubte Ports:" -ForegroundColor Cyan
    Write-Host "  - 3000 (Backend Express)" -ForegroundColor White
    Write-Host "  - 3001 (NestJS)" -ForegroundColor White
    Write-Host "  - 4200 (Angular Dev Server)" -ForegroundColor White
    Write-Host "`nProfile: Private, Domain" -ForegroundColor Cyan
    Write-Host "`nHinweis: Public-Profil wurde NICHT aktiviert (Sicherheit)" -ForegroundColor Yellow

} catch {
    Write-Host "`n❌ FEHLER beim Erstellen der Regel:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Zum Beenden beliebige Taste drücken..." -ForegroundColor Gray
pause

