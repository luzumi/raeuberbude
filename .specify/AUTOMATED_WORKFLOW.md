# Vollautomatischer Feature-Workflow

## Übersicht

Vollautomatischer Workflow von Issue bis Pull Request mit Testing-Feedback-Loop.

## 🔄 Workflow-Architektur

```
┌─────────────────────────────────────────────────────────┐
│              Feature-Flow Orchestrator                   │
│                   (Koordinator)                          │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Phase 1: Implementierung     │
        │  ├─ Coding Agent              │
        │  ├─ Code schreiben            │
        │  └─ Basis-Tests               │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Phase 2: Testing             │
        │  ├─ Testing Agent Enhanced    │
        │  ├─ Komponententests          │
        │  ├─ E2E-Tests                 │
        │  └─ Manuelle Tests            │
        └───────────────┬───────────────┘
                        │
                ┌───────┴───────┐
                │               │
        Bugs gefunden?   Alles grün?
                │               │
                ▼               ▼
    ┌──────────────────┐  ┌─────────────┐
    │ Phase 3: Bug-Fix │  │ Phase 4: PR │
    │ ├─ Bug-Issues    │  │ ├─ Branch   │
    │ ├─ Coding Agent  │  │ │   pushen  │
    │ └─ Zurück zu     │  │ ├─ PR       │
    │    Testing       │  │ │   erstell │
    └────────┬─────────┘  │ └─ Issue    │
             │            │    update   │
             │            └─────────────┘
             │                    │
             └─────────┐          │
                       │          │
                       ▼          ▼
                     LOOP      SUCCESS
```

## 🚀 Verwendung

### Einfachster Aufruf
```bash
/feature-flow LUD28-36
```

Der Orchestrator koordiniert dann:
1. ✅ Coding Agent implementiert
2. ✅ Testing Agent testet (Component + E2E)
3. ✅ Bei Bugs: Automatisch Bug-Issues + Fix + Re-Test
4. ✅ Bei Erfolg: Automatisch Pull Request

### Mit Optionen
```bash
/feature-flow LUD28-36 --auto-confirm --max-loops=5 --coverage-threshold=85
```

## 📋 Detaillierter Ablauf

### Schritt 1: Feature-Flow starten

```bash
/feature-flow LUD28-36
```

**Orchestrator fragt:**
```
🚀 Feature-Flow für LUD28-36 gestartet
📝 Feature: Dekoratives Lampenbild für Orange-Light-Kachel

Phase 1: Implementierung
Coding Agent beauftragen? (Ja/Nein)
```

### Schritt 2: Coding Agent implementiert

```bash
> Ja

👨‍💻 Coding Agent startet...
✅ Branch erstellt: feature/LUD28-36-lampenbild
✅ Code implementiert
✅ 3 Dateien geändert
✅ Commit: feat(orange-light): Add lamp image to tile
```

### Schritt 3: Testing Agent testet

```bash
🧪 Testing Agent startet...

📝 Komponententests schreiben...
  ✅ orange-light-minimal.spec.ts (6 Tests)
  
▶️  Komponententests ausführen...
  ✅ 6/6 Tests bestanden
  ✅ Coverage: 95%

📝 E2E-Tests schreiben...
  ✅ orange-light.e2e.spec.ts (7 Tests)
  
▶️  E2E-Tests ausführen...
  ❌ 5/7 Tests bestanden
  ❌ 2 Fehler gefunden
```

### Schritt 4: Bug-Issues erstellen

```bash
🐛 Bugs gefunden - Erstelle Bug-Issues...

✅ LUD28-38: [BUG] E2E Test Failure: should toggle lamp off
✅ LUD28-39: [BUG] E2E Test Failure: should handle rapid clicks

🔧 Coding Agent wird beauftragt Bugs zu fixen...
```

### Schritt 5: Bug-Fix-Loop

```bash
👨‍💻 Coding Agent fixt Bug LUD28-38...
  ✅ Fix: Toggle-State-Persistierung korrigiert

👨‍💻 Coding Agent fixt Bug LUD28-39...
  ✅ Fix: Debounce für Race-Conditions hinzugefügt

🧪 Testing Agent re-testet...
  ✅ 7/7 E2E-Tests bestanden
  ✅ Alle Bugs gefixt!
```

### Schritt 6: Pull Request

```bash
✅ ALLE TESTS BESTANDEN!

📊 Finale Statistiken:
- Komponententests: 6/6 ✅
- E2E-Tests: 7/7 ✅
- Code Coverage: 95%
- Bugs gefunden: 2
- Bugs gefixt: 2

📤 Branch wird gepusht...
✅ Pull Request erstellt:
   https://github.com/luzumi/raeuberbude/pull/42

🎉 Feature-Flow erfolgreich abgeschlossen!
```

## 📊 Test-Abdeckung

### Komponententests (Unit Tests)

**Ziel:** 100% der Ticket-Funktionalität

```typescript
// Beispiel: orange-light-minimal.spec.ts
describe('OrangeLightMinimal', () => {
  // Basis
  it('should create')
  it('should display lamp image')
  
  // Zustände
  it('should show off state')
  it('should show on state')
  it('should show unavailable state')
  
  // State-Management
  it('should update on state change')
  it('should subscribe to HomeAssistantService')
});
```

**Coverage-Ziele:**
- Lines: > 80%
- Branches: > 75%
- Functions: > 80%

### E2E-Tests (End-to-End)

**Ziel:** Alle User-Flows abdecken

```typescript
// Beispiel: orange-light.e2e.spec.ts
describe('Orange Light Feature', () => {
  // Basis
  test('should display lamp image on tile')
  
  // Interaktionen
  test('should toggle lamp on when clicked')
  test('should toggle lamp off when clicked again')
  test('should open detail view on long press')
  
  // Edge Cases
  test('should handle rapid clicks gracefully')
  test('should handle offline state')
  
  // Responsive
  test('should work on mobile viewport')
});
```

## 🐛 Bug-Reporting

### Automatisch erstelle Bug-Issues

Bei gefundenen Bugs erstellt der Testing Agent automatisch:

```yaml
Summary: [BUG] E2E Test Failure: should toggle lamp off

Description:
  # Bug aus E2E-Test
  
  **Test:** should toggle lamp off when clicked again
  
  **Fehlermeldung:**
  ```
  expect(received).toBeVisible()
  Expected: visible
  Received: hidden
  ```
  
  **Screenshot:** [Angehängt]
  
  **Reproduce:**
  ```bash
  npx playwright test --grep="should toggle lamp off"
  ```

Type: Bug
Priority: High
Parent: LUD28-36
Link: "is caused by" LUD28-36
```

### Bug-Fix-Loop

1. **Bug-Issue erstellt** → LUD28-38
2. **Coding Agent beauftragt** → `/issue-worker LUD28-38`
3. **Bug gefixt** → Commit & Push
4. **Testing Agent nochmal** → Re-Test
5. **Repeat** bis alle Tests grün

**Max Loops:** 3 (danach manuelle Intervention)

## ✅ Erfolgs-Kriterien

Ein Feature ist "Done" wenn:

- ✅ Alle Komponententests bestanden
- ✅ Alle E2E-Tests bestanden
- ✅ Code Coverage > 80%
- ✅ Keine offenen Bug-Issues
- ✅ Pull Request erstellt
- ✅ Issue-Status: "To Review"

## 🎯 Beispiel: LUD28-36

### Vorher (ohne Automation)
```
1. Manuell implementieren       (30 Min)
2. Manuell testen               (15 Min)
3. Bugs finden                  (10 Min)
4. Bugs fixen                   (20 Min)
5. Nochmal testen               (15 Min)
6. PR manuell erstellen         (5 Min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: ~95 Minuten + menschliche Fehler
```

### Nachher (mit Automation)
```
1. /feature-flow LUD28-36       (Auto)
   ├─ Coding Agent              (10 Min)
   ├─ Testing Agent             (5 Min)
   ├─ Bug-Fix-Loop (1x)         (10 Min)
   └─ Pull Request              (1 Min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: ~26 Minuten + 100% Test-Coverage
```

**Ersparnis:** 70% Zeit + höhere Qualität!

## 📁 Neue Workflows

1. **`/feature-flow <issue-id>`**
   - Datei: `.windsurf/workflows/feature-flow.md`
   - Koordiniert gesamten Prozess

2. **`/testing-agent-enhanced <issue-id>`**
   - Datei: `.windsurf/workflows/testing-agent-enhanced.md`
   - Komponententests + E2E-Tests + Bug-Reporting

3. **`/issue-worker <issue-id>`** (existing)
   - Datei: `.windsurf/workflows/issue-worker.md`
   - Implementierung

## 🔧 Setup

### Voraussetzungen

1. **Playwright installieren** (für E2E-Tests)
```bash
npm install -D @playwright/test
npx playwright install
```

2. **Test-Konfiguration**
```bash
# playwright.config.ts erstellen
npx playwright init
```

3. **Jasmine/Karma** (bereits vorhanden)
```bash
# Für Komponententests
npm test
```

## 🚀 Los geht's!

```bash
# Issue LUD28-36 vollautomatisch bearbeiten
/feature-flow LUD28-36

# Und lehne dich zurück! ☕
```

---

**Erstellt:** 2025-10-16
**Status:** ✅ Ready to use
**Version:** 1.0
