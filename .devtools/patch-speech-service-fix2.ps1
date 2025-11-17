Param()
$ErrorActionPreference = 'Stop'

$path = "C:\Users\corat\IdeaProjects\raueberbude\src\app\core\services\speech.service.ts"
if (!(Test-Path $path)) { throw "File not found: $path" }

$backup = "$path.bak2-" + (Get-Date -Format 'yyyyMMddHHmmss')
Copy-Item $path $backup

$content = Get-Content $path -Raw

# A) Ensure timing fields exist
if ($content -notmatch 'private\s+browserRecStartAt\?') {
  $content = $content -replace 'private\s+persistResult\s*=\s*true;[^\r\n]*', { param($m)
    $m.Value + "`r`n`r`n  // Timing-Felder`r`n  private browserRecStartAt?: number;`r`n  private browserRecRealStart?: number;`r`n  private serverRecStartAt?: number;`r`n  private serverRecRealStart?: number;"
  }
}

# B) Replace first onresult final save call with metrics-aware call
$patternOnResult = 'this\.lastInputSubject\.next\(transcript\);\s*\r?\n\s*this\.saveToDatabase\(transcript,\s*confidence\);'
$replacementOnResult = @"
this.lastInputSubject.next(transcript);
        const audioMs = this.browserRecStartAt ? Math.round(performance.now() - this.browserRecStartAt) : undefined;
        const transcriptionMs = audioMs;
        this.saveToDatabase(transcript, confidence, {
          audioDurationMs: audioMs,
          transcriptionDurationMs: transcriptionMs,
          provider: 'web-speech',
          language: this.recognition?.lang,
          sttMode: 'browser',
          recordingStartedAt: this.browserRecRealStart,
          clientNow: Date.now(),
        });
"@
$content = [Regex]::Replace($content, $patternOnResult, $replacementOnResult, [System.Text.RegularExpressions.RegexOptions]::Singleline)

# C) Fix missing backticks in http.post template string
$content = $content -replace 'lastValueFrom\(this\.http\.post\(\$\{this\.apiUrl\}/input,\s*inputData\)\)', 'lastValueFrom(this.http.post(``${this.apiUrl}/input``, inputData))'

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "Patched (fix2): $path`nBackup: $backup"
