# GitHub ↔ YouTrack Integration

## 🎯 Übersicht

Automatische Integration zwischen GitHub Pull Requests und YouTrack Issues:

```
Issue Worker (Cascade)
    ↓
  Implementierung
    ↓
  PR erstellt → YouTrack aktualisiert (Kommentar + Status)
    ↓
  PR gemerged → GitHub Action → YouTrack Issue geschlossen ✅
```

---

## ⚙️ Setup

### 1. YouTrack Token als GitHub Secret

**GitHub Repository Settings:**
1. Gehe zu: `Settings` → `Secrets and variables` → `Actions`
2. Klicke: `New repository secret`
3. Name: `YOUTRACK_TOKEN`
4. Value: `perm:YWRtaW4=.NDUtMA==.VqVCNbrN5JRc1nEJiCuGSHOmqZa1HY`
5. Speichern

### 2. GitHub Action aktivieren

Die Action ist bereits unter `.github/workflows/close-youtrack-issue.yml` vorhanden und wird automatisch ausgeführt.

---

## 📋 Workflow-Schritte

### Schritt 1: Issue Worker startet
```powershell
/issue-worker LUD28-36
```

**Was passiert:**
1. ✅ Issue-Status → "In Progress"
2. Code wird implementiert
3. Tests werden durchgeführt
4. Branch wird gepusht

### Schritt 2: Pull Request erstellt
```powershell
gh pr create --title "[LUD28-36] Feature Titel" ...
```

**Was passiert:**
1. ✅ PR wird auf GitHub erstellt
2. ✅ PR-URL wird in YouTrack-Kommentar gepostet
3. ✅ Screenshots werden zu YouTrack hochgeladen
4. ✅ Issue-Status → "To verify" (oder "Open")

### Schritt 3: Code Review
- Reviewer prüft den Code auf GitHub
- Bei Änderungswünschen: Weitere Commits pushen
- Bei Freigabe: PR approven

### Schritt 4: PR Merge (automatisch!)
```
PR wird gemerged → GitHub Action startet
```

**Was passiert (automatisch via GitHub Action):**
1. ✅ Issue-ID wird aus PR-Titel extrahiert
2. ✅ Kommentar in YouTrack: "PR gemerged"
3. ✅ Issue-Status → "Fixed"
4. ✅ Issue ist geschlossen

---

## 📝 PR-Titel Format

**WICHTIG:** PR-Titel MUSS Issue-ID enthalten!

### ✅ Korrekte Formate:
```
[LUD28-36] Transparentes Lampenbild für Orange-Light
LUD28-36: Feature Implementierung
feat(LUD28-36): Add lamp image
```

### ❌ Falsche Formate:
```
Feature: Lampenbild hinzugefügt
Fixes bug in orange-light component
```

**Ohne Issue-ID:** GitHub Action kann Issue nicht automatisch schließen!

---

## 🔍 Troubleshooting

### Problem: Issue wird nicht geschlossen

**Ursache 1:** Issue-ID nicht im PR-Titel
- **Lösung:** PR-Titel bearbeiten und Issue-ID hinzufügen

**Ursache 2:** GitHub Secret `YOUTRACK_TOKEN` nicht gesetzt
- **Lösung:** Secret in GitHub Repository Settings hinzufügen

**Ursache 3:** Issue-Status "Fixed" existiert nicht in YouTrack
- **Lösung:** GitHub Action anpassen auf verfügbaren Status (z.B. "Done")

### Problem: GitHub Action schlägt fehl

**Prüfen:**
1. GitHub Actions Tab → Workflow-Runs ansehen
2. Log-Output prüfen
3. Token-Permissions prüfen

**Häufige Fehler:**
- 401 Unauthorized → Token ungültig
- 404 Not Found → Issue-ID falsch oder nicht gefunden
- 400 Bad Request → Status "Fixed" nicht verfügbar

---

## 🧪 Manuelles Testen

### Test 1: Issue-ID Extraktion
```bash
PR_TITLE="[LUD28-36] Test Feature"
echo "$PR_TITLE" | grep -oP '\[?([A-Z]+-\d+)\]?' | tr -d '[]'
# Output: LUD28-36
```

### Test 2: YouTrack API manuell aufrufen
```bash
curl -X POST \
  "https://luzumi.youtrack.cloud/api/issues/LUD28-36" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customFields": [
      {
        "name": "State",
        "$type": "StateIssueCustomField",
        "value": {"name": "Fixed"}
      }
    ]
  }'
```

### Test 3: Lokale Action-Simulation
```bash
# Installiere act (GitHub Actions lokal ausführen)
winget install nektos.act

# Action lokal testen
act pull_request -e .github/test-pr-event.json
```

---

## 📊 Status-Mapping

| Workflow-Phase | GitHub Status | YouTrack Status |
|----------------|---------------|-----------------|
| Arbeit beginnt | - | In Progress |
| PR erstellt | Open | To verify |
| PR approved | Approved | To verify |
| PR gemerged | Merged | Fixed ✅ |
| PR closed (nicht merged) | Closed | (unverändert) |

---

## 🔗 Verfügbare YouTrack States

Prüfe verfügbare States in deinem YouTrack-Projekt:
```bash
curl -X GET \
  "https://luzumi.youtrack.cloud/api/admin/projects/<PROJECT_ID>/customFields" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Typische States:
- Open
- In Progress
- To verify
- Fixed
- Done
- Won't fix
- Duplicate

---

## 🚀 Best Practices

### 1. Immer Issue-ID im PR-Titel
- Macht Tracking einfacher
- Ermöglicht automatisches Schließen
- Verlinkt PR und Issue bidirektional

### 2. Aussagekräftige PR-Beschreibungen
- Referenziere das YouTrack-Issue
- Füge Screenshots hinzu
- Beschreibe Änderungen klar

### 3. Status manuell prüfen
- Nach PR-Merge: YouTrack-Issue prüfen
- Falls nicht geschlossen: GitHub Action Logs prüfen

### 4. Conventions einhalten
- Branch-Namen: `feature/LUD28-36-beschreibung`
- Commit-Messages: `feat(LUD28-36): Beschreibung`
- PR-Titel: `[LUD28-36] Beschreibung`

---

## 📚 Weiterführende Links

- [YouTrack REST API Docs](https://www.jetbrains.com/help/youtrack/devportal/youtrack-rest-api.html)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow-Automatisierung Best Practices](https://www.atlassian.com/git/tutorials/comparing-workflows)

---

**Letzte Aktualisierung:** 2025-10-16  
**Version:** 1.0
