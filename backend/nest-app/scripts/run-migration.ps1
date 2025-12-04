# MongoDB → MariaDB Migration
# Automatisches PowerShell-Skript

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     MongoDB → MariaDB Migration                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Schritt 1: Neue Tabellen erstellen
Write-Host "Schritt 1: Neue Tabellen erstellen..." -ForegroundColor Yellow
try {
    mysql -h 127.0.0.1 -P 3307 -u rb_user -p rb_user_secret raueberbude < scripts/create-llm-and-category-tables.sql
    Write-Host "✅ Tabellen erstellt`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Tabellen existieren bereits oder Fehler: $_`n" -ForegroundColor Yellow
}

# Schritt 2: Tabellen leeren
Write-Host "Schritt 2: Bestehende Tabellen leeren..." -ForegroundColor Yellow
node scripts/step1_truncate_tables.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Fehler beim Leeren der Tabellen!" -ForegroundColor Red
    exit 1
}

# Schritt 3: Benutzer auffordern, App zu starten
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     WICHTIG: App-Neustart erforderlich                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Bitte führe jetzt in einem NEUEN Terminal aus:" -ForegroundColor Yellow
Write-Host "  cd C:\Users\corat\IdeaProjects\raueberbude\backend\nest-app" -ForegroundColor White
Write-Host "  npm run start:dev`n" -ForegroundColor White

Write-Host "Warte, bis in den Logs erscheint:" -ForegroundColor Yellow
Write-Host "  [HaBootstrapService] Bootstrap-Import erfolgreich" -ForegroundColor Gray
Write-Host "  [HaSyncService] Synced X/Y`n" -ForegroundColor Gray

$continue = Read-Host "Drücke ENTER, wenn die App läuft und HA-Daten synchronisiert wurden"

# Schritt 4: Collections migrieren
Write-Host "`nSchritt 4: Collections migrieren..." -ForegroundColor Yellow
node scripts/step2_migrate_collections.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Fehler bei der Migration!" -ForegroundColor Red
    exit 1
}

# Schritt 5: Verifikation
Write-Host "`nSchritt 5: Verifikation..." -ForegroundColor Yellow
node scripts/compare_collections_counts.js

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     Migration abgeschlossen! ✅                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Die App arbeitet jetzt mit MariaDB." -ForegroundColor Green
Write-Host "MongoDB kann deaktiviert werden, wenn alles funktioniert.`n" -ForegroundColor Green

