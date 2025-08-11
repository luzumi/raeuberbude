#!/bin/bash
# Run the logging app and MongoDB via Docker Compose.
# Logs are written to logs/run.log for later inspection.

set -euo pipefail

LOG_DIR="logs"
mkdir -p "$LOG_DIR"

# Build and start containers in the background
# so the script continues after starting them.
docker-compose up --build -d

# Stream container logs to both the console and a file.
docker-compose logs -f | tee "$LOG_DIR/run.log"
