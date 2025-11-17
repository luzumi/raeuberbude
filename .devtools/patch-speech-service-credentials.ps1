Param()
$ErrorActionPreference = 'Stop'

$path = "C:\Users\corat\IdeaProjects\raueberbude\src\app\core\services\speech.service.ts"
if (!(Test-Path $path)) { throw "File not found: $path" }

$backup = "$path.bak-cred-" + (Get-Date -Format 'yyyyMMddHHmmss')
Copy-Item $path $backup

$content = Get-Content $path -Raw

# Terminals register: add withCredentials
$content = $content -replace [regex]::Escape('this.http.post(`${this.apiUrl}/terminals/register`, terminalData)'), 'this.http.post(`${this.apiUrl}/terminals/register`, terminalData, { withCredentials: true })'

# Input save (fire-and-forget)
$content = $content -replace [regex]::Escape('lastValueFrom(this.http.post(`${this.apiUrl}/input`, inputData))'), 'lastValueFrom(this.http.post(`${this.apiUrl}/input`, inputData, { withCredentials: true }))'

# Input submitTextInput (await)
$content = $content -replace [regex]::Escape('await lastValueFrom(this.http.post(`${this.apiUrl}/input`, inputData));'), 'await lastValueFrom(this.http.post(`${this.apiUrl}/input`, inputData, { withCredentials: true }));'

# Transcribe
$content = $content -replace [regex]::Escape('this.http.post<ServerTranscriptionResult>(`${this.apiUrl}/transcribe`, formData)'), 'this.http.post<ServerTranscriptionResult>(`${this.apiUrl}/transcribe`, formData, { withCredentials: true })'

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "Patched credentials in: $path`nBackup: $backup"
