#!/bin/bash
set -e

cd "$(dirname "$0")"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║         Bigmonee Installer           ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found."
    echo "   Install it: brew install node"
    exit 1
fi

echo "✓ Node.js $(node --version)"

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✓ Dependencies installed"
fi

# Create data directory
mkdir -p data/certs

# Create config if missing
if [ ! -f "data/config.json" ]; then
    cp config.default.json data/config.json
    echo "✓ Config created"
fi

# Detect local IP
LOCAL_IP=$(node scripts/get-local-ip.js)

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║           Bigmonee is starting...                ║"
echo "  ╠══════════════════════════════════════════════════╣"
echo "  ║                                                  ║"
echo "  ║  Dashboard:  http://localhost:3000                ║"
echo "  ║  Proxy:      $LOCAL_IP:8001               ║"
echo "  ║                                                  ║"
echo "  ║  iPhone Setup:                                   ║"
echo "  ║  1. Connect iPhone to same WiFi                  ║"
echo "  ║  2. WiFi → HTTP Proxy → Manual                   ║"
echo "  ║     Server: $LOCAL_IP   Port: 8001        ║"
echo "  ║  3. Safari → http://$LOCAL_IP:3001/api/cert║"
echo "  ║  4. Install + Trust the CA certificate           ║"
echo "  ║  5. Open Stockbit → token auto-captured          ║"
echo "  ║                                                  ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# Start backend + frontend concurrently
npx concurrently --kill-others \
  -n "server,vite" \
  -c "green,cyan" \
  "node src/server/server.js" \
  "npx vite --host"
