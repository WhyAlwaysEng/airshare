import { createHash } from "node:crypto";

const SALT = process.env.IP_SALT || "airshare-default-salt-change-me";

/**
 * Generate a deterministic room ID from client IP.
 * All devices behind the same public IP get the same room.
 */
export function generateRoomId(ip: string): string {
  return createHash("sha256").update(`${ip}${SALT}`).digest("hex").slice(0, 16);
}

/**
 * Extract real client IP from request, handling X-Forwarded-For (Cloudflare/proxy).
 */
export function extractClientIP(
  req: import("http").IncomingMessage,
  socket: import("net").Socket
): string {
  // Try X-Forwarded-For first (Cloudflare sets this)
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") {
    const firstIP = xff.split(",")[0].trim();
    if (firstIP) return firstIP;
  }

  // Try X-Real-IP
  const xri = req.headers["x-real-ip"];
  if (typeof xri === "string") return xri.trim();

  // Fall back to socket remote address
  return socket.remoteAddress || "127.0.0.1";
}
