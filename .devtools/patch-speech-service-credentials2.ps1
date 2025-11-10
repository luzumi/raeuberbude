Param()
$ErrorActionPreference = 'Stop'

$path = "C:\Users\corat\IdeaProjects\raueberbude\src\app\core\services\speech.service.ts"
if (!(Test-Path $path)) { throw "File not found: $path" }

$backup = "$path.bak-cred2-" + (Get-Date -Format 'yyyyMMddHHmmss')
Copy-Item $path $backup

$content = Get-Content $path -Raw

# Helper to add withCredentials to HttpClient.post calls matching a pattern
function Add-WithCredentials {
  param(
    [string]$content,
    [string]$pattern
  )
  return [Regex]::Replace($content, $pattern, { param($m)
    $before = $m.Groups[1].Value
    $args = $m.Groups[2].Value
    # Wenn bereits withCredentials vorhanden, nichts tun
    if ($args -match 'withCredentials\s*:\s*true') { return $m.Value }
    # drittes Argument einsetzen
    if ($args.Trim().EndsWith(")") -or $args.Trim().EndsWith("'})")) {
      return $before + $args.TrimEnd(')') + ", { withCredentials: true })"
    } else {
      return $before + $args + ", { withCredentials: true })"
    }
  }, [System.Text.RegularExpressions.RegexOptions]::Singleline)
}

# Pattern 1: this.http.post(`${this.apiUrl}/terminals/register`, terminalData)
$pattern1 = '(this\.http\.post\()([^)]*?/terminals/register[^)]*\))'
$content = Add-WithCredentials -content $content -pattern $pattern1

# Pattern 2: this.http.post(`${this.apiUrl}/input`, inputData)
$pattern2 = '(this\.http\.post\()([^)]*?/input[^)]*\))'
$content = Add-WithCredentials -content $content -pattern $pattern2

# Pattern 3: this.http.post<ServerTranscriptionResult>(`${this.apiUrl}/transcribe`, formData)
$pattern3 = '(this\.http\.post<ServerTranscriptionResult>\()([^)]*?/transcribe[^)]*\))'
$content = Add-WithCredentials -content $content -pattern $pattern3

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "Patched credentials(2) in: $path`nBackup: $backup"
