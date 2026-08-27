#!/bin/bash
# AirShare Deploy Script
# Usage: bash deploy.sh

set -e

echo "🚀 Building AirShare for production..."

# Build client
echo "📦 Building client..."
cd client
pnpm install
pnpm build
cd ..

# Build server
echo "📦 Building server..."
cd server
pnpm install
npx tsc
cd ..

echo "✅ Build complete!"
echo ""
echo "📁 Output files:"
echo "   Client: client/dist/"
echo "   Server: server/dist/"
echo ""
echo "🐳 To deploy with Docker:"
echo "   docker compose build && docker compose up -d"
echo ""
echo "☁️  To deploy to cloud:"
echo "   1. Frontend → Vercel / Cloudflare Pages"
echo "   2. Backend  → Railway / Koyeb"
