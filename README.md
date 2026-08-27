# AirShare 📡

WebRTC P2P File & Clipboard Sharing Web App — AirDrop-style, cross-platform, zero-cost-hostable.

## Features

- 🔒 **End-to-End Encrypted** — All file transfers via WebRTC DataChannel (DTLS/SCTP)
- 🌐 **Dual Discovery** — Local auto-discovery (same IP) + Cross-network (PIN/QR)
- 🔐 **Firebase Auth** — Optional authenticated mode for cross-device sync
- 📋 **Clipboard Sync** — Real-time text/link sharing between peers
- 🎯 **Radar UI** — Beautiful spatial discovery view with animated device cards
- 📦 **Backpressure Flow Control** — Prevents memory leaks with chunked 32KB transfers
- ✅ **SHA-256 Verification** — File integrity check on every transfer

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS v4, Zustand |
| Backend | Node.js, `ws` WebSocket library, Express (health check) |
| Auth | Firebase Admin SDK v12 (optional) |
| WebRTC | STUN (Google) + TURN (Metered.ca) |
| Deployment | Docker multi-stage build |

## Quick Start

### Prerequisites
- Node.js >= 20
- pnpm

### Development

```bash
# Install dependencies
pnpm install

# Start dev servers (client:5173 + server:3001)
pnpm dev
```

### Production Build

```bash
pnpm build
```

### Docker

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Build and run
docker compose up -d
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `IP_SALT` | Yes | Secret salt for IP-based room hashing |
| `FIREBASE_PROJECT_ID` | No | Firebase project ID (enables auth) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | No | Firebase service account JSON |
| `TURN_URL` | No | TURN server URL (Metered.ca) |
| `TURN_USERNAME` | No | TURN server username |
| `TURN_CREDENTIAL` | No | TURN server credential |
| `LOG_LEVEL` | No | Logging level: debug, info, warn, error |

## Architecture

```
┌──────────────┐     WebSocket      ┌──────────────────┐
│   Client A   │◄────(signaling)───►│  Signaling Server │
│              │                    │  (Node.js + ws)   │
│   WebRTC     │◄──(P2P transfer)──►│                   │
│   DataChannel│                    │  No file data     │
└──────────────┘                    │  touches server   │
                                    └──────────────────┘
```

## Project Structure

```
airshare/
├── client/          # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # React hooks
│   │   ├── lib/          # Core libraries (WebRTC, signaling, crypto)
│   │   ├── store/        # Zustand state management
│   │   └── types/        # TypeScript types
├── server/          # Node.js signaling server
│   ├── src/
│   │   ├── handlers/     # WebSocket message handlers
│   │   ├── services/     # Room/peer management, Firebase
│   │   └── utils/        # IP hashing, sanitization, logging
├── shared/          # Shared TypeScript types
├── Dockerfile       # Multi-stage production build
└── docker-compose.yml
```

## License

MIT
