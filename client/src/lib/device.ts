import type { DeviceOS, DeviceFormFactor, DeviceInfo } from "@/types";

// ─── OS Detection ──────────────────────────────────────────

export function detectOS(): DeviceOS {
  const ua = navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Win/.test(ua)) return "Windows";
  if (/Mac/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";

  return "Unknown";
}

// ─── Form Factor Detection ─────────────────────────────────

export function detectFormFactor(): DeviceFormFactor {
  const ua = navigator.userAgent;

  if (/Mobi|Android|iPhone|iPad|iPod/.test(ua)) {
    if (/iPad/.test(ua) || /Tablet/.test(ua)) return "tablet";
    return "mobile";
  }

  return "desktop";
}

// ─── Random Name Generation ────────────────────────────────

const ADJECTIVES = [
  "Swift", "Neon", "Cosmic", "Digital", "Quantum", "Electric", "Crystal",
  "Radiant", "Phantom", "Lunar", "Solar", "Turbo", "Blazing", "Frozen",
  "Mystic", "Stellar", "Thunder", "Velvet", "Wicked", "Golden", "Crimson",
  "Midnight", "Emerald", "Azure", "Ivory", "Scarlet", "Opal", "Amber",
  "Jade", "Coral", "Onyx", "Ruby", "Pearl", "Sapphire", "Diamond",
];

const ANIMALS = [
  "Falcon", "Fox", "Wolf", "Bear", "Owl", "Eagle", "Hawk", "Lynx",
  "Tiger", "Dolphin", "Phoenix", "Dragon", "Panther", "Cobra", "Raven",
  "Leopard", "Cheetah", "Penguin", "Seal", "Otter", "Panda", "Rabbit",
  "Butterfly", "Hummingbird", "Chameleon", "Gecko", "Crane", "Swan",
  "Mustang", "Jaguar", "Antelope", "Gazelle", "Orca", "Shark", "Manta",
];

// Seeded random for consistent names per session
let nameSeed = Math.floor(Math.random() * ADJECTIVES.length * ANIMALS.length);

export function generateName(): string {
  const adj = ADJECTIVES[nameSeed % ADJECTIVES.length];
  const animal = ANIMALS[Math.floor(nameSeed / ADJECTIVES.length) % ANIMALS.length];
  nameSeed++;
  return `${adj} ${animal}`;
}

// ─── Color Generation ──────────────────────────────────────

const PEER_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#3b82f6", // blue
  "#a855f7", // purple
  "#22c55e", // green
];

let colorIndex = 0;

export function generateColor(): string {
  const color = PEER_COLORS[colorIndex % PEER_COLORS.length];
  colorIndex++;
  return color;
}

// ─── Get Full Device Info ──────────────────────────────────

let cachedDevice: DeviceInfo | null = null;

export function getDeviceInfo(): DeviceInfo {
  if (cachedDevice) return cachedDevice;

  cachedDevice = {
    os: detectOS(),
    formFactor: detectFormFactor(),
    name: generateName(),
    color: generateColor(),
  };

  return cachedDevice;
}
