# Mikrofon-Zugriff für lokale Entwicklung

## Problem

Browser erlauben `getUserMedia()` (Mikrofon/Kamera) standardmäßig nur bei:
- `https://` (verschlüsselte Verbindung)
- `localhost` / `127.0.0.1`

Bei HTTP-Zugriff über LAN-IP (z. B. `http://192.168.178.25:4301`) wird Mikrofon blockiert.

## ✅ Einfache Lösung (empfohlen)

**Browser-Flag setzen, damit deine LAN-IP als "sicher" gilt:**

### Schritt 1: Finde deine lokale IP-Adresse

```powershell
ipconfig | Select-String "IPv4"
```

Notiere die IP (z. B. `192.168.178.25`).

### Schritt 2: Chrome auf Android (einmalig)

1. Öffne Chrome auf dem Handy
2. Gib in die Adresszeile ein:
   ```
   chrome://flags
   ```
3. Suche nach: **"Insecure origins treated as secure"**
4. Füge deine IP mit Port hinzu:
   ```
   http://192.168.178.25:4301
   ```
   (Mehrere IPs mit Komma trennen: `http://192.168.178.25:4301,http://192.168.56.1:4301`)
5. Setze auf **"Enabled"**
6. Klicke **"Relaunch"** um Chrome neu zu starten

### Schritt 3: Chrome auf PC/Desktop (optional, für Tests)

```powershell
# Chrome mit Flag starten (ersetze IP)
"C:\Program Files\Google\Chrome\Application\chrome.exe" --unsafely-treat-insecure-origin-as-secure="http://192.168.178.25:4301" --user-data-dir=C:\chrome-dev-profile
```

### Schritt 4: App starten

```powershell
npm run start:network
```

Öffne auf dem Handy: `http://<deine-IP>:4301/` (z. B. `http://192.168.178.25:4301/`)

**Fertig!** Mikrofon funktioniert jetzt auch über HTTP.

## Alternative Browser

### Firefox (Android)

1. Öffne Firefox
2. Adresszeile: `about:config`
3. Suche: `media.devices.insecure.enabled`
4. Setze auf **true**
5. Suche: `media.getusermedia.insecure.enabled`
6. Setze auf **true**

### Safari (iOS)

Safari unterstützt keine Flags. Für iOS-Tests:
- Entweder: Chrome auf iOS installieren und Flags wie oben setzen
- Oder: Nur am PC mit `localhost` testen

## Troubleshooting

**Fehler: "NotAllowedError: Permission denied"**
→ Flag wurde noch nicht gesetzt oder Chrome nicht neu gestartet. Wiederhole Schritt 2.

**Mikrofon wird nicht angezeigt**
→ Prüfe, ob der Browser Mikrofon-Zugriff erlaubt (Einstellungen → Website-Einstellungen → Berechtigungen → Mikrofon).

**Flag-Einstellung wird nicht gefunden**
→ Chrome-Version zu alt. Update auf aktuelle Version (mind. Chrome 90+).

**Port 4301 bereits belegt**
→ Ändere Port in `package.json` unter `start:network` (z. B. `--port 4302`) und passe die Flag-URL entsprechend an.

**IP ändert sich ständig (z. B. bei DHCP)**
→ Vergib im Router eine feste IP für dein Entwicklungs-Gerät (DHCP-Reservierung).

## Option 3: localhost (nur PC, kein Handy)

Für Tests nur am PC (ohne Handy):

```powershell
npm start
# oder
ng serve
```

Öffne `http://localhost:4200/` im Browser.

## Vergleich der Optionen

| Option | Handy-Zugriff | Mikrofon | Setup-Aufwand | Empfehlung |
|--------|---------------|----------|---------------|------------|
| Browser-Flag (HTTP) | ✅ | ✅ | **Sehr niedrig** (einmalig Flag setzen) | **✅ Empfohlen** |
| localhost | ❌ | ✅ | Sehr niedrig | Nur für PC-Tests |

## Zusätzliche Hinweise

- **Browser-Flag:** Einmalig pro Browser setzen, funktioniert dann dauerhaft
- **Firewall:** Stelle sicher, dass Windows Firewall Port 4301 (oder dein gewählter Port) für eingehende Verbindungen erlaubt
- **Mehrere Geräte:** Jedes Handy/Tablet muss das Flag einmal setzen (dauert ~30 Sekunden)

## Firewall-Regel hinzufügen (falls nötig)

```powershell
# Als Administrator ausführen
New-NetFirewallRule -DisplayName "Angular Dev Server (4301)" -Direction Inbound -LocalPort 4301 -Protocol TCP -Action Allow
```

