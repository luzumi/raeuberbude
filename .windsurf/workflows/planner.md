---
description: Planungsagent – Anforderungen klären, Plan erstellen, YouTrack-Issue erzeugen und an Coding-Agent übergeben
---

## Rolle: Planungsagent

Analysiert eine grobe Anforderung, stellt gezielte Rückfragen, entwirft einen Umsetzungsplan und erzeugt nach Freigabe ein YouTrack-Issue. Anschließend Übergabe an den Coding-Agent (`/issue-worker`).

## User Input

```text
$ARGUMENTS
```

Freitext-Beschreibung der Anforderung. Optional: Priorität, Akzeptanzkriterien.

## Ziel

- **Anforderungen präzisieren** und offene Punkte klären
- **Umsetzungsplan** vorschlagen (inkl. Teststrategie)
- **YouTrack-Issue** erstellen (Plan, Akzeptanzkriterien, DoD)
- **Handover** an Coding-Agent (`/issue-worker`)

## Ablauf

### 1) Anforderung analysieren und Rückfragen stellen

Formuliere maximal 5 präzise Rückfragen, um Unklarheiten zu beseitigen.

Beispiele:
- Welche Benutzerrollen sind betroffen?
- Gibt es bestehende Komponenten/Services zur Wiederverwendung?
- Welche Edge Cases sind kritisch (Timeouts, Offline, Fehlerfälle)?
- Gewünschte Testabdeckung (Unit, E2E) und Definition of Done?
- Priorität/Deadline?

Iteriere 1–2 Runden, bis die Details klar sind.

### 2) Plan vorschlagen und Bestätigung einholen

Strukturiere den Vorschlag:
- Zielsetzung und Scope
- Architektur-Änderungen (Frontend/Backend)
- Arbeitspakete (30–90 Min pro Paket, schätzbar)
- Teststrategie (Unit, E2E, Coverage ≥ 80%)
- Risiken/Alternativen
- Definition of Done

Bitte um Bestätigung: „Plan freigeben?“ (Ja/Nein; Änderungswünsche?)

### 3) YouTrack-Issue erstellen (nach Freigabe)

Baue ein Issue mit Summary, Description (inkl. Plan/DoD), Type und Priority.

Option A – Direkte REST-API (PowerShell):
```powershell
$summary = $env:SUMMARY
$description = $env:DESCRIPTION  # Enthält Plan, Kriterien, DoD
$priority = $env:PRIORITY        # z.B. High

$token = $env:YOUTRACK_API_TOKEN
$base = "https://luzumi.youtrack.cloud"
$projectShort = $env:YOUTRACK_PROJECT_SHORTNAME

$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json'; 'Accept' = 'application/json' }

# Projekt-ID via ShortName ermitteln
$projects = Invoke-RestMethod -Uri "$base/api/projects?fields=id,shortName" -Headers $headers
$projectId = ($projects | Where-Object { $_.shortName -eq $projectShort }).id

$body = @{
  project = @{ id = $projectId }
  summary = $summary
  description = $description
  customFields = @(
    @{ name = 'Type'; '$type' = 'SingleEnumIssueCustomField'; value = @{ name = 'Feature' } }
    if ($priority) { @{ name = 'Priority'; '$type' = 'SingleEnumIssueCustomField'; value = @{ name = $priority } } }
  )
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri "$base/api/issues" -Method POST -Headers $headers -Body $body
$issueId = $response.idReadable
Write-Output "✅ Issue erstellt: $issueId"
```

Option B – Über lokalen Helper (`youtrack-mcp-server.js` auf 5180):
```powershell
Invoke-RestMethod -Uri "http://localhost:5180/issues" -Method POST -Body (@{
  summary = $env:SUMMARY
  description = $env:DESCRIPTION
  type = 'Feature'
} | ConvertTo-Json) -ContentType 'application/json'
```

Füge optional einen Kommentar mit Links/Artefakten hinzu:
```powershell
Invoke-RestMethod -Uri "$base/api/issues/$issueId/comments" -Method POST -Headers $headers -Body (@{ text = $env:COMMENT } | ConvertTo-Json) -ContentType 'application/json'
```

### 4) Übergabe an Coding-Agent

Starte den Coding-Agent mit der Issue-ID:
```powershell
/issue-worker $issueId
```

Optional: Setze Status „In Progress“.
```powershell
$stateBody = @{ customFields = @(@{ name='State'; '$type'='StateIssueCustomField'; value=@{ name='In Progress' } }) } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "$base/api/issues/$issueId" -Method POST -Headers $headers -Body $stateBody -ContentType 'application/json'
```

## Erfolgskriterien
- **Rückfragen geklärt** und dokumentiert
- **Plan freigegeben** vom Nutzer
- **YouTrack-Issue erstellt** (Plan, Kriterien, DoD)
- **Coding-Agent gestartet** und Status aktualisiert

## Context

$ARGUMENTS
