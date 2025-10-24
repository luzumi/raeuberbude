param(
    [string]$IssueId,
    [string]$FilePath,
    [string]$McpServerUrl = "http://localhost:5180"
)

# Testet den Attachment-Upload an den YouTrack-MCP-Server.
# Lädt eine Testdatei an ein YouTrack-Issue an. Erstellt ggf. ein Test-Issue, falls keine Issue-ID angegeben.
# Parameter:
#  -IssueId   (z.B. "LUD-123"), optional – erstellt sonst automatisch ein Test-Issue
#  -FilePath  Pfad zur Datei, optional – erstellt sonst eine temporäre Datei
#  -McpServerUrl http://localhost:5180 (Standard)

 

# Konfiguration
$youtrackUrl = "https://luzumi.youtrack.cloud"

# Stelle sicher, dass System.Net.Http verfügbar ist (für HttpClient)
function Ensure-HttpClient {
    try {
        Add-Type -AssemblyName 'System.Net.Http' -ErrorAction Stop
    } catch {
        try {
            [void][System.Reflection.Assembly]::Load('System.Net.Http')
        } catch {
            throw "System.Net.Http konnte nicht geladen werden: $($_.Exception.Message)"
        }
    }
}

function New-TestIssue {
    param(
        [Parameter(Mandatory=$true)][string]$McpServerUrl,
        [Parameter(Mandatory=$true)][string]$YoutrackUrl
    )
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $issueBody = '{' +
      '"summary":"Attachment Upload Test",' +
      '"type":"Task",' +
      '"template":"automation",' +
      '"meta":{' +
        '"feature":"Attachment Upload",' +
        '"intent":"Validierung des Upload-Endpunkts",' +
        '"tasks":["Upload per MCP testen","Attachment im Cloud-Issue pruefen"],' +
        '"acceptanceCriteria":["Attachment sichtbar im Issue","Dateiname und Groesse korrekt"],' +
        '"context":{"env":"local","runner":"ps"}' +
      '},' +
      '"notes":"Erstellt am ' + $ts + '",' +
      '"commands":["State Open","Assignee me","tag Automation","tag Upload"]' +
    '}'

    try {
        $response = Invoke-RestMethod -Uri "$McpServerUrl/issues" -Method Post -Body $issueBody -ContentType 'application/json'
        $id = $response.idReadable
        if (-not $id) { $id = $response.id }
        if (-not $id) { throw "Keine Issue-ID erhalten" }
        Write-Host "[OK] Test-Issue erstellt: $YoutrackUrl/issue/$id"
        return $id
    } catch {
        throw $_
    }
}

# Temporäre Testdatei erstellen, falls keine angegeben
if (-not $FilePath -or -not (Test-Path $FilePath)) {
    $tempFile = [System.IO.Path]::GetTempFileName() + ".txt"
    "Testinhalt generiert am $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $tempFile -Encoding utf8
    $FilePath = $tempFile
    Write-Host "[Info] Keine gueltige Datei angegeben, verwende temporaere Datei: $FilePath"
}

# Issue erstellen, falls keine ID angegeben
if (-not $IssueId) {
    Write-Host "[Info] Keine Issue-ID angegeben, erstelle Test-Issue..."
    try {
        $IssueId = New-TestIssue -McpServerUrl $McpServerUrl -YoutrackUrl $youtrackUrl
    } catch {
        Write-Error "Fehler beim Erstellen des Test-Issues: $_"
        if ($_.ErrorDetails.Message) { Write-Host "Details: $($_.ErrorDetails.Message)" }
        exit 1
    }
}

# Datei hochladen (Multipart via .NET HttpClient)
try {
    Write-Host "[Upload] Lade Datei hoch: $FilePath"

    Ensure-HttpClient

    $handler = New-Object System.Net.Http.HttpClientHandler
    $client  = New-Object System.Net.Http.HttpClient($handler)
    $mp      = New-Object System.Net.Http.MultipartFormDataContent
    $fileStream = [System.IO.File]::OpenRead($FilePath)
    $streamContent = New-Object System.Net.Http.StreamContent($fileStream)
    $null = $streamContent.Headers.TryAddWithoutValidation('Content-Type', 'application/octet-stream')
    $fileName = [System.IO.Path]::GetFileName($FilePath)
    $mp.Add($streamContent, 'file', $fileName)

    $uri = "{0}/issues/{1}/attachments" -f $McpServerUrl, $IssueId
    $resp = $client.PostAsync($uri, $mp).Result
    if (-not $resp.IsSuccessStatusCode) { throw "HTTP $($resp.StatusCode) - $($resp.ReasonPhrase)" }
    $jsonText = $resp.Content.ReadAsStringAsync().Result
    $response = $jsonText | ConvertFrom-Json

    Write-Host "[OK] Datei erfolgreich hochgeladen!"
    Write-Host "   - Issue: $youtrackUrl/issue/$IssueId"
    Write-Host "   - Dateiname: $($response.attachment.name)"
    Write-Host "   - Groesse: $([math]::Round($response.attachment.size/1KB, 2)) KB"
    Write-Host "   - URL: $($response.attachment.url)"

} catch {
    Write-Error "Fehler beim Hochladen der Datei: $_"
    if ($_.ErrorDetails.Message) { Write-Host "Details: $($_.ErrorDetails.Message)" }
    exit 1
} finally {
    if ($streamContent) { $streamContent.Dispose() }
    if ($fileStream) { $fileStream.Dispose() }
    if ($mp) { $mp.Dispose() }
    if ($client) { $client.Dispose() }
    # Temporäre Datei löschen, falls wir sie erstellt haben
    if ($tempFile -and (Test-Path $tempFile)) {
        Remove-Item -Path $tempFile -Force
    }
}

Write-Host ""
Write-Host "[Hint] Befehl zum erneuten Hochladen (ersetze Platzhalter):"
Write-Host "   .\test-attachment-upload.ps1 -IssueId ISSUE_ID -FilePath PFAD_ZUR_DATEI"
