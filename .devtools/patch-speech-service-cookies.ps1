Param()
$ErrorActionPreference = 'Stop'

$path = "C:\Users\corat\IdeaProjects\raueberbude\src\app\core\services\speech.service.ts"
if (!(Test-Path $path)) { throw "File not found: $path" }

$backup = "$path.bak-cookies-" + (Get-Date -Format 'yyyyMMddHHmmss')
Copy-Item $path $backup

$content = Get-Content $path -Raw

# Add withCredentials to terminals/register
$patternReg = "this\.http\.post\(\s*`\$\{this\.apiUrl\}/terminals/register`\s*,\s*terminalData\s*\)"
if ($content -match $patternReg) {
  $content = [Regex]::Replace($content, $patternReg, 'this.http.post(`${this.apiUrl}/terminals/register`, terminalData, { withCredentials: true })')
}

# Add withCredentials to input posts (both speech save and text submit)
$patternInput = "this\.http\.post\(\s*`\$\{this\.apiUrl\}/input`\s*,\s*inputData\s*\)"
if ($content -match $patternInput) {
  $content = [Regex]::Replace($content, $patternInput, 'this.http.post(`${this.apiUrl}/input`, inputData, { withCredentials: true })')
}

# Add withCredentials to transcribe
$patternTrans = "this\.http\.post<ServerTranscriptionResult>\(\s*`\$\{this\.apiUrl\}/transcribe`\s*,\s*formData\s*\)"
if ($content -match $patternTrans) {
  $content = [Regex]::Replace($content, $patternTrans, 'this.http.post<ServerTranscriptionResult>(`${this.apiUrl}/transcribe`, formData, { withCredentials: true })')
}

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "Patched cookies in: $path`nBackup: $backup"
