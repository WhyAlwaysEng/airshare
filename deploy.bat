@echo off
REM AirShare Deploy Script for Windows
REM Usage: deploy.bat

echo 🚀 Building AirShare for production...

REM Build client
echo 📦 Building client...
cd client
call pnpm install
call pnpm build
cd ..

REM Build server
echo 📦 Building server...
cd server
call pnpm install
call npx tsc
cd ..

echo ✅ Build complete!
echo.
echo 📁 Output files:
echo    Client: client\dist\
echo    Server: server\dist\
echo.
echo 🐳 To deploy with Docker:
echo    docker compose build ^&^& docker compose up -d
echo.
echo ☁️  To deploy to cloud:
echo    1. Frontend → Vercel / Cloudflare Pages
echo    2. Backend  → Railway / Koyeb
pause
