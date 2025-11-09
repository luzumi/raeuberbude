---
description: Vollständige KI-Agenten-Orchestrierung für den Softwareentwicklungsprozess von Anforderung bis Deployment
---

# Agent Orchestration Workflow

Dieser Workflow orchestriert das komplette KI-Agenten-Team und steuert den Softwareentwicklungsprozess von der Anforderungserfassung bis zum Deployment.

## Voraussetzungen

1. **MCP-Server starten**
```bash
cd .specify/mcp-servers/
npm run all
```

2. **Verfügbare Services prüfen**
- Orchestrator: http://localhost:4300
- YouTrack MCP: http://localhost:5180  
- Web MCP: http://localhost:4200

## Workflow-Schritte

### 1. Anforderungserfassung (Product Owner Team)
**Agent:** Product Owner Agent  
**Endpunkt:** POST http://localhost:4300/agents/product-owner/requirements

```bash
curl -X POST http://localhost:4300/agents/product-owner/requirements \
  -H "Content-Type: application/json" \
  -d '{
    "type": "COLLECT_REQUIREMENTS",
    "payload": {
      "source": "user_input",
      "description": "${REQUIREMENT_DESCRIPTION}"
    }
  }'
```

**Ausgabe:** User Stories mit Acceptance Criteria  
**Status-Check:** GET http://localhost:4300/agents/product-owner/status/{taskId}

### 2. Backlog-Management
**Agent:** Backlog Manager Agent  
**Endpunkt:** POST http://localhost:4300/agents/planning/backlog

```bash
curl -X POST http://localhost:4300/agents/planning/backlog \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PRIORITIZE_BACKLOG",
    "payload": {
      "user_stories": "${USER_STORIES}",
      "priority_criteria": ["business_value", "complexity", "dependencies"]
    }
  }'
```

**Ausgabe:** Priorisiertes Backlog mit YouTrack-Tickets  
**Übergabe an:** Sprint Planning Agent

### 3. Sprint-Planung
**Agent:** Sprint Planning Agent  
**Endpunkt:** POST http://localhost:4300/agents/planning/sprint

```bash
curl -X POST http://localhost:4300/agents/planning/sprint \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PLAN_SPRINT",
    "payload": {
      "backlog_items": "${PRIORITIZED_BACKLOG}",
      "sprint_duration": 14,
      "team_capacity": "${TEAM_CAPACITY}"
    }
  }'
```

**Ausgabe:** Sprint-Plan mit Task-Zuweisungen  
**YouTrack-Integration:** Automatische Task-Erstellung

### 4. Feature-Entwicklung (Coding Team)
**Leader:** Coding Team Leader  
**Orchestrierung:** Parallele Entwicklung durch spezialisierte Agenten

```bash
# Frontend-Entwicklung
curl -X POST http://localhost:4300/agents/coding/frontend \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DEVELOP_FEATURE",
    "payload": {
      "task_id": "${TASK_ID}",
      "specifications": "${FEATURE_SPEC}",
      "design_requirements": "${UI_DESIGN}"
    }
  }'

# Backend-Entwicklung (parallel)
curl -X POST http://localhost:4300/agents/coding/backend \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DEVELOP_API",
    "payload": {
      "task_id": "${TASK_ID}",
      "api_spec": "${API_SPECIFICATION}",
      "database_schema": "${DB_SCHEMA}"
    }
  }'
```

**Status-Synchronisation:** WebSocket auf ws://localhost:4300/coding-status  
**Checkpoint:** Code-Commit in Feature-Branch

### 5. Code Review
**Agent:** Code Review Team  
**Endpunkt:** POST http://localhost:4300/agents/review/code

```bash
curl -X POST http://localhost:4300/agents/review/code \
  -H "Content-Type: application/json" \
  -d '{
    "type": "REVIEW_CODE",
    "payload": {
      "branch": "${FEATURE_BRANCH}",
      "review_criteria": ["style", "security", "logic", "performance"],
      "auto_fix": true
    }
  }'
```

**Decision Gate:**
- ✅ Approved → Weiter zu Testing
- ❌ Changes Required → Zurück zu Coding Team
- ⚠️ Minor Issues → Auto-Fix und erneute Prüfung

### 6. Testing Phase
**Leader:** Testing Team Leader  
**Sequenz:** Unit → Integration → E2E

```bash
# Unit Tests
curl -X POST http://localhost:4300/agents/testing/unit \
  -H "Content-Type: application/json" \
  -d '{
    "type": "RUN_UNIT_TESTS",
    "payload": {
      "branch": "${FEATURE_BRANCH}",
      "coverage_threshold": 80
    }
  }'

# E2E Tests mit Web MCP
curl -X POST http://localhost:4200/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "headless": false,
    "viewport": {"width": 1920, "height": 1080}
  }'

# Test-Ausführung
curl -X POST http://localhost:4300/agents/testing/e2e \
  -H "Content-Type: application/json" \
  -d '{
    "type": "RUN_E2E_TESTS",
    "payload": {
      "test_suite": "${TEST_SUITE}",
      "web_mcp_session": "${SESSION_ID}",
      "screenshot_on_failure": true
    }
  }'
```

**Fehlerbehandlung:** Automatische Bug-Report-Erstellung

### 7. Bug Management
**Agent:** Bug Report Agent  
**Endpunkt:** POST http://localhost:4300/agents/testing/bug-report

```bash
curl -X POST http://localhost:4300/agents/testing/bug-report \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CREATE_BUG_REPORT",
    "payload": {
      "test_results": "${TEST_RESULTS}",
      "severity": "auto_detect",
      "youtrack_project": "LUD28",
      "assign_to_team": "auto"
    }
  }'
```

**Rückkopplungsschleife:**
- Critical Bugs → Sprint Planning (Re-Priorisierung)
- Minor Bugs → Coding Team (Hotfix)
- Known Issues → Documentation Team

### 8. Build & Deployment
**Agent:** DevOps Team  
**Endpunkt:** POST http://localhost:4300/agents/devops/deploy

```bash
# Build-Prozess
curl -X POST http://localhost:4300/agents/devops/build \
  -H "Content-Type: application/json" \
  -d '{
    "type": "BUILD_RELEASE",
    "payload": {
      "branch": "${FEATURE_BRANCH}",
      "environment": "staging",
      "build_config": {
        "optimization": true,
        "source_maps": false,
        "docker": true
      }
    }
  }'

# Deployment (nach menschlicher Freigabe)
curl -X POST http://localhost:4300/agents/devops/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DEPLOY_RELEASE",
    "payload": {
      "build_id": "${BUILD_ID}",
      "environment": "production",
      "deployment_strategy": "blue_green",
      "rollback_enabled": true
    }
  }'
```

**Human Checkpoint:** Release-Freigabe erforderlich

### 9. System-Überwachung
**Agent:** Integration & Monitoring Agent  
**Endpunkt:** POST http://localhost:4300/agents/integration/monitor

```bash
curl -X POST http://localhost:4300/agents/integration/monitor \
  -H "Content-Type: application/json" \
  -d '{
    "type": "START_MONITORING",
    "payload": {
      "deployment_id": "${DEPLOYMENT_ID}",
      "metrics": ["performance", "errors", "usage"],
      "alert_thresholds": {
        "error_rate": 0.01,
        "response_time": 2000,
        "cpu_usage": 80
      },
      "auto_healing": true
    }
  }'
```

**Self-Healing:** Automatischer Rollback bei kritischen Metriken

## Status-Tracking & Reporting

### Zentrale Status-Abfrage
```bash
curl -X GET http://localhost:4300/orchestrator/status \
  -H "Content-Type: application/json"
```

### Task-Historie
```bash
curl -X GET http://localhost:4300/orchestrator/tasks?sprint=${SPRINT_ID}
```

### YouTrack-Synchronisation
```bash
curl -X POST http://localhost:5180/issues/sync \
  -H "Content-Type: application/json" \
  -d '{
    "project": "LUD28",
    "sync_direction": "bidirectional"
  }'
```

## Fehlerbehandlung & Rückkopplungsschleifen

### Automatische Retry-Logik
```javascript
const retryConfig = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelay: 1000,
  maxDelay: 30000
};
```

### Eskalationspfade
1. **Level 1:** Agent-interner Retry
2. **Level 2:** Team-Leader-Intervention  
3. **Level 3:** Orchestrator-Neuplanung
4. **Level 4:** Menschliche Intervention

## Kommunikationsprotokoll

### MCP-Context-Sharing
```json
{
  "context_id": "sprint_${SPRINT_ID}",
  "shared_data": {
    "requirements": {},
    "user_stories": [],
    "tasks": [],
    "code_changes": [],
    "test_results": {},
    "deployment_status": {}
  },
  "access_control": {
    "read": ["all_agents"],
    "write": ["team_leaders", "orchestrator"]
  }
}
```

### Event-Stream für Echtzeit-Updates
```bash
# SSE-Verbindung für Live-Updates
curl -N -H "Accept: text/event-stream" \
  http://localhost:4300/orchestrator/events
```

## Metriken & KPIs

### Automatisch erfasste Metriken
- **Velocity:** Story Points pro Sprint
- **Cycle Time:** Anforderung bis Deployment
- **Bug Rate:** Bugs pro Feature
- **Test Coverage:** Code-Abdeckung in %
- **Deployment Frequency:** Releases pro Woche
- **MTTR:** Mean Time To Recovery

### Dashboard-Zugriff
```bash
# Öffne Metriken-Dashboard
start http://localhost:4300/dashboard
```

## Vollautomatischer Modus

### One-Click-Deployment
```bash
# Startet kompletten Workflow automatisch
curl -X POST http://localhost:4300/orchestrator/auto-deploy \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": "${REQUIREMENTS}",
    "mode": "full_auto",
    "human_checkpoints": ["code_review", "release"],
    "target_environment": "production"
  }'
```

## Troubleshooting

### Agent-Health-Check
```bash
curl -X GET http://localhost:4300/orchestrator/health
```

### Log-Aggregation
```bash
# Alle Agent-Logs der letzten Stunde
curl -X GET "http://localhost:4300/logs?since=1h&level=error"
```

### MCP-Server-Neustart
```bash
cd .specify/mcp-servers/
npm run restart:all
```

## Beispiel-Ausführung

```bash
# 1. Neue Feature-Anforderung
REQUIREMENT="Implementiere eine digitale Uhr mit Sekundenanzeige"

# 2. Starte Orchestrierung
TASK_ID=$(curl -X POST http://localhost:4300/orchestrator/start \
  -H "Content-Type: application/json" \
  -d "{\"requirement\": \"$REQUIREMENT\"}" | jq -r '.task_id')

# 3. Verfolge Fortschritt
watch -n 2 "curl -s http://localhost:4300/orchestrator/tasks/$TASK_ID/status | jq"

# 4. Prüfe Deployment-Status
curl http://localhost:4300/orchestrator/tasks/$TASK_ID/deployment
```

## Notizen

- Alle Agenten arbeiten asynchron und event-getrieben
- WebSocket-Verbindungen ermöglichen Echtzeit-Koordination
- YouTrack-Integration synchronisiert automatisch alle Tickets
- Web MCP ermöglicht reale Browser-Tests auf http://localhost:4200
- Self-Healing-Mechanismen greifen bei Ausfällen automatisch
