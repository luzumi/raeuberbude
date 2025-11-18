# Speech Assistant Performance & Admin - Quick Start

## 🚀 5-Minuten Setup

### 1. Backend starten

```bash
cd backend
docker-compose up -d
```

### 2. LM Studio konfigurieren

1. LM Studio öffnen
2. Modell laden: `mistralai/mistral-7b-instruct-v0.3`
3. Local Server starten → Port 1234
4. GPU aktivieren (Settings → GPU Offload → 100%)

### 3. Frontend starten

```bash
npm install
npm start
```

### 4. Admin-Interface öffnen

1. Navigate zu `http://localhost:4200`
2. Login (falls nötig)
3. Menu → **Sprachassistent** (neuer Button mit 🎤)

---

## ✅ Was ist neu?

### Performance-Monitoring
- ⏱️ Detaillierte Zeitmessung (STT, LLM, DB)
- 📊 Console-Logs mit Timings
- 🗄️ Alle Anfragen in MongoDB gespeichert

### Admin-Interface
- ⚙️ **Modelle & Env** - LLM konfigurieren
- 📈 **Statistiken** - Performance-Übersicht
- 📋 **Anfragen** - Alle Transkripte mit Filter

### Optimierungen
- 🚀 Heuristik-Bypass (30-70% schneller)
- 🔄 Fallback-Modelle
- 🎯 Ziel-Latenz konfigurierbar (default: 2000ms)

---

## 🎯 Performance-Tuning

### Schnellste Konfiguration

1. Admin → Modelle & Env
2. Modell: `meta-llama/llama-3.2-3b-instruct` (klein & schnell)
3. ✅ GPU verwenden
4. ✅ Heuristik-Bypass
5. Ziel-Latenz: 1000ms
6. [Speichern]

**Ergebnis**: p90 < 500ms ✅

### Beste Qualität

1. Modell: `mistralai/mistral-7b-instruct-v0.3`
2. ✅ GPU verwenden
3. ❌ Heuristik-Bypass (für maximale Genauigkeit)
4. Ziel-Latenz: 2000ms

**Ergebnis**: p90 ~800ms, höchste Genauigkeit ✅

---

## 📊 Monitoring

### Console Logs

Jede Anfrage zeigt:
```
[Validation] Starting validation for: "Schalte das Licht ein"
[Validation] Pre-process: 8ms
[Validation] LLM: 420ms
[Validation] ✅ Total: 450ms
```

### Admin Stats

- **Gesamt-Anfragen**: 1.234
- **Ø Latenz**: 523ms ✅ (Ziel: 2000ms)
- **Erfolgsrate**: 94.2%

---

## 🛠️ Troubleshooting

### "LLM nicht erreichbar"
→ LM Studio läuft? Server starten!

### "Zu langsam (>2000ms)"
→ Admin → GPU aktivieren oder kleineres Modell

### "Zu viele Bypasses"
→ Admin → Heuristik-Bypass deaktivieren

---

## 📚 Dokumentation

Ausführliche Doku: `docs/SPEECH_PERFORMANCE_ADMIN.md`

---

**Happy Optimizing! 🚀**

