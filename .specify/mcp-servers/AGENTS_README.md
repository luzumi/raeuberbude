# Multi-Agent Orchestrator System

Ein hierarchisches Multi-Agenten-Team für professionelle Softwareentwicklung basierend auf dem Model Context Protocol (MCP).

## 🏗️ Systemarchitektur

### Hauptkomponenten

1. **Multi-Agent Orchestrator** (Port 4300)
   - Zentrale Koordination aller Agenten
   - Projekt- und Task-Management
   - Team-Orchestrierung

2. **YouTrack MCP Server** (Port 5180)
   - Issue-Tracking Integration
   - Sprint-Management
   - Bug-Reporting

3. **Web MCP Server** (Port 4200)
   - Browser-Automation
   - Frontend-Testing
   - Screenshot-Generierung

## 👥 Agent Teams

### 1. Product Owner Team
- **Leader**: Product Owner Leader
- **Members**:
  - Requirements Specialist
  - User Story Agent
  - Backlog Manager

### 2. Planning Team
- **Leader**: Planning Leader
- **Members**:
  - Sprint Planner
  - Task Prioritizer
  - Capacity Planner

### 3. Coding Team
- **Leader**: Coding Leader
- **Members**:
  - Frontend Specialist
  - Frontend Styling Specialist
  - Backend Specialist
  - MongoDB Specialist
  - Documentation Agent
  - Infrastructure Agent

### 4. Code Review Team
- **Leader**: Code Review Leader
- **Members**:
  - Style Check Agent
  - Security Audit Agent
  - Logic Validator

### 5. Testing Team
- **Leader**: Test Leader
- **Members**:
  - Unit Test Agent
  - Integration Test Agent
  - E2E Test Agent
  - Bug Reporter

### 6. DevOps Team
- **Leader**: DevOps Leader
- **Members**:
  - Build Agent
  - Deployment Agent
  - Monitoring Agent

### 7. Integration Team
- **Leader**: Integration Leader
- **Members**:
  - System Integration Agent
  - Performance Monitor
  - Maintenance Scheduler
  - MCP Manager

## 🚀 Installation

```bash
# In .specify/mcp-servers/ Verzeichnis
cd .specify/mcp-servers/

# Dependencies installieren
npm install

# Environment-Datei kopieren und anpassen
cp .env.agents .env
# Bearbeite .env und füge YouTrack API Token hinzu
```

## 📦 Start des Systems

### Alle Server starten
```bash
npm run all
```

### Einzelne Server starten
```bash
# Orchestrator
npm run orchestrator

# YouTrack MCP
npm run youtrack

# Web MCP
npm run web
```

### Development Mode
```bash
npm run start:dev
```

## 🔧 API Endpoints

### Orchestrator API (Port 4300)

#### System Status
```http
GET /health
GET /status
GET /teams
GET /agents
GET /agents/:id
```

#### Project Management
```http
POST /projects
{
  "name": "Feature X",
  "description": "Neue Feature-Entwicklung",
  "requirements": ["Requirement 1", "Requirement 2"],
  "sprintDuration": 14,
  "createYoutrackIssue": true
}

GET /projects
GET /projects/:id
POST /projects/:id/execute
```

#### Agent Tasks
```http
POST /agents/:id/task
{
  "type": "implement-feature",
  "input": {...},
  "priority": 3
}
```

## 📋 Beispiel-Workflows

### 1. Neues Feature entwickeln

```javascript
// 1. Projekt erstellen
POST http://localhost:4300/projects
{
  "name": "User Authentication",
  "description": "Implement complete user authentication system",
  "requirements": [
    "Users must be able to register",
    "Users must be able to login",
    "Password must be encrypted",
    "Session management required"
  ],
  "createYoutrackIssue": true
}

// 2. Projekt ausführen
POST http://localhost:4300/projects/{projectId}/execute

// 3. Status überwachen
GET http://localhost:4300/projects/{projectId}
```

### 2. Sprint planen

```javascript
// Sprint mit Backlog erstellen
const sprint = await sprintPlanner.planSprint({
  name: "Sprint 23",
  duration: 14,
  teamSize: 5,
  backlog: backlogItems,
  createInYoutrack: true,
  goals: [
    "Complete authentication module",
    "Fix critical bugs",
    "Improve performance"
  ]
});
```

### 3. Code Review durchführen

```javascript
// Automatisches Code Review
const review = await codeReviewAgent.reviewCode({
  path: "src/",
  lint: true,
  style: true,
  security: true,
  complexity: true
});

console.log(review.issues);
console.log(review.suggestions);
```

### 4. E2E Tests ausführen

```javascript
// E2E Test mit MCP
const testResult = await e2eAgent.testWithMCP({
  url: "http://localhost:4200",
  steps: [
    { action: "navigate", url: "/" },
    { action: "click", selector: "#login-button" },
    { action: "type", selector: "#username", value: "testuser" },
    { action: "type", selector: "#password", value: "testpass" },
    { action: "click", selector: "#submit" },
    { action: "wait", selector: ".dashboard" }
  ]
});
```

### 5. Deployment durchführen

```javascript
// Docker Deployment
const deployment = await deploymentAgent.deploy({
  target: "docker",
  environment: "production",
  image: "myapp:latest",
  containerName: "myapp-prod",
  ports: ["80:4200"],
  healthUrl: "http://localhost/health",
  autoRollback: true
});
```

## 📊 Monitoring & Metrics

### Metriken sammeln
```javascript
const monitoring = await monitoringAgent.startMonitoring({
  target: "http://localhost:4200",
  metrics: [
    { name: "response-time", type: "http", url: "/api/health", interval: 60000 },
    { name: "cpu-usage", type: "system", metric: "cpu", interval: 30000 },
    { name: "memory-usage", type: "system", metric: "memory", interval: 30000 }
  ]
});
```

### System-Status abrufen
```http
GET http://localhost:4300/status

Response:
{
  "timestamp": 1234567890,
  "teams": {
    "productOwner": {...},
    "planning": {...},
    "coding": {...}
  },
  "agents": [...],
  "projects": [...],
  "metrics": {
    "totalAgents": 25,
    "activeAgents": 5,
    "totalProjects": 3,
    "activeProjects": 1
  }
}
```

## 🔄 Automatische Workflows

### Feature-Flow (Komplett-Automatisierung)
1. Requirements analysieren
2. User Stories generieren
3. Sprint planen
4. YouTrack Issues erstellen
5. Code implementieren
6. Tests schreiben
7. Code Review durchführen
8. E2E Tests ausführen
9. Bug Reports erstellen
10. Deployment vorbereiten
11. Monitoring einrichten

### Sprint-Automation
- Automatische Velocity-Berechnung
- Capacity Planning
- Story Point Estimation
- Risk Assessment
- Dependency Mapping

## 🛠️ Konfiguration

### Agent-spezifische Einstellungen

#### Requirements Agent
- `REQUIREMENTS_MIN_LENGTH`: Minimale Beschreibungslänge
- `REQUIREMENTS_AUTO_VALIDATE`: Automatische Validierung

#### Sprint Planner
- `SPRINT_DEFAULT_VELOCITY`: Standard-Velocity
- `SPRINT_BUFFER_PERCENTAGE`: Puffer für Unsicherheiten

#### Build Agent
- `BUILD_OPTIMIZATION`: Optimierung aktivieren
- `BUILD_SOURCE_MAPS`: Source Maps generieren

#### Deployment Agent
- `DEPLOY_ROLLBACK_ENABLED`: Automatisches Rollback
- `DEPLOY_HEALTH_CHECK_TIMEOUT`: Health Check Timeout

## 🐛 Debugging

### Logs anzeigen
```bash
# Alle Logs
docker-compose logs -f

# Spezifischer Agent
docker-compose logs -f orchestrator
```

### Debug-Modus
```bash
DEBUG=* npm start
```

### Agent-Status prüfen
```javascript
// Einzelner Agent
GET http://localhost:4300/agents/{agentId}

// Alle Agenten
GET http://localhost:4300/agents
```

## 📝 Best Practices

1. **Projekt-Struktur**
   - Kleine, fokussierte Projekte erstellen
   - Klare Requirements definieren
   - Acceptance Criteria spezifizieren

2. **Sprint Planning**
   - Realistische Velocity nutzen
   - Buffer für Unvorhergesehenes einplanen
   - Dependencies früh identifizieren

3. **Code Quality**
   - Automatische Reviews für jeden Commit
   - Security Scans regelmäßig durchführen
   - Test Coverage > 80% anstreben

4. **Deployment**
   - Immer Health Checks verwenden
   - Rollback-Strategie definieren
   - Staging Environment nutzen

5. **Monitoring**
   - Kritische Metriken definieren
   - Alerts für Schwellwerte setzen
   - Regelmäßige Performance-Reviews

## 🔐 Sicherheit

- API Token in `.env` speichern
- HTTPS für Produktionsumgebung
- Regelmäßige Security Audits
- Dependency Updates automatisieren

## 📚 Weitere Ressourcen

- [MCP Protocol Documentation](https://modelcontextprotocol.io)
- [YouTrack API](https://www.jetbrains.com/help/youtrack/devportal/)
- [Puppeteer Documentation](https://pptr.dev/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🤝 Support

Bei Fragen oder Problemen:
1. Logs prüfen
2. System-Status checken
3. Agent-Health verifizieren
4. Documentation konsultieren

---

**Version**: 1.0.0  
**Status**: Production Ready  
**Maintainer**: AI Development Team
