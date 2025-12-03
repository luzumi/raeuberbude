# Klarstellung: Load/Aktivieren & Eject/Deaktivieren

## Das Missverständnis ❌

**Was gedacht wurde:**
- "Load" lädt das Modell in LM Studio
- "Eject" entlädt das Modell aus LM Studio (spart RAM)

**Was tatsächlich passiert:**
- "Aktivieren" markiert nur dass die **App** dieses Modell verwenden soll
- "Deaktivieren" markiert nur dass die **App** dieses Modell NICHT verwenden soll
- **LM Studio bleibt unberührt!**

---

## Die Realität ✅

### LM Studio verwaltet seine eigenen Modelle
- LM Studio hat **keine API zum Entladen** von Modellen
- Modelle laden/entladen muss **manuell in LM Studio** geschehen
- Unsere App kann nur **abfragen** welche Modelle verfügbar sind

### Was unsere Buttons wirklich tun

**"Aktivieren" Button:**
- ✅ Setzt `isActive: true` in der Datenbank
- ✅ App verwendet dieses Modell für LLM-Anfragen
- ❌ Lädt NICHT das Modell in LM Studio
- **Voraussetzung**: Modell muss bereits in LM Studio geladen sein!

**"Deaktivieren" Button:**
- ✅ Setzt `isActive: false` in der Datenbank
- ✅ App verwendet dieses Modell NICHT mehr
- ❌ Entlädt NICHT das Modell aus LM Studio
- **Modell bleibt in LM Studio geladen** (verbraucht weiter RAM)

---

## Warum wird health='healthy' nach Reload?

### Ablauf beim "Deaktivieren":
1. User klickt "Deaktivieren"
2. Backend setzt: `isActive: false`, `health: 'unknown'`
3. UI zeigt: Status "Inaktiv (Unloaded)"

### Ablauf beim Reload:
1. Frontend fragt Backend: `GET /api/llm-instances`
2. Backend liefert Instanz mit `health: 'unknown'`
3. UI zeigt: Status "unknown"

### Ablauf beim "LLM-Instanzen scannen":
1. Frontend klickt "LLM-Instanzen scannen"
2. Backend macht Health-Check: `GET http://lm-studio/v1/models`
3. **Modell ist noch in Liste** (weil noch in LM Studio geladen)
4. Backend setzt: `health: 'healthy'`
5. UI zeigt: Status "healthy" ✅

**Das ist korrektes Verhalten!** Das Modell IST ja healthy in LM Studio.

---

## Wie man wirklich RAM spart

### Option 1: Manuell in LM Studio
1. Öffne LM Studio
2. Gehe zum Tab mit geladenen Modellen
3. Klicke den **roten Eject-Button** in LM Studio
4. Modell wird aus RAM entfernt

### Option 2: Multi-Active nutzen
- Aktiviere nur die Modelle die du wirklich brauchst
- Lade in LM Studio nur diese Modelle
- Rest bleibt inaktiv in unserer App

### Option 3: LM Studio Auto-Management
- LM Studio kann Modelle automatisch entladen wenn RAM knapp wird
- Einstellung in LM Studio: "Auto-unload models"

---

## Empfohlener Workflow

### Setup (einmalig)
1. **In LM Studio**: Lade die Modelle die du nutzen willst
2. **In unserer App**: Klicke "LLM-Instanzen scannen"
3. **In unserer App**: Aktiviere die Modelle die du verwenden willst
4. **In unserer App**: Klicke auf jede Card und konfiguriere (Temperature, etc.)

### Normaler Betrieb
1. **App nutzt** nur aktivierte Modelle für LLM-Anfragen
2. **LM Studio** hat alle Modelle geladen (verbraucht RAM)
3. **Wenn RAM knapp**: Entlade ungenutzte Modelle **manuell in LM Studio**

### RAM sparen
1. **In LM Studio**: Identifiziere welche Modelle gerade nicht gebraucht werden
2. **In LM Studio**: Klicke Eject-Button
3. **In unserer App**: Modell bleibt in Liste, aber `health` wird beim nächsten Scan auf 'unhealthy' gesetzt

---

## UI-Verbesserungen (implementiert)

### Klarere Begriffe ✅
- **"Aktivieren"** statt "Load" (klar: nur in App)
- **"Deaktivieren"** statt "Eject" (kein Missverständnis mit LM Studio)

### Tooltips ✅
- "In App aktivieren (Modell muss in LM Studio geladen sein)"
- "In App deaktivieren (Modell bleibt in LM Studio geladen)"

### Bestätigungs-Dialog ✅
```
LLM-Instanz "mistral..." deaktivieren?

⚠️ Dies deaktiviert nur die Verwendung in der App.
Das Modell bleibt in LM Studio geladen!

Um RAM zu sparen: Entlade das Modell manuell in LM Studio.
```

### Snackbar-Feedback ✅
```
mistral... in App deaktiviert (bleibt in LM Studio geladen)
```

### Status-Anzeige ✅
- "Aktiv (In App verwendet)"
- "Inaktiv (App nutzt es nicht)"
- Health-Badge zeigt LM Studio Status: healthy/unhealthy/unknown

---

## Zusammenfassung

**Was die App kann:**
✅ Abfragen welche Modelle in LM Studio verfügbar sind
✅ Auswählen welche davon die App verwenden soll
✅ Pro-Modell-Config speichern (Temperature, etc.)
✅ Multi-Active: Mehrere Modelle parallel verwenden

**Was die App NICHT kann:**
❌ Modelle in LM Studio laden
❌ Modelle aus LM Studio entladen
❌ RAM-Verbrauch von LM Studio kontrollieren

**Warum?**
LM Studio hat keine API dafür. Das muss manuell in LM Studio gemacht werden.

---

## Fehlerbehebung

### Problem: "Ich habe deaktiviert aber Modell verbraucht noch RAM"
**Lösung**: Normal! Deaktivieren betrifft nur die App. Entlade manuell in LM Studio.

### Problem: "Nach Scan ist health wieder healthy obwohl deaktiviert"
**Lösung**: Normal! Health zeigt LM Studio Status, nicht App-Status. Wenn Modell in LM Studio geladen ist → healthy.

### Problem: "Wie aktiviere ich ein Modell wenn es nicht in LM Studio geladen ist?"
**Lösung**: 
1. Lade Modell in LM Studio
2. Klicke in unserer App "LLM-Instanzen scannen"
3. Modell erscheint mit health='healthy'
4. Klicke "Aktivieren"

### Problem: "Wie spare ich wirklich RAM?"
**Lösung**: Entlade Modelle **in LM Studio** (roter Eject-Button dort).

---

## Finale Empfehlung

**Wir sollten die Begriffe ändern für mehr Klarheit:**

**Statt:**
- ❌ "Load" / "Eject" (impliziert physisches Laden/Entladen)

**Besser:**
- ✅ "Aktivieren" / "Deaktivieren" (klar: nur App-Status)
- ✅ "Verwenden" / "Nicht verwenden"
- ✅ "Nutzen" / "Ignorieren"

**Status-Text:**
- ✅ "Aktiv (App nutzt)" / "Inaktiv (App ignoriert)"
- ✅ Health-Badge: "In LM Studio: healthy/unhealthy"

**Dies ist bereits implementiert!** ✅

