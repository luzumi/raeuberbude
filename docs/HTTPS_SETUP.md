# HTTPS Setup für lokales Netzwerk

## Problem

Browser blockieren Mikrofon-Zugriff über HTTP aus Sicherheitsgründen:
```
Error: Unsicherer Kontext. Bitte die App über HTTPS oder localhost laden.
```

## Lösung

HTTPS mit selbstsigniertem Zertifikat für das lokale Netzwerk.

## Setup (bereits erledigt)

### 1. Zertifikat erstellt ✅
```
ssl/
  localhost.crt  - Zertifikat (öffentlich)
  localhost.key  - Private Key
  localhost.pfx  - Windows Format
```

**Gültig für:**
- `localhost`
- `raueberbude.local`
- `192.168.56.1`
- `*.local`

**Gültigkeit:** 10 Jahre

### 2. Angular konfiguriert ✅
```json
"serve": {
  "options": {
    "ssl": true,
    "sslCert": "ssl/localhost.crt",
    "sslKey": "ssl/localhost.key",
    "host": "0.0.0.0",
    "port": 4200
  }
}
```

## Nutzung

### Server starten

**Standard (jetzt mit HTTPS):**
```bash
npm start
# oder
ng serve
```

**Explizit HTTPS:**
```bash
npm run start:https
```

**Server läuft dann auf:**
```
https://localhost:4200
https://192.168.56.1:4200  (PC im Netzwerk)
```

## Zertifikat auf Geräten installieren

Da das Zertifikat selbstsigniert ist, müssen Geräte es als vertrauenswürdig markieren.

### Android (Handy/Tablet)

#### Methode 1: QR-Code (empfohlen)
1. **Zertifikat konvertieren** (einmalig):
   ```bash
   cd C:\Users\corat\IdeaProjects\raueberbude\ssl
   certutil -encode localhost.crt localhost_base64.crt
   ```

2. **QR-Code generieren**:
   - Webseite: https://www.qr-code-generator.com/
   - Content Type: "Text"
   - Inhalt: Kompletter Inhalt von `localhost_base64.crt`
   - QR-Code generieren

3. **Auf Android scannen**:
   - QR-Code scannen
   - Text kopieren
   - Als Datei speichern (z.B. `cert.crt`)

4. **Installieren**:
   - Einstellungen → Sicherheit → Verschlüsselung & Anmeldedaten
   - "Zertifikat installieren" oder "Von SD-Karte installieren"
   - Datei auswählen
   - Name: "Raueberbude Local"
   - Verwendung: "VPN und Apps"

#### Methode 2: Datei-Transfer
1. **Zertifikat kopieren**:
   - `ssl/localhost.crt` per USB, E-Mail, oder Cloud auf Handy
   
2. **Installieren**:
   - Datei öffnen
   - Android fragt nach Installation
   - Name: "Raueberbude Local"
   - Bestätigen

#### Methode 3: Webserver
1. **Temporärer Webserver** (im ssl Ordner):
   ```bash
   cd ssl
   python -m http.server 8000
   ```

2. **Auf Handy öffnen**:
   - Browser: `http://192.168.56.1:8000`
   - `localhost.crt` herunterladen
   - Datei öffnen → Installieren

### iOS (iPhone/iPad)

1. **Zertifikat senden**:
   - Per E-Mail als Anhang
   - Oder per AirDrop
   - Oder über Webserver

2. **Profil installieren**:
   - Datei öffnen
   - "Profil wird heruntergeladen" Meldung
   - Einstellungen → "Profil geladen"
   - "Installieren" tippen
   - Code eingeben (falls nötig)

3. **Zertifikat vertrauen**:
   - Einstellungen → Allgemein → Info
   - "Zertifikatsvertrauensstellungen"
   - Schalter aktivieren für "raueberbude.local"

### Windows (andere PCs)

1. **Doppelklick auf `localhost.pfx`**
2. **Zertifikat-Import-Assistent**:
   - Speicherort: "Aktueller Benutzer"
   - Passwort: `raueberbude2024`
   - Speicherort: "Zertifikate in folgendem Speicher"
   - "Vertrauenswürdige Stammzertifizierungsstellen"
3. **Fertigstellen**

### macOS

1. **Terminal**:
   ```bash
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /pfad/zu/localhost.crt
   ```

2. **Oder Schlüsselbundverwaltung**:
   - Doppelklick auf `localhost.crt`
   - "System" Schlüsselbund
   - Zertifikat suchen
   - Rechtsklick → "Informationen"
   - "Vertrauen" → "Immer vertrauen"

### Linux

```bash
sudo cp localhost.crt /usr/local/share/ca-certificates/raueberbude.crt
sudo update-ca-certificates
```

## Testen

### 1. PC (Host)
```
https://localhost:4200
→ Sollte ohne Warnung laden
```

### 2. Handy/Tablet im selben Netzwerk
```
https://192.168.56.1:4200
→ Nach Zertifikat-Installation: Keine Warnung
→ Mikrofon-Zugriff sollte funktionieren
```

### 3. Mikrofon-Test
1. Seite öffnen
2. Mikrofon-Button klicken
3. Browser fragt nach Mikrofon-Berechtigung
4. ✅ Erlauben
5. ✅ Sprechen funktioniert

## Troubleshooting

### Browser zeigt weiterhin Warnung

**Problem:** "Diese Verbindung ist nicht sicher"

**Lösung:**
1. Zertifikat noch nicht installiert → siehe oben
2. Cache leeren:
   - Chrome: `chrome://settings/clearBrowserData`
   - Haken bei "Gecachte Bilder und Dateien"
   - Löschen
3. Browser neu starten
4. Seite neu laden

### Android: "Keine Zertifikate gefunden"

**Problem:** Datei wird nicht erkannt

**Lösung:**
1. Datei muss `.crt` oder `.cer` Endung haben
2. Datei im Download-Ordner speichern
3. "Dateien"-App öffnen
4. Zertifikat von dort installieren

### iOS: Zertifikat installiert, aber nicht vertraut

**Problem:** Seite lädt nicht

**Lösung:**
1. **Wichtig:** Zertifikatsvertrauensstellungen aktivieren
2. Einstellungen → Allgemein → Info
3. Ganz unten: "Zertifikatsvertrauensstellungen"
4. Schalter für Zertifikat AKTIVIEREN

### Mikrofon trotzdem blockiert

**Problem:** Zugriff verweigert

**Lösung:**
1. **Browser-Einstellungen**:
   - Chrome Android: Einstellungen → Website-Einstellungen → Mikrofon
   - Für `https://192.168.56.1:4200` erlauben

2. **Android System**:
   - Einstellungen → Apps → Chrome → Berechtigungen
   - Mikrofon: Erlauben

3. **Cache leeren**:
   - Chrome → Einstellungen → Datenschutz
   - Browserdaten löschen
   - Neu laden

### Verbindung nicht möglich

**Problem:** Seite lädt nicht

**Lösung:**
1. **Firewall prüfen**:
   ```powershell
   New-NetFirewallRule -DisplayName "Angular Dev Server HTTPS" -Direction Inbound -Protocol TCP -LocalPort 4200 -Action Allow
   ```

2. **IP-Adresse prüfen**:
   ```powershell
   ipconfig
   # Richtige IP verwenden statt 192.168.56.1
   ```

3. **Server läuft?**:
   ```bash
   npm start
   # Sollte zeigen: "HTTPS Dev server running on https://0.0.0.0:4200"
   ```

## Firewall-Regel (Windows)

Falls Verbindung von anderen Geräten nicht klappt:

```powershell
# Als Administrator
New-NetFirewallRule -DisplayName "Angular HTTPS Server" -Direction Inbound -Protocol TCP -LocalPort 4200 -Action Allow -Profile Private,Domain
```

## IP-Adresse finden

**Aktuelle IP des PCs ermitteln:**

```powershell
# PowerShell
ipconfig | findstr "IPv4"
```

**Oder:**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"} | Select-Object IPAddress
```

**Diese IP auf Handy verwenden:**
```
https://[IHRE-IP]:4200
```

## Alternative: mDNS (Bonjour)

Für einfacheren Zugriff ohne IP-Adresse:

### Windows (Host)
1. **Bonjour Print Services** installieren
   - Von Apple oder iTunes

2. **Hostname nutzen**:
   ```
   https://COMPUTERNAME.local:4200
   ```

### Oder: hosts-Datei auf Geräten

**Android (benötigt Root):**
```bash
echo "192.168.56.1 raueberbude.local" >> /system/etc/hosts
```

**Dann auf Handy:**
```
https://raueberbude.local:4200
```

## Produktions-Deployment

Für echtes Deployment (nicht Dev-Server):

### Nginx mit SSL

```nginx
server {
    listen 443 ssl http2;
    server_name raueberbude.local;
    
    ssl_certificate /pfad/zu/localhost.crt;
    ssl_certificate_key /pfad/zu/localhost.key;
    
    root /pfad/zu/dist/raeuberbude;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Oder Docker mit SSL

```dockerfile
FROM nginx:alpine
COPY ssl/localhost.crt /etc/nginx/ssl/
COPY ssl/localhost.key /etc/nginx/ssl/
COPY nginx.conf /etc/nginx/nginx.conf
COPY dist/raeuberbude /usr/share/nginx/html
EXPOSE 443
```

## Zusammenfassung

✅ **Zertifikat erstellt** - `ssl/` Ordner  
✅ **Angular konfiguriert** - HTTPS aktiviert  
✅ **npm script** - `npm start` oder `npm run start:https`  
✅ **Dokumentiert** - Installations-Anleitungen für alle Plattformen  

### Nächste Schritte:

1. **Server starten**: `npm run start:https`
2. **Auf PC testen**: `https://localhost:4200`
3. **Zertifikat auf Handy installieren** (siehe oben)
4. **Auf Handy testen**: `https://192.168.56.1:4200`
5. ✅ **Mikrofon funktioniert!**

Die App läuft jetzt über HTTPS im gesamten lokalen Netzwerk! 🔒

