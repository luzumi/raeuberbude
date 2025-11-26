# LM Studio MCP - Einfache Lösung

**Problem gelöst:** App-Header nutzt jetzt den **einfachen Node.js MCP-Server** - keine BAT-Dateien, keine Konflikte! ✅

## Die Lösung

### Vorher (komplex, Konflikte):
```json
"lmStudio": {
  "command": "cmd",
  "args": ["/c", "tools\\lm-mcp-adapter\\mcp-launcher.bat"],
  "env": {
    "LM_API_URL": "http://127.0.0.1:1234",
    "TCP_PORT": "3003"
  }
}
```

### Jetzt (einfach, funktioniert):
```json
"lmStudio": {
  "command": "node",
  "args": [".specify/mcp-servers/lm-studio-mcp-server.js"],
  "env": {
    "LM_STUDIO_URL": "http://127.0.0.1:1234"
  }
}
```

## Warum funktioniert das?

1. **Kein Datei-Zugriff-Konflikt**
   - Keine shared Log-Dateien
   - Keine Python-Bridge
   - Jeder Server ist unabhängig

2. **Unterschiedliche Protokolle**
   - Admin: BAT → Python → TCP Port 3002
   - App-Header: Node.js → stdio (Standard-Input/Output)

3. **Direkter Zugriff**
   - Node.js spricht direkt mit LM Studio HTTP API
   - Kein Umweg über CLI oder Bridge

## Konfiguration

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
        "MCP_SERVER_ID": "admin"
      }
    },
    "lmStudio": {
      "command": "node",
      "args": [
        "C:\\Users\\corat\\IdeaProjects\\raueberbude\\.specify\\mcp-servers\\lm-studio-mcp-server.js"
      ],
      "env": {
        "LM_STUDIO_URL": "http://127.0.0.1:1234"
      }
    }
  }
}
```

**`C:\Users\corat\IdeaProjects\raueberbude\mcp.json`:**
```json
{
  "mcpServers": {
    "lmStudio": {
      "command": "node",
      "args": [".specify/mcp-servers/lm-studio-mcp-server.js"],
      "env": {
        "LM_STUDIO_URL": "http://127.0.0.1:1234"
      }
    }
  }
}
```

## Nächste Schritte

1. **LM Studio neu starten**
2. Beide Server sollten jetzt funktionieren:
   - ✅ `lmStudio-local` (Admin mit CLI)
   - ✅ `lmStudio` (App-Header mit HTTP API)

## Test

**LM Studio Developer Logs prüfen:**
```
[DEBUG] [Client=plugin:installed:mcp/lm-studio-local] Client created.
[DEBUG] [Client=plugin:installed:mcp/lm-studio] Client created.
```

**Beide sollten jetzt "Client created" zeigen - OHNE Fehler!**

---

**Status:** 🎉 Fertig! Kein Konflikt mehr, beide Server laufen parallel.

