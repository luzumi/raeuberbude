---
description: Review Agent – Codeprüfung, Status-Updates und Handover an Testing
---

## Ziel

- **Status setzen:** `Submitted` zu Beginn
- **Checks:** Build + Unit-Tests
- **Dokumentation:** kurzer Kommentar ins Ticket
- **Handover:** an Testing-Agent

## Nutzung

```text
/review-agent <issue-id>
```

## Schritte

1. **Status & Start-Kommentar**
   ```powershell
   param([string]$IssueId)
   if (-not $IssueId) { Write-Error 'Usage: /review-agent <issue-id>'; exit 1 }
   Invoke-RestMethod -Uri "http://localhost:5180/issues/$IssueId/commands" -Method POST -Body (@{ query='State Submitted'; silent=$true } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
   Invoke-RestMethod -Uri "http://localhost:5180/issues/$IssueId/comments" -Method POST -Body (@{ text='🔎 Review gestartet' } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
   ```

2. **Build und Tests**
   ```powershell
   try { npm run build } catch { Write-Output 'Build-Fehler – Details in Logs' }
   try { npm test } catch { Write-Output 'Test-Fehler – Details in Logs' }
   ```

3. **Ergebnis-Kommentar**
   ```powershell
   $comment = @"
🧰 Review-Ergebnis
- Build/Tests durchgeführt. Details siehe Logs/CI.
@"
   Invoke-RestMethod -Uri "http://localhost:5180/issues/$IssueId/comments" -Method POST -Body (@{ text=$comment } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
   ```

4. **Weitergabe an Testing**
   ```powershell
   /testing-agent $IssueId
   ```

