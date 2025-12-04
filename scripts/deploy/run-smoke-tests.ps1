#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Smoke-Test-Skript für Staging-Deployment

.DESCRIPTION
    Führt automatisierte Smoke-Tests für die MongoDB-zu-MariaDB-Migration durch.
    Validiert API-Endpoints, Datenintegrität und Performance.

.PARAMETER ApiUrl
    Base-URL der API (Standard: http://localhost:3001)

.PARAMETER Verbose
    Detaillierte Ausgabe

.EXAMPLE
    .\run-smoke-tests.ps1
    .\run-smoke-tests.ps1 -ApiUrl "https://staging.example.com" -Verbose
#>

param(
    [string]$ApiUrl = 'http://localhost:3002',
    [switch]$Verbose
)

# Set error handling and initialize variables
$ErrorActionPreference = 'Continue'
$testResults = @()

<#
.SYNOPSIS
    Schreibt das Testergebnis in die Konsole und speichert es für die spätere Auswertung.
.DESCRIPTION
    Diese Funktion formatiert und zeigt Testergebnisse in der Konsole an und speichert sie
    in einem Array für die spätere Zusammenfassung.
#>
function Write-TestResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$TestName,

        [Parameter(Mandatory=$true)]
        [bool]$Passed,

        [string]$Message = '',
        [int]$Duration = 0
    )

    $result = @{
        Test = $TestName
        Passed = $Passed
        Message = $Message
        Duration = $Duration
    }

    $script:testResults += $result
    $status = if ($Passed) { 'PASS' } else { 'FAIL' }
    $color = if ($Passed) { 'Green' } else { 'Red' }

    Write-Host ("[{0}] {1}" -f $status, $TestName) -ForegroundColor $color

    if ($Message -and ($Verbose -or -not $Passed)) {
        Write-Host "    $Message" -ForegroundColor Gray
    }

    if ($Duration -gt 0 -and $Verbose) {
        Write-Host "    Duration: ${Duration}ms" -ForegroundColor Gray
    }
}

<#
.SYNOPSIS
    Testet einen API-Endpunkt auf Verfügbarkeit und Antwortzeit.
.DESCRIPTION
    Sendet eine GET-Anfrage an den angegebenen Endpunkt und prüft den HTTP-Statuscode.
#>
function Test-Endpoint {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,

        [Parameter(Mandatory=$true)]
        [string]$Endpoint,

        [int]$ExpectedStatus = 200
    )

    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri ($ApiUrl + $Endpoint) -Method Get -TimeoutSec 10 -ErrorAction Stop
        $stopwatch.Stop()

        $passed = $response.StatusCode -eq $ExpectedStatus
        $message = 'Status: {0}, Duration: {1}ms' -f $response.StatusCode, $stopwatch.ElapsedMilliseconds

        Write-TestResult -TestName $Name -Passed $passed -Message $message -Duration $stopwatch.ElapsedMilliseconds
        return $response
    }
    catch {
        Write-TestResult -TestName $Name -Passed $false -Message ("Error: {0}" -f $_.Exception.Message)
        return $null
    }
}

<#
.SYNOPSIS
    Überprüft, ob die Antwort gültiges JSON enthält und optional eine bestimmte Eigenschaft vorhanden ist.
#>
function Test-JsonResponse {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,

        [Parameter(Mandatory=$true)]
        [object]$Response,

        [string]$ExpectedProperty = $null
    )

    if ($null -eq $Response) {
        Write-TestResult -TestName $Name -Passed $false -Message 'Response is null'
        return $false
    }

    try {
        $json = $Response.Content | ConvertFrom-Json

        if ($ExpectedProperty) {
            $passed = ($null -ne $json.$ExpectedProperty)
            $message = if ($passed) {
                "Property '$ExpectedProperty' found"
            } else {
                "Property '$ExpectedProperty' missing"
            }
        }
        else {
            $passed = $true
            $message = 'Valid JSON response'
        }

        Write-TestResult -TestName $Name -Passed $passed -Message $message
        return $json
    }
    catch {
        Write-TestResult -TestName $Name -Passed $false -Message ("Invalid JSON: {0}" -f $_.Exception.Message)
        return $null
    }
}

<#
.SYNOPSIS
    Testet die Verbindung zur Datenbank (MariaDB oder MongoDB).
#>
function Test-DatabaseConnection {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet('MariaDB', 'MongoDB')]
        [string]$DbType
    )

    try {
        $endpoint = if ($DbType -eq 'MariaDB') { '/health/db' } else { '/health/mongo' }
        $response = Invoke-RestMethod -Uri ($ApiUrl + $endpoint) -Method Get -TimeoutSec 5 -ErrorAction Stop
        $passed = $response.database.status -eq 'up'

        Write-TestResult -TestName "$DbType Connection" -Passed $passed `
            -Message ("Database status: {0}" -f $response.database.status)

        return $passed
    }
    catch {
        Write-TestResult -TestName "$DbType Connection" -Passed $false `
            -Message ("Connection failed: {0}" -f $_.Exception.Message)
        return $false
    }
}

<#
.SYNOPSIS
    Überprüft die Datenintegrität durch Abfrage der Dokumentenanzahl.
#>
function Test-DataIntegrity {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Collection,

        [Parameter(Mandatory=$true)]
        [string]$CountEndpoint
    )

    try {
        $response = Invoke-RestMethod -Uri ($ApiUrl + $CountEndpoint) -Method Get -TimeoutSec 10 -ErrorAction Stop
        $count = $response.count
        $passed = $count -gt 0

        Write-TestResult -TestName ("Data Integrity: {0}" -f $Collection) `
            -Passed $passed -Message ("Count: {0}" -f $count)

        return $count
    }
    catch {
        Write-TestResult -TestName ("Data Integrity: {0}" -f $Collection) `
            -Passed $false -Message ("Count failed: {0}" -f $_.Exception.Message)
        return 0
    }
}

<#
.SYNOPSIS
    Misst die Antwortzeit eines Endpunkts und prüft, ob sie unter einem Schwellenwert liegt.
#>
function Test-Performance {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Endpoint,

        [int]$MaxResponseTime = 500
    )

    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $null = Invoke-WebRequest -Uri ($ApiUrl + $Endpoint) -Method Get -TimeoutSec 5 -ErrorAction Stop
        $stopwatch.Stop()

        $passed = $stopwatch.ElapsedMilliseconds -lt $MaxResponseTime

        Write-TestResult -TestName ("Performance: {0}" -f $Endpoint) `
            -Passed $passed `
            -Message ("Response time: {0}ms" -f $stopwatch.ElapsedMilliseconds)

        return $passed
    }
    catch {
        Write-TestResult -TestName ("Performance: {0}" -f $Endpoint) `
            -Passed $false `
            -Message ("Request failed: {0}" -f $_.Exception.Message)
        return $false
    }
}

# ============================================================================
# MAIN TEST SUITE
# ============================================================================

Write-Host ('`nStaging Smoke Tests - API: {0}' -f $ApiUrl) -ForegroundColor Cyan

# Test 1: Basic Health Check
$healthResponse = Test-Endpoint -Name 'Health Check' -Endpoint '/health'
if ($healthResponse) { Test-JsonResponse -Name 'Health Response JSON' -Response $healthResponse -ExpectedProperty 'status' }

# Test 2: Database Connections
Test-DatabaseConnection -DbType 'MariaDB'

# Test 3: Critical API Endpoints
$usersResponse = Test-Endpoint -Name 'GET /users' -Endpoint '/users'
$terminalsResponse = Test-Endpoint -Name 'GET /terminals' -Endpoint '/terminals'
$transcriptsResponse = Test-Endpoint -Name 'GET /transcripts' -Endpoint '/transcripts?limit=10'
$haEntitiesResponse = Test-Endpoint -Name 'GET /ha-entities' -Endpoint '/ha-entities'

# Test 4: Data Integrity
$userCount = Test-DataIntegrity -Collection 'Users' -CountEndpoint '/users/count'
$transcriptCount = Test-DataIntegrity -Collection 'Transcripts' -CountEndpoint '/transcripts/count'

# Test 5: Performance
Test-Performance -Endpoint '/health' -MaxResponseTime 500
Test-Performance -Endpoint '/users' -MaxResponseTime 1000
Test-Performance -Endpoint '/transcripts?limit=10' -MaxResponseTime 1000

# Test 6: Error Handling
Test-Endpoint -Name '404 for unknown route' -Endpoint '/non-existent-endpoint' -ExpectedStatus 404

# Test 7: UUID Format Validation (Sample)
if ($usersResponse -and $usersResponse.Content) {
    try {
        $users = $usersResponse.Content | ConvertFrom-Json
        if ($users.Count -gt 0) {
            $sampleUser = $users[0]
            $uuidRegex = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
            $passed = $sampleUser.id -match $uuidRegex
            $message = "Sample User ID: $($sampleUser.id)"
            Write-TestResult -TestName "UUID Format Validation" -Passed $passed -Message $message
        }
    }
    catch {
        Write-TestResult -TestName "UUID Format Validation" -Passed $false -Message "Parsing error: $($_.Exception.Message)"
    }
}

# ============================================================================
# RESULTS SUMMARY
# ============================================================================

Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Passed }).Count
$failedTests = $totalTests - $passedTests
$successRate = if ($totalTests -gt 0) { [math]::Round(($passedTests / $totalTests) * 100, 2) } else { 0 }

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red

# compute color for success rate once to avoid inline subexpressions
$successColor = if ($successRate -ge 90) { 'Green' } elseif ($successRate -ge 70) { 'Yellow' } else { 'Red' }
Write-Host ("Success Rate: {0}%" -f $successRate) -ForegroundColor $successColor

if ($failedTests -gt 0) {
    Write-Host "`nFAILED TESTS:" -ForegroundColor Red
    $testResults | Where-Object { -not $_.Passed } | ForEach-Object {
        Write-Host "  - $($_.Test): $($_.Message)" -ForegroundColor Red
    }
}

Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan

# Export results to JSON
$resultsFile = "smoke-test-results-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"
$testResults | ConvertTo-Json -Depth 3 | Out-File $resultsFile
Write-Host ("Results saved to: {0}" -f $resultsFile) -ForegroundColor Gray

# Exit with appropriate code
$exitCode = if ($successRate -ge 80) { 0 } else { 1 }

if ($exitCode -eq 0) {
    Write-Host 'SMOKE TESTS PASSED - Deployment successful!' -ForegroundColor Green
}
else {
    Write-Host 'SMOKE TESTS FAILED - Review failed tests and consider rollback.' -ForegroundColor Red
}

exit $exitCode
