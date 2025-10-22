# GitHub Secret Setup für YouTrack Integration

## ⚠️ WICHTIG: Einmalige Einrichtung erforderlich!

Damit die automatische Issue-Schließung funktioniert, muss das GitHub Secret `YOUTRACK_TOKEN` gesetzt werden.

---

## 🔧 Setup-Schritte

### Option 1: Via GitHub Web UI (Empfohlen)

1. **Gehe zu GitHub Repository:**
   ```
   https://github.com/luzumi/raeuberbude/settings/secrets/actions
   ```

2. **Klicke auf:** `New repository secret`

3. **Fülle aus:**
   - **Name:** `YOUTRACK_TOKEN`
   - **Secret:** `perm:YWRtaW4=.NDUtMA==.VqVCNbrN5JRc1nEJiCuGSHOmqZa1HY`

4. **Klicke:** `Add secret`

5. **✅ Fertig!** Die GitHub Action kann jetzt automatisch Issues schließen.

---

### Option 2: Via GitHub CLI

```bash
# Setze Secret
gh secret set YOUTRACK_TOKEN --body "perm:YWRtaW4=.NDUtMA==.VqVCNbrN5JRc1nEJiCuGSHOmqZa1HY"

# Verifiziere
gh secret list
```

---

## ✅ Verifizierung

### Prüfe ob Secret gesetzt ist:

**Via GitHub Web:**
- Gehe zu: `Settings` → `Secrets and variables` → `Actions`
- Du solltest `YOUTRACK_TOKEN` in der Liste sehen

**Via GitHub CLI:**
```bash
gh secret list
# Output sollte enthalten: YOUTRACK_TOKEN
```

---

## 🧪 Test

### Test 1: Erstelle einen Test-PR

1. Erstelle einen Branch mit Test-Commit
2. Erstelle PR mit Titel: `[TEST-1] Test Issue Closing`
3. Merge den PR
4. Prüfe GitHub Actions Tab → Workflow sollte erfolgreich laufen

### Test 2: Prüfe YouTrack

1. Gehe zu YouTrack Issue `TEST-1` (falls vorhanden)
2. Issue sollte Status "Fixed" haben
3. Kommentar "PR gemerged" sollte vorhanden sein

---

## 🚨 Troubleshooting

### Problem: GitHub Action schlägt fehl mit "401 Unauthorized"

**Ursache:** Token ist ungültig oder nicht gesetzt

**Lösung:**
1. Prüfe ob Secret richtig gesetzt ist
2. Token könnte abgelaufen sein → Neues Token in YouTrack generieren
3. Token-Permissions prüfen (muss Issues schreiben können)

### Problem: GitHub Action läuft nicht

**Ursache:** Workflow-Datei fehlt oder ist fehlerhaft

**Lösung:**
1. Prüfe ob `.github/workflows/close-youtrack-issue.yml` existiert
2. Prüfe GitHub Actions Tab → "Workflows" → sollte "Close YouTrack Issue on PR Merge" zeigen

### Problem: Issue wird nicht geschlossen

**Ursache:** Issue-ID nicht im PR-Titel

**Lösung:**
1. PR-Titel muss Format haben: `[LUD28-XX]` oder `LUD28-XX:`
2. Beispiel: `[LUD28-36] Feature Titel`

---

## 📚 Weitere Infos

Siehe `.specify/GITHUB-YOUTRACK-INTEGRATION.md` für vollständige Dokumentation.

---

**Setup erforderlich:** Einmalig  
**Datum:** 2025-10-16
