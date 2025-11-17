# Raeuberbude

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.1.

## 🚀 Quick Start

### Lokale Entwicklung (PC only)

```powershell
npm start
# Öffne http://localhost:4200/
```

### Netzwerk-Zugriff (PC + Handy im LAN)

```powershell
npm run start:network
# Frontend: http://localhost:4301/ oder http://<deine-IP>:4301/
# Backend: http://localhost:3001/
# MCP-Server: verschiedene Ports (siehe Konsole)
```

### Mikrofon-Zugriff vom Handy

Die App funktioniert auf jedem Gerät, wo der Benutzer **eingeloggt ist** und **Mikrofon-Berechtigung erteilt** hat.

**Keine zusätzlichen Schritte nötig!** Einfach:
1. Im Browser öffnen: `http://<deine-IP>:4301` (z. B. `http://192.168.178.25:4301`)
2. Einloggen
3. Mikrofon-Berechtigung erlauben (Browser fragt beim ersten Mal)
4. Spracheingabe nutzen

**Hinweis:** Bei manchen Browsern (Chrome/Firefox) ist für HTTP-Zugriff ein einmaliges Flag erforderlich. Siehe [docs/MIKROFON_SETUP.md](docs/MIKROFON_SETUP.md) für Details.

---

# Projektbuch: Angular Home Assistant Dashboard – "Räuberbude"

## Überblick
Ziel des Projekts ist es, ein modernes, leichtgewichtiges Dashboard zur Steuerung und Visualisierung von Home Assistant Entitäten mit Angular 20 (Standalone) zu erstellen. Das Projekt wird modular aufgebaut und vermeidet klassische Angular-Module zugunsten von Standalone-Komponenten.

---

## Was haben wir gemacht?

### 1. Projektinitialisierung
- Projekt mit Angular 20 erstellt
- Standalone-Modus verwendet (`--standalone`, keine NgModules)
- SCSS als Stylesprache gewählt
- Routing aktiviert
- Angular Material eingebunden

### 2. Struktur geschaffen
- Ordnerstruktur definiert: `core/`, `features/`, `app.config.ts`, `app.routes.ts`
- `HomeAssistantService`-Service erstellt zur Kommunikation mit der Home Assistant API
- Proxy-Konfiguration zur Umgehung von CORS eingerichtet

### 3. Erste Funktion umgesetzt
- `LampToggleComponent` entwickelt
  - Steuert eine neue Lampe `light.wiz_tunable_white_640190`
  - Liest Status über REST API (`/api/states/...`)
  - Schaltet per POST über `/api/services/light/turn_on|off`

### 4. Fehler behoben
- `HttpClient`-Bereitstellung auf `provideHttpClient()` umgestellt (modern)
- CORS-Probleme durch `proxy.conf.json` mit `/api`-Rewrite gelöst
- Standalone-Komponenten korrekt mit Imports und Routing integriert
- Fehlerbehandlung beim Lampenschalter verbessert (subscribe mit next/error)
- **Login & Routing:** Login-Seite unter `/login`; erfolgreiche Anmeldung führt zur Startseite `/`, die Ansicht "Bude" ist über `/raeuberbude` erreichbar.
- **Login-UI:** Überarbeiteter Login-Screen mit Glow-Effekt, der Stilelemente aus `/raub1` übernimmt.
- **TV-Steuerung:** Samsung-TV-Komponente im Stil von `/raub1` mit WebSocket-Anbindung und Dropdowns für FireTV- und Samsung-Befehle.
- **FireTV:** Eigene Komponente lädt verfügbare Befehle per WebSocket und stellt sie als Dropdown bereit.
- **RoomMenu:** Minimalansicht des Samsung-TV mit Grundfunktionen (Power, Lautstärke, Sender, Quelle).
- **Samsung-TV Minimal:** Überarbeitete Statuskacheln mit Gerät, Zustand (inkl. letzter Änderung), Lautstärke und Quelle.
- **Samsung-TV Service:** Power- und Remote-Befehle zentralisiert, Fernseher lässt sich nun in allen Ansichten ein- und ausschalten.

### 5. Struktur reorganisiert
- Komponenten für wiederverwendbare UI-Elemente liegen nun unter `src/app/shared/components`.
- Raumansichten (z. B. *Bude*) und ihre Geräte befinden sich unter `src/app/features/rooms/`.
- Globale Services werden per Alias (`@services`, `@shared`, `@rooms`) importiert.
- "Dumb" Presentational Components ohne API-Calls leben unter `src/app/components` und werden von Containern in `features/` gesteuert.

### 6. Benutzerprofil & Header-Navigation
- Neuer `UserProfileComponent` unter `src/app/components/user-profile`.
- Avatar im Header führt zur Profilansicht; Menu-, Zurück- und Logout-Buttons sind klar angeordnet.

---

## Warum haben wir das so gemacht?

- **Standalone-Struktur:** spart Boilerplate, klarere Imports, schnellere Navigation zwischen Komponenten
- **Proxy-Lösung:** eleganter, sicherer Entwicklungsweg ohne Home Assistant direkt anzupassen
- **Trennung in `core/` und `features/`** hilft bei Erweiterbarkeit (z. B. zusätzliche Entitäten, Räume, Sensoren)
- **Material UI:** für saubere, einheitliche Oberfläche ohne viel Eigenaufwand

---

## Was ist wichtig zu wissen / merken?

- Alle API-Aufrufe nutzen `/api/...` (durch Angular Proxy umgeschrieben)
- Für Zugriffe aus dem Heimnetz: `ng serve --host=0.0.0.0` starten –
  durch die relative API-URL (`/api`) funktionieren Samsung-TV und Lampen
  auch auf anderen Geräten.
- Token liegt aktuell noch im `environment.ts` – später sicherer handhaben
- App läuft vollständig standalone, `AppComponent` bootstrapped direkt (`bootstrapApplication()`)
- Kein klassisches `AppModule` oder `NgModule` nötig
- Default-Login: `admin` / `secret` (lokale Demo-Datenbank)
- Globale Styles liegen in `src/styles/styles.scss`, wiederverwendbare Design-Tokens in `src/styles/_tokens.scss` und Mixins in `src/styles/_mixins.scss`.
- Responsive Breakpoints und Variablen liegen in `src/styles/_breakpoints.scss` und `src/styles/_responsive.scss`.

---

## Was haben wir bereits erreicht?

- ✅ Projektstruktur und Konfiguration
- ✅ Verbindung zu Home Assistant funktioniert
- ✅ Erster Schalter (Lampe) ist sichtbar und steuerbar
- ✅ Proxy für CORS eingerichtet und stabil
- ✅ Routing funktioniert standalone
- ✅ Material-Design eingebunden
- ✅ "Bude" nutzt nun den radialen Hintergrund der Raumübersicht; Gerätekacheln behalten ihre Farben mit sanftem Gradient
- ✅ "Bude" zeigt seine Geräte nun in einem 2×3-Grid, jedes Gerät besitzt einen Zurück-Button zur Rückkehr in die Übersicht
- ✅ App-Header mit Profil-Link, Menü-Routing und Logout-Schaltfläche
- ✅ Samsung-TV Ansicht nutzt jetzt ein Kachel-Layout und bindet eine angepasste FireTV-Steuerung ein

---

## Was ist der nächste Schritt?

### Konzeptphase: Struktur der "Räuberbude"

Wir planen die Startseite als eine Art **visuelles Geräte-Dashboard**:
- Jede Gerätegruppe (Fernseher, PC, Laptop, Lampe, Handy) erscheint als **Kachel** auf der Startseite
- Klick auf eine Kachel:
  - vergrößert die Kachel dynamisch (andere weichen zur Seite)
  - zeigt Detailsteuerung und Statusinformationen

### Gerätegruppen (erkannt in der Wohnung):
- 📺 Fernseher (HA-Media-Entity)
- 🖥️ PC (evtl. Switch/Sensor)
- 💻 Laptop (Tracker + evtl. WOL)
- 💡 Lampe (bereits integriert)
- 📱 Handy (Tracker, Batterie, Charger, Schlaf-Status etc.)

### Technisch umsetzbar als:
- [ ] `DeviceGroupComponent`: Wiederverwendbare Komponente für eine Gruppe
- [ ] `DashboardHomeComponent`: Layout mit Grid oder flexibler Anordnung
- [ ] Dynamische Kachelgrößen mit Animation (z. B. über Angular Animations + CSS Grid)
- [ ] Routing optional für Details oder reaktiv eingeblendet

### UI-Ideen:
- Startansicht: 5 Kacheln in Reihe/Spalten-Layout
- Bei Klick auf Gerät: zoomt in den Fokus (andere verkleinern oder blenden aus)
- Später auch Drag & Drop oder responsive Anpassung je nach Bildschirmgröße

---

## Aufgabenplan für Umsetzung
- [ ] `DashboardHomeComponent` mit Grid/Kacheln erstellen
- [ ] `DeviceGroupComponent` (z. B. mit `@Input()` für Icon, Name, Entitäten)
- [ ] Click-Verhalten definieren: Gerät fokussieren/vergrößern
- [ ] Erste Geräte einbinden: Fernseher, PC, Laptop, Lampe, Handy
- [ ] Styles & Animationen definieren (Responsivität & Fokuswechsel)
- [ ] Detailanzeige bei Klick (Popup oder Inline)

---

## Logging-Server

Zur Nachverfolgung von WebSocket-Nachrichten und Benutzeraktionen wurde ein einfacher Logging-Server unter `server/` ergänzt.
Dieser nutzt **MongoDB** als Datenbank und speichert Ereignisse in einer `logs`-Kollektion. Sensible Felder werden vor dem
Speichern entfernt, und Benutzerkennungen werden gehasht, um den Datenschutz zu wahren. Über einen zusätzlichen
`/users`-Endpunkt lassen sich pseudonymisierte Benutzerinformationen ablegen.

### Start

```bash
MONGO_URI=mongodb://localhost:27017/raeuberbude npm run serve:logs
```

Der Server lauscht standardmäßig auf Port `3000` und stellt sowohl einen REST-Endpunkt (`/logs/user-action`) als auch einen
WebSocket-Server bereit, der eingehende Nachrichten automatisch protokolliert.

---


## Logging-Server

Ein Node.js-Backend unter `backend/` protokolliert WebSocket-Nachrichten
und Benutzeraktionen in einer MongoDB-Datenbank. Es werden lediglich
pseudonyme Benutzerkennungen gespeichert.

### Starten
```bash
cd backend
npm install
npm start
```
### Docker

Der Logging-Server und eine passende MongoDB lassen sich auch per Docker starten:
```bash
# Container bauen und starten
docker-compose up --build
Die Anwendung ist anschließend unter http://localhost:3000 erreichbar;
MongoDB lauscht auf Port 27017. Beende beide Container mit
`docker-compose down`.

## Web MCP Server (Chrome DevTools)

Ein generischer MCP-Server zur Browser-Steuerung via Chrome DevTools (Puppeteer) liegt unter
`/.specify/mcp-servers/web-mcp-server.js`. Er ermöglicht Agenten Zugriff auf das reale Frontend,
inkl. Navigieren, Interaktionen, Evaluate, Screenshots sowie Console-/Netzwerk-Logs.

### Starten (Windows)

```bash
npm run mcp:web:local             # startet headless (new) auf Port 4200
npm run mcp:web:headed:win        # mit sichtbarem Browser (MCP_HEADLESS=false)
```
Hinweis: Falls dein Angular Dev-Server auf 4200 läuft, nutze für den MCP z. B. `MCP_PORT=4210`.

### API Quickstart

- `GET  /health` – Status, offene Sessions, Headless-Modus
- `GET  /tools` – Tool-Discovery für Agenten (Operationen + Schemas)
- `POST /sessions` – neue Browser-Session (Body: `{ url?, headless?, viewport?, userAgent? }`)
- `POST /sessions/:id/navigate` – Seite laden (`{ url, waitUntil?, timeout? }`)
- `POST /sessions/:id/waitForSelector` – auf Element warten (`{ selector, timeout? }`)
- `POST /sessions/:id/click` – klicken (`{ selector, button?, clickCount? }`)
- `POST /sessions/:id/type` – tippen (`{ selector, text, delay? }`)
- `POST /sessions/:id/pressKey` – Taste senden (`{ key, selector? }`)
- `POST /sessions/:id/evaluate` – JS im Page-Context ausführen (`{ expression, arg? }`)
- `GET  /sessions/:id/content` – aktuelle HTML-Inhalte
- `POST /sessions/:id/screenshot` – Screenshot (Base64 + optional speichernder Pfad)
- `GET  /sessions/:id/logs/console` – Console-Logs
- `GET  /sessions/:id/logs/network` – Netzwerk-Logs

### Beispiel (cURL)

```bash
# 1) Session erstellen und navigieren (Angular läuft hier beispielhaft auf 4300)
curl -s -X POST http://localhost:4200/sessions -H "Content-Type: application/json" -d '{"url":"http://localhost:4300"}'
# => { "success": true, "sessionId": "sess_xxx" }

# 2) Auf ein Element warten
curl -s -X POST http://localhost:4200/sessions/sess_xxx/waitForSelector -H "Content-Type: application/json" -d '{"selector":"app-root"}'

# 3) Screenshot erstellen und lokal ablegen
curl -s -X POST http://localhost:4200/sessions/sess_xxx/screenshot -H "Content-Type: application/json" -d '{"path":"./screenshots/home.png"}'
```
Agenten können `/tools` abfragen und die bereitgestellten Operationen als Werkzeuge nutzen.

## Tests

Um die Unit-Tests auszuführen, wird ein Chrome- bzw. Chromium-Browser benötigt. Sollte die automatische Suche fehlschlagen, kann der Pfad über die Umgebungsvariable `CHROME_BIN` gesetzt werden:

```bash
CHROME_BIN=/pfad/zu/chromium npm test

## Animation
