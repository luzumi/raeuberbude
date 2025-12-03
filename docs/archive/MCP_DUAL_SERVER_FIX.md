# MCP Dual-Server Konfiguration - Problem & Lösung

**Datum:** 2025-11-25  
**Status:** ✅ Implementiert

## Problem

Beim Versuch, zwei MCP-Server gleichzeitig zu betreiben (einen für Admin-Tests, einen für App-Header), traten folgende Fehler auf:

```
[ERROR] [Plugin(mcp/lm-studio)] stderr: Der Prozess kann nicht auf die Datei zugreifen, 
da sie von einem anderen Prozess verwendet wird.

[ERROR] [Plugin(mcp/lm-studio)] stderr: Error in LM Studio MCP bridge process: 
_0x2fb0b1 [McpError]: MCP error -32000: Connection closed
```

### Ursache

Beide MCP-Server (`lmStudio-local` und `lmStudio`) versuchten:
1. Die **gleiche Log-Datei** zu schreiben (`lm-mcp-launcher.log`)
2. Möglicherweise die gleiche **Python-Bridge-Instanz** zu starten
3. Auf die gleichen **Ressourcen** gleichzeitig zuzugreifen

## Lösung

### 1. Zwei unterschiedliche Server-Typen

**Admin-Test** nutzt die komplexe BAT/Python-Bridge, **App-Header** nutzt einen einfachen Node.js-Server:

**`C:\Users\corat\.lmstudio\mcp.json`:**
```json
{
  "mcpServers": {
    "lmStudio-local": {
      "command": "cmd",
      "args": ["/c", "tools\\lm-mcp-adapter\\mcp-launcher.bat"],
      "cwd": "C:\\Users\\corat\\.lmstudio\\extensions\\plugins\\mcp\\lm-studio",
      "env": {
        "LM_API_URL": "http://192.168.56.1:1234",
        "LM_STUDIO_BASE": "http://192.168.56.1:1234",
        "TCP_PORT": "3002",
        "USE_CLI": "true",
        "MCP_SERVER_ID": "admin",
        "COMSPEC": "C:\\Windows\\System32\\cmd.exe"
      }
    },
    "lmStudio": {
      "command": "node",  // ← Einfacher Node.js-Server
      "args": [
        "C:\\Users\\corat\\IdeaProjects\\raueberbude\\.specify\\mcp-servers\\lm-studio-mcp-server.js"
      ],
      "env": {
        "LM_STUDIO_URL": "http://127.0.0.1:1234"  // ← localhost für App-Header
      }
    }
  }
}
```

### 2. Einfacher Node.js MCP-Server für App-Header

Der App-Header nutzt den einfachen MCP-Server unter `.specify/mcp-servers/lm-studio-mcp-server.js`:

```javascript
// Keine BAT-Dateien, keine komplexen Bridges - einfach Node.js!
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234';
```

**Vorteile:**
- ✅ Kein Datei-Zugriff-Konflikt (keine shared Log-Dateien)
- ✅ Keine Python-Bridge nötig
- ✅ Direkte HTTP-Kommunikation mit LM Studio
- ✅ Funktioniert out-of-the-box

### 3. Unterschiedliche Server-Architekturen

| Server | Typ | URL | Verwendung |
|--------|-----|-----|-----------|
| `lmStudio-local` | BAT + Python Bridge | `http://192.168.56.1:1234` | Admin-Test (CLI) |
| `lmStudio` | Node.js Direct | `http://127.0.0.1:1234` | App-Header (HTTP API) |

## Geänderte Dateien

1. ✅ `C:\Users\corat\.lmstudio\mcp.json`
2. ✅ `C:\Users\corat\IdeaProjects\raueberbude\tools\lm-mcp-adapter\mcp-launcher.bat`
3. ✅ `C:\Users\corat\.lmstudio\extensions\plugins\mcp\lm-studio\tools\lm-mcp-adapter\mcp-launcher.bat`

## Nächste Schritte

1. **LM Studio neu starten**
2. Beide MCP-Server sollten jetzt parallel funktionieren
3. Im LM Studio Developer Log sollten beide Server erfolgreich starten:
   ```
   [DEBUG] [Client=plugin:installed:mcp/lm-studio-local] Client created.
   [DEBUG] [Client=plugin:installed:mcp/lm-studio] Client created.
   ```

## Debugging

**Log-Dateien prüfen:**
```powershell
# Admin-Test Log (nur dieser Server hat eine Log-Datei)
Get-Content "$env:TEMP\lm-mcp-launcher-admin.log" -Tail 20
```

**App-Header Debug:**
Der Node.js-Server schreibt Fehler nach `stderr`. Prüfe die LM Studio Developer Logs:
```
Developer Logs → Filter: "lmStudio" oder "mcp-servers"
```

**Teste den App-Header-Server manuell:**
```powershell
# Test-Request senden
node .specify/mcp-servers/lm-studio-mcp-server.js
# Dann JSON-RPC Request eingeben:
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_models","arguments":{}}}
```

## Architektur

```
LM Studio HTTP API (Port 1234)
    ↓
    ├─→ lmStudio-local (Admin-Test)
    │   ├─ Type: BAT → Python Bridge → LM Studio CLI
    │   ├─ URL: http://192.168.56.1:1234
    │   ├─ Port: 3002 (TCP)
    │   ├─ Log: lm-mcp-launcher-admin.log
    │   └─ USE_CLI: true
    │
    └─→ lmStudio (App-Header)
        ├─ Type: Node.js → LM Studio HTTP API
        ├─ URL: http://127.0.0.1:1234
        ├─ Protocol: stdio (JSON-RPC)
        └─ USE_CLI: false
```

**Wichtig:** Der App-Header-Server nutzt **stdio** (Standard-Input/Output) für die MCP-Kommunikation, 
nicht TCP/IP. Daher kein Port-Konflikt!

## Wichtige Hinweise

- Die beiden Server können **parallel** laufen
- Jeder Server hat seine eigene **Log-Datei**
- Jeder Server nutzt einen eigenen **TCP-Port** (3002 vs 3003)
- Der Admin-Test nutzt die **Netzwerk-IP** (`192.168.56.1`)
- Der App-Header nutzt **localhost** (`127.0.0.1`)

## Fehlerbehebung

**Problem:** Server startet nicht  
**Lösung:** Prüfe die Log-Datei im `%TEMP%` Verzeichnis

**Problem:** "Connection closed" Fehler  
**Lösung:** Stelle sicher, dass beide Ports (3002, 3003) frei sind

**Problem:** "Der Prozess kann nicht auf die Datei zugreifen"  
**Lösung:** Prüfe, ob `MCP_SERVER_ID` korrekt gesetzt ist

---

**Test erfolgreich:** Nach LM Studio Neustart sollten beide Server funktionieren! 🚀

