#!/bin/bash

echo ""
echo "========================================"
echo "   Raeuberbude - Universal Starter"
echo "   Alle Server in eigenen Tabs"
echo "========================================"
echo ""

# Wechsle zum Projektverzeichnis
cd "$(dirname "$0")/.." || exit 1

# Prüfe ob Docker läuft (für optionale Services)
DOCKER_AVAILABLE=0
if command -v docker &> /dev/null && docker ps &> /dev/null 2>&1; then
    DOCKER_AVAILABLE=1
    echo "[✓] Docker ist verfügbar"
else
    echo "[!] Docker ist nicht verfügbar - STT Services werden übersprungen"
fi

echo ""
echo "========================================"
echo "   Wähle Start-Modus:"
echo "========================================"
echo ""
echo "   [1] Komplett-Setup (mit Docker STT Services)"
echo "   [2] Development-Setup (nur Backend + Frontend + MCP)"
echo "   [3] Minimal-Setup (nur Backend + Frontend)"
echo "   [4] Nur Frontend"
echo "   [5] Nur Backend"
echo "   [6] Nur MCP Server"
echo "   [7] Nur Docker STT Services"
echo "   [8] Beenden"
echo ""

# Funktionsdefinitionen zuerst
START_COMPLETE() {
    echo ""
    echo "========================================"
    echo "   Starte Komplett-Setup..."
    echo "========================================"

    if [ $DOCKER_AVAILABLE -eq 1 ]; then
        echo "[1/5] Starte Docker STT Services..."
        cd backend || exit 1
        docker-compose down > /dev/null 2>&1
        docker-compose up -d mongo vosk whisper
        cd ..
        sleep 5
    fi

    echo "[2/5] Starte NestJS Backend..."
    # robustes Start-Kommando: installiert Abhängigkeiten falls nötig und startet per npm run start:dev
    NEST_START_CMD='cd backend/nest-app && if [ ! -d node_modules ] || [ ! -x node_modules/.bin/nest ]; then echo "[i] node_modules oder nest CLI fehlt - installiere Abhängigkeiten..."; npm install; fi; echo "[i] Starte NestJS (npm run start:dev)..."; npm run start:dev'
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --tab --title="NestJS Backend" -- bash -c "$NEST_START_CMD; exec bash" &
    elif command -v xterm &> /dev/null; then
        xterm -title "NestJS Backend" -e "$NEST_START_CMD; exec bash" &
    else
        echo "Starte NestJS Backend im Hintergrund..."
        bash -c "$NEST_START_CMD" &
        # kein cd zurück nötig, der Befehl läuft in einem Subshell
    fi
    sleep 5

    echo "[3/5] Starte MCP Server..."
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --tab --title="MCP Server" -- bash -c "cd .specify/mcp-servers && npm run all; exec bash" &
    elif command -v xterm &> /dev/null; then
        xterm -title "MCP Server" -e "cd .specify/mcp-servers && npm run all; exec bash" &
    else
        echo "Starte MCP Server im Hintergrund..."
        bash -c "cd .specify/mcp-servers && npm run all" &
    fi
    sleep 3

    echo "[4/5] Starte Angular Dev Server..."
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --tab --title="Angular Dev" -- bash -c "ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json; exec bash" &
    elif command -v xterm &> /dev/null; then
        xterm -title "Angular Dev" -e "ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json; exec bash" &
    else
        echo "Starte Angular Dev Server im Hintergrund..."
        ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json &
    fi

    echo "[5/5] Warte auf Start..."
    sleep 15

    SHOW_STATUS_COMPLETE
}

START_DEVELOPMENT() {
    echo ""
    echo "========================================"
    echo "   Starte Development-Setup..."
    echo "========================================"

    echo "[1/3] Starte NestJS Backend..."
    NEST_START_CMD='cd backend/nest-app && if [ ! -d node_modules ] || [ ! -x node_modules/.bin/nest ]; then echo "[i] node_modules oder nest CLI fehlt - installiere Abhängigkeiten..."; npm install; fi; echo "[i] Starte NestJS (npm run start:dev)..."; npm run start:dev'
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --tab --title="NestJS Backend" -- bash -c "$NEST_START_CMD; exec bash" &
    else
        bash -c "$NEST_START_CMD" &
    fi
    sleep 5

    echo "[2/3] Starte MCP Server..."
    gnome-terminal --tab --title="MCP Server" -- bash -c "cd .specify/mcp-servers && npm run all; exec bash" &
    sleep 3

    echo "[3/3] Starte Angular Dev Server..."
    gnome-terminal --tab --title="Angular Dev" -- bash -c "ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json; exec bash" &

    echo "Warte auf Start..."
    sleep 15

    SHOW_STATUS_DEV
}

START_MINIMAL() {
    echo ""
    echo "========================================"
    echo "   Starte Minimal-Setup..."
    echo "========================================"

    echo "[1/2] Starte NestJS Backend..."
    NEST_START_CMD='cd backend/nest-app && if [ ! -d node_modules ] || [ ! -x node_modules/.bin/nest ]; then echo "[i] node_modules oder nest CLI fehlt - installiere Abhängigkeiten..."; npm install; fi; echo "[i] Starte NestJS (npm run start:dev)..."; npm run start:dev'
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --tab --title="NestJS Backend" -- bash -c "$NEST_START_CMD; exec bash" &
    else
        bash -c "$NEST_START_CMD" &
    fi
    sleep 5

    echo "[2/2] Starte Angular Dev Server..."
    gnome-terminal --tab --title="Angular Dev" -- bash -c "ng serve --host 0.0.0.0 --port 4200; exec bash" &

    echo "Warte auf Start..."
    sleep 15

    SHOW_STATUS_MINIMAL
}

START_FRONTEND_ONLY() {
    echo ""
    echo "========================================"
    echo "   Starte nur Frontend..."
    echo "========================================"

    gnome-terminal --tab --title="Angular Dev" -- bash -c "ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json; exec bash" &
    sleep 10

    SHOW_STATUS_FRONTEND
}

START_BACKEND_ONLY() {
    echo ""
    echo "========================================"
    echo "   Starte nur Backend..."
    echo "========================================"

    NEST_START_CMD='cd backend/nest-app && if [ ! -d node_modules ] || [ ! -x node_modules/.bin/nest ]; then echo "[i] node_modules oder nest CLI fehlt - installiere Abhängigkeiten..."; npm install; fi; echo "[i] Starte NestJS (npm run start:dev)..."; npm run start:dev'
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --tab --title="NestJS Backend" -- bash -c "$NEST_START_CMD; exec bash" &
    elif command -v xterm &> /dev/null; then
        xterm -title "NestJS Backend" -e "$NEST_START_CMD; exec bash" &
    else
        bash -c "$NEST_START_CMD" &
    fi
    sleep 10

    SHOW_STATUS_BACKEND
}

START_MCP_ONLY() {
    echo ""
    echo "========================================"
    echo "   Starte nur MCP Server..."
    echo "========================================"

    gnome-terminal --tab --title="MCP Server" -- bash -c "cd .specify/mcp-servers && npm run all; exec bash" &
    sleep 5

    SHOW_STATUS_MCP
}

START_DOCKER_ONLY() {
    if [ $DOCKER_AVAILABLE -eq 0 ]; then
        echo "Docker ist nicht verfügbar!"
        END
    fi

    echo ""
    echo "========================================"
    echo "   Starte nur Docker STT Services..."
    echo "========================================"

    cd backend || exit 1
    docker-compose down > /dev/null 2>&1
    docker-compose up -d mongo vosk whisper
    cd ..
    sleep 10

    SHOW_STATUS_DOCKER
}

# Status-Funktionen
SHOW_STATUS_COMPLETE() {
    echo ""
    echo "========================================"
    echo "   Server-Status:"
    echo "========================================"
    echo ""

    if [ $DOCKER_AVAILABLE -eq 1 ]; then
        echo "[✓] STT Services:     MongoDB (27018), Vosk (2700), Whisper (9090)"
    fi
    echo "[✓] NestJS Backend:    http://localhost:3001"
    echo "[✓] Angular Frontend:  http://localhost:4200"
    echo "[✓] MCP Server:        Lokal gestartet"

    OPEN_BROWSER
}

SHOW_STATUS_DEV() {
    echo ""
    echo "========================================"
    echo "   Server-Status:"
    echo "========================================"
    echo ""
    echo "[✓] NestJS Backend:    http://localhost:3001"
    echo "[✓] Angular Frontend:  http://localhost:4200"
    echo "[✓] MCP Server:        Lokal gestartet"

    OPEN_BROWSER
}

SHOW_STATUS_MINIMAL() {
    echo ""
    echo "========================================"
    echo "   Server-Status:"
    echo "========================================"
    echo ""
    echo "[✓] NestJS Backend:    http://localhost:3001"
    echo "[✓] Angular Frontend:  http://localhost:4200"

    OPEN_BROWSER
}

SHOW_STATUS_FRONTEND() {
    echo ""
    echo "========================================"
    echo "   Server-Status:"
    echo "========================================"
    echo ""
    echo "[✓] Angular Frontend:  http://localhost:4200"

    OPEN_BROWSER
}

SHOW_STATUS_BACKEND() {
    echo ""
    echo "========================================"
    echo "   Server-Status:"
    echo "========================================"
    echo ""
    echo "[✓] NestJS Backend:    http://localhost:3001"

    OPEN_BROWSER
}

SHOW_STATUS_MCP() {
    echo ""
    echo "========================================"
    echo "   Server-Status:"
    echo "========================================"
    echo ""
    echo "[✓] MCP Server:        Lokal gestartet"

    END
}

SHOW_STATUS_DOCKER() {
    echo ""
    echo "========================================"
    echo "   Server-Status:"
    echo "========================================"
    echo ""

    if [ $DOCKER_AVAILABLE -eq 1 ]; then
        echo "[✓] STT Services:     MongoDB (27018), Vosk (2700), Whisper (9090)"
    fi

    END
}

OPEN_BROWSER() {
    echo ""
    echo "Öffne Browser..."
    sleep 5

    # Versuche verschiedenen Browser zu öffnen
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:4200
    elif command -v google-chrome &> /dev/null; then
        google-chrome http://localhost:4200
    elif command -v firefox &> /dev/null; then
        firefox http://localhost:4200
    fi

    echo ""
    echo "========================================"
    echo "   Fertig! Alle Server laufen."
    echo "========================================"
    echo ""
    echo "TIPS:"
    echo "- Jeder Server läuft in eigenem Tab"
    echo "- Schließe einzelne Tabs mit Ctrl+C"
    echo "- Für Neustart dieses Skript erneut ausführen"
    echo ""
}

END() {
    echo "Drücke Enter zum Beenden..."
    read
}

# Hauptprogramm
read -p "Deine Wahl (1-8): " choice

case $choice in
    1) START_COMPLETE ;;
    2) START_DEVELOPMENT ;;
    3) START_MINIMAL ;;
    4) START_FRONTEND_ONLY ;;
    5) START_BACKEND_ONLY ;;
    6) START_MCP_ONLY ;;
    7) START_DOCKER_ONLY ;;
    8) END ;;
    *)
        echo "Ungültige Wahl!"
        END
        ;;
esac
