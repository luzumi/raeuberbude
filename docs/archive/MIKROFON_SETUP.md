# 🎤 Mikrofon auf Handy aktivieren

## ℹ️ Wann ist das nötig?

**In den meisten Fällen: NICHT!** Die App sollte nach Login und Mikrofon-Berechtigung einfach funktionieren.

**Nur wenn** dein Browser Mikrofon bei HTTP blockiert (Fehlermeldung im Browser), dann folge dieser Anleitung:

## ⏱️ 30 Sekunden Setup (Chrome Android)

### Schritt 1: IP herausfinden (am PC)

Öffne PowerShell:
```powershell
ipconfig | Select-String "IPv4"
```

Notiere deine IP (z. B. `192.168.178.25`)

---

### Schritt 2: Chrome-Flag setzen (auf Handy)

1. **Öffne Chrome** auf dem Handy
2. Gib in die Adresszeile ein: `chrome://flags`
3. **Suche:** "Insecure origins treated as secure"
4. **Trage ein:** `http://192.168.178.25:4301` (deine IP + `:4301`)
5. Setze auf **"Enabled"**
6. Klicke **"Relaunch"**

---

### Schritt 3: App öffnen

```powershell
# Am PC starten
npm run start:network
```

**Auf dem Handy öffnen:** `http://192.168.178.25:4301` (deine IP)

---

## ✅ Fertig!

Mikrofon funktioniert jetzt auch über HTTP (ohne HTTPS/Zertifikate/ngrok).

---

## 💡 Warum funktioniert das?

Browser blockieren Mikrofon bei HTTP aus Sicherheitsgründen. Mit dem Flag sagst du Chrome: "Diese IP ist sicher, erlaube Mikrofon."

---

## 🔧 Mehrere IPs?

Wenn du mehrere Netzwerke nutzt (z. B. WLAN + VPN), trenne mit Komma:

```
http://192.168.178.25:4301,http://192.168.56.1:4301
```

---

## ❓ Probleme?

**Mikrofon wird trotzdem blockiert?**
→ Chrome neu gestartet? (Relaunch-Button geklickt?)

**Flag-Einstellung nicht gefunden?**
→ Chrome updaten (mind. Version 90+)

**IP ändert sich ständig?**
→ Im Router feste IP vergeben (DHCP-Reservierung)

Mehr: [docs/SSL_SETUP.md](SSL_SETUP.md)

