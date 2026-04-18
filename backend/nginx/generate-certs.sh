#!/bin/sh
# Generates a self-signed certificate valid for 10 years.
# Replace with Let's Encrypt certs for production (just swap cert.pem + key.pem).
#
# Usage: ./generate-certs.sh [hostname]
#   hostname defaults to localhost

set -e

HOSTNAME="${1:-localhost}"
DIR="$(cd "$(dirname "$0")/certs" && pwd)"

openssl req -x509 -nodes -newkey rsa:4096 \
  -keyout "$DIR/key.pem" \
  -out    "$DIR/cert.pem" \
  -days   3650 \
  -subj   "/CN=$HOSTNAME/O=Räuberbude/C=DE" \
  -addext "subjectAltName=DNS:$HOSTNAME,DNS:localhost,IP:127.0.0.1"

echo "✓ Certificates written to $DIR"
echo "  cert.pem  – ${HOSTNAME} (valid 10 years)"
echo "  key.pem   – private key"
echo ""
echo "To trust the cert on this machine (Linux):"
echo "  sudo cp $DIR/cert.pem /usr/local/share/ca-certificates/raeuberbude.crt"
echo "  sudo update-ca-certificates"
