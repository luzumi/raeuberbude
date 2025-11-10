Param()
$ErrorActionPreference = 'Stop'

$path = "C:\Users\corat\IdeaProjects\raueberbude\src\app\core\services\speech.service.ts"
if (!(Test-Path $path)) { throw "File not found: $path" }

$backup = "$path.bak-" + (Get-Date -Format 'yyyyMMddHHmmss')
Copy-Item $path $backup

$content = Get-Content $path -Raw

# 1) Add metadata field to HumanInputData interface (if missing)
$pattern1 = '(?s)(interface\s+HumanInputData\s*\{.*?context\?:\s*\{.*?confidence\?:\s*number;\s*\};\s*)(\})'
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern1, { param($m)
    $m.Groups[1].Value + "  metadata?: Record<string, any>;" + [Environment]::NewLine + $m.Groups[2].Value
})

# 2) Add timing fields after persistResult (only if not already present)
if ($content -notmatch 'browserRecStartAt') {
  $pattern2 = 'private\s+persistResult\s*=\s*true;'
  $content = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern2, { param($m)
    $m.Value + [Environment]::NewLine + [Environment]::NewLine +
    "  // Timing-Felder" + [Environment]::NewLine +
    "  private browserRecStartAt?: number;" + [Environment]::NewLine +
    "  private browserRecRealStart?: number;" + [Environment]::NewLine +
    "  private serverRecStartAt?: number;" + [Environment]::NewLine +
    "  private serverRecRealStart?: number;"
  })
}

# 3) Insert browser start timestamps after wait(350)
if ($content -notmatch 'browserRecStartAt\s*=\s*performance\.now\(') {
  $pattern3 = 'await this\.wait\(350\);\s*'
  $content = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern3, { param($m)
    $m.Value +
    "      // Start-Timestamps für Browser-STT erfassen" + [Environment]::NewLine +
    "      this.browserRecStartAt = performance.now();" + [Environment]::NewLine +
    "      this.browserRecRealStart = Date.now();" + [Environment]::NewLine
  })
}

# 4) Replace simple onresult final save call with metrics-aware call
if ($content -notmatch 'transcriptionDurationMs') {
  $pattern4 = 'this\.lastInputSubject\.next\(transcript\);\s*\r?\n\s*this\.saveToDatabase\(transcript,\s*confidence\);'
  $content = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern4, { param($m)
    "this.lastInputSubject.next(transcript);" + [Environment]::NewLine +
    "        const audioMs = this.browserRecStartAt ? Math.round(performance.now() - this.browserRecStartAt) : undefined;" + [Environment]::NewLine +
    "        const transcriptionMs = audioMs;" + [Environment]::NewLine +
    "        this.saveToDatabase(transcript, confidence, {" + [Environment]::NewLine +
    "          audioDurationMs: audioMs," + [Environment]::NewLine +
    "          transcriptionDurationMs: transcriptionMs," + [Environment]::NewLine +
    "          provider: 'web-speech'," + [Environment]::NewLine +
    "          language: this.recognition?.lang," + [Environment]::NewLine +
    "          sttMode: 'browser'," + [Environment]::NewLine +
    "          recordingStartedAt: this.browserRecRealStart," + [Environment]::NewLine +
    "          clientNow: Date.now()," + [Environment]::NewLine +
    "        });"
  })
}

# 5) Replace saveToDatabase method with metrics + fire-and-forget
$startIdx = $content.IndexOf('private async saveToDatabase(')
if ($startIdx -ge 0) {
  $endToken = 'private async registerTerminal('
  $endIdx = $content.IndexOf($endToken, $startIdx)
  if ($endIdx -gt 0) {
    $before = $content.Substring(0, $startIdx)
    $after = $content.Substring($endIdx)
    $newMethod = @"
  private saveToDatabase(
    transcript: string,
    confidence: number,
    metrics?: {
      audioDurationMs?: number;
      transcriptionDurationMs?: number;
      provider?: string;
      language?: string;
      sttMode?: STTMode;
      recordingStartedAt?: number;
      clientNow?: number;
    }
  ): void {
    const userId = this.getCurrentUserId();

    if (!userId) {
      console.error('No user ID available');
      return;
    }

    const termId = this.terminalId;
    const isMongoId = /^[a-fA-F0-9]{24}$/.test(termId || '');

    const inputData: HumanInputData = {
      userId,
      ...(isMongoId ? { terminalId: termId } : {}) as any,
      inputText: transcript,
      inputType: 'speech',
      context: {
        location: window.location.pathname,
        device: this.getDeviceType(),
        browser: navigator.userAgent.substring(0, 100),
        sessionId: this.sessionId,
        confidence
      },
      metadata: {
        stt: {
          provider: metrics?.provider || (this.isServerRecording ? 'server' : 'web-speech'),
          mode: metrics?.sttMode || this.sttMode,
          language: metrics?.language,
        },
        metrics: {
          audioDurationMs: metrics?.audioDurationMs,
          transcriptionDurationMs: metrics?.transcriptionDurationMs,
          confidence,
        },
        clientTimestamps: {
          startedAt: metrics?.recordingStartedAt || null,
          savedAt: metrics?.clientNow || Date.now(),
        },
        ...(isMongoId ? {} : { terminalIdString: termId }),
      } as any
    };

    lastValueFrom(this.http.post(`${this.apiUrl}/input`, inputData))
      .then(() => console.log('Speech input save queued/sent'))
      .catch((error) => console.error('Failed to save speech input:', error));
  }

"@
    $content = $before + $newMethod + $after
  }
}

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "Patched: $path`nBackup: $backup"
