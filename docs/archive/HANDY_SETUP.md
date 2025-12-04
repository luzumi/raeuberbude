# Handy-Setup: Mikrofon freischalten

## Problem
❌ Fehler auf Handy: "Unsicherer Kontext"  
❌ Mikrofon funktioniert nicht über HTTP

## Lösung
HTTPS mit selbstsigniertem Zertifikat

---

## Schnellstart (3 Schritte)

### 1️⃣ Server starten (PC)
```bash
npm run start:https
```

Server läuft auf: `https://192.168.56.1:4200`

### 2️⃣ Zertifikat auf Handy installieren

#### Android - Einfachste Methode:

1. **PC: Webserver starten**
   ```bash
   cd C:\Users\corat\IdeaProjects\raueberbude\ssl
   python -m http.server 8000
   ```

2. **Handy: Browser öffnen**
   ```
   http://192.168.56.1:8000
   ```

3. **Herunterladen**
   - `localhost.crt` antippen
   - Herunterladen

4. **Installieren**
   - Download-Benachrichtigung → Öffnen
   - ODER: Einstellungen → Sicherheit → "Zertifikat installieren"
   - Name: "Raueberbude"
   - Verwendung: "VPN und Apps"
   - OK

#### iOS - Einfachste Methode:

1. **Zertifikat per E-Mail senden**
   - `ssl/localhost.crt` als Anhang
   - An eigene E-Mail

2. **Auf iPhone öffnen**
   - E-Mail auf iPhone
   - Anhang antippen
   - "Profil installieren"

3. **Vertrauen aktivieren** (WICHTIG!)
   - Einstellungen → Allgemein → Info
   - Ganz unten: "Zertifikatsvertrauensstellungen"
   - Schalter AKTIVIEREN für Zertifikat

### 3️⃣ App öffnen
```
https://192.168.56.1:4200
```

Mikrofon-Button klicken → ✅ Funktioniert!

---

## Firewall freischalten (einmalig)

Falls Verbindung nicht klappt:

**PowerShell als Administrator:**
```powershell
New-NetFirewallRule -DisplayName "Angular HTTPS" -Direction Inbound -Protocol TCP -LocalPort 4200 -Action Allow -Profile Private,Domain
```

---

## Troubleshooting

### Handy: "Diese Verbindung ist nicht sicher"

**Lösung:** Zertifikat noch nicht installiert → siehe Schritt 2

### Handy: Seite lädt nicht

**Prüfen:**
1. ✅ Server läuft? (`npm run start:https`)
2. ✅ IP korrekt? (prüfen: `ipconfig`)
3. ✅ Handy im selben WLAN?
4. ✅ Firewall freigegeben?

### Android: "Keine Zertifikate gefunden"

**Lösung:**
- Datei muss `.crt` Endung haben
- Im Download-Ordner speichern
- Von "Dateien"-App installieren

### iOS: Zertifikat installiert, lädt aber nicht

**Lösung:** Vertrauensstellung aktivieren!
1. Einstellungen → Allgemein → Info
2. "Zertifikatsvertrauensstellungen"
3. Schalter AKTIVIEREN

### Mikrofon trotzdem blockiert

**Lösung:**
1. **Chrome → Einstellungen → Website-Einstellungen → Mikrofon**
   - Für `https://192.168.56.1:4200` erlauben

2. **System-Einstellungen → Apps → Chrome → Berechtigungen**
   - Mikrofon erlauben

3. **Cache leeren + neu laden**

---

## IP-Adresse finden

**Falls andere IP benötigt:**

```powershell
ipconfig | findstr "IPv4"
```

**Diese IP nutzen statt `192.168.56.1`**

---

## Schnelltest

1. ✅ Server: `npm run start:https`
2. ✅ PC Browser: `https://localhost:4200` → lädt?
3. ✅ Handy Browser: `https://192.168.56.1:4200` → lädt?
4. ✅ Mikrofon-Button → grün?
5. ✅ Sprechen → Text erscheint?

**Alles ✅ → Fertig!** 🎉

---

## Für alle Terminals

Zertifikat auf **jedem** Gerät installieren:
- ✅ Alle Handys
- ✅ Alle Tablets
- ✅ Alle PCs im Netzwerk

**Einmal installieren = für immer (10 Jahre gültig)**

---

## Zusammenfassung

✅ **Server über HTTPS**: `npm run start:https`  
✅ **Zertifikat installieren**: Android/iOS siehe oben  
✅ **App öffnen**: `https://192.168.56.1:4200`  
✅ **Mikrofon nutzen**: Funktioniert! 🎤

Vollständige Anleitung: `docs/HTTPS_SETUP.md`

