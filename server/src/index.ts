import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { handleConnection } from "./handlers/connection.js";
import { peerManager } from "./services/peerManager.js";
import { roomManager } from "./services/roomManager.js";
import { createLogger } from "./utils/logger.js";

const log = createLogger("Server");

const PORT = parseInt(process.env.PORT || "3001", 10);
const WS_PATH = process.env.WS_PATH || "/ws";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// ─── Express App ───────────────────────────────────────────

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:", "https://*.firebaseio.com", "https://*.googleapis.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(","),
  methods: ["GET", "POST"],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: "1mb" }));

// Rate limiting — API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Rate limiting — WebSocket upgrade (stricter)
const wsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many connection attempts",
});

// ─── Health Check ──────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    peers: peerManager.totalPeers,
    rooms: roomManager.getAllRooms().size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Static Files (production) ─────────────────────────────

app.use(express.static("public"));
app.get("*", (_req, res) => {
  res.sendFile("public/index.html", { root: process.cwd() });
});

// ─── Error Handler ─────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error("Unhandled Express error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

// ─── HTTP + WebSocket Server ───────────────────────────────

const server = createServer(app);

const wss = new WebSocketServer({
  server,
  path: WS_PATH,
});

wss.on("connection", (ws: import("ws").WebSocket, req: import("http").IncomingMessage) => {
  handleConnection(ws, req);
});

// Track connection rate per IP
const connectionCounts = new Map<string, { count: number; resetAt: number }>();

// ─── Graceful Shutdown ─────────────────────────────────────

let isShuttingDown = false;

function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log.info("Shutting down...");

  // Stop accepting new connections
  server.close(() => {
    log.info("HTTP server closed");
  });

  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    client.close(1001, "Server shutting down");
  });

  roomManager.shutdown();

  // Force exit after 5s
  setTimeout(() => {
    log.warn("Forcing shutdown after timeout");
    process.exit(1);
  }, 5000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  log.error("Uncaught exception", { error: err.message, stack: err.stack });
  shutdown();
});

process.on("unhandledRejection", (reason) => {
  log.error("Unhandled rejection", { reason: String(reason) });
});

// ─── Start Server ──────────────────────────────────────────

server.listen(PORT, () => {
  log.info(`AirShare signaling server running`, {
    port: PORT,
    wsPath: WS_PATH,
    pid: process.pid,
    nodeEnv: process.env.NODE_ENV || "development",
  });
});
