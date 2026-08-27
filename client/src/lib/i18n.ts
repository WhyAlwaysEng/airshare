export type Locale = "th" | "en";

const STORAGE_KEY = "airshare-locale";

// ─── Translation Keys ──────────────────────────────────────

const translations = {
  en: {
    // App
    "app.name": "AirShare",
    "app.subtitle": "P2P File Sharing",

    // Header
    "header.connected": "Connected",
    "header.connecting": "Connecting",
    "header.disconnected": "Disconnected",

    // Auth
    "auth.login": "Sign In",
    "auth.register": "Sign Up",
    "auth.logout": "Sign Out",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.displayName": "Display Name",
    "auth.forgotPassword": "Forgot password?",
    "auth.noAccount": "Don't have an account?",
    "auth.hasAccount": "Already have an account?",
    "auth.loginWithGoogle": "Sign in with Google",
    "auth.orContinueWith": "or continue with",
    "auth.loginError": "Login failed",
    "auth.registerError": "Registration failed",
    "auth.passwordMismatch": "Passwords do not match",
    "auth.welcomeBack": "Welcome back!",
    "auth.createAccount": "Create account",
    "auth.guestMode": "Continue as Guest",

    // Discovery
    "discovery.waiting": "Waiting for other devices to join...",
    "discovery.hint": "Open AirShare on another device on the same network",
    "discovery.pairCrossNetwork": "Pair Cross-Network",
    "discovery.thisDevice": "This Device",
    "discovery.peers": "peers",
    "discovery.peer": "peer",
    "discovery.joined": "joined",
    "discovery.left": "left",

    // Transfer
    "transfer.sending": "Sending to",
    "transfer.receiving": "Receiving from",
    "transfer.activeTransfers": "Active Transfers",
    "transfer.complete": "Complete",
    "transfer.failed": "Failed",
    "transfer.cancel": "Cancel",
    "transfer.accept": "Accept",
    "transfer.decline": "Decline",
    "transfer.incoming": "Incoming File Transfer",
    "transfer.wantsToSend": "wants to send you files",
    "transfer.total": "Total",
    "transfer.files": "file(s)",
    "transfer.dropToShare": "Drop files to share",
    "releaseToStart": "Release to start sharing with nearby devices",
    "transfer.sentSuccessfully": "File sent successfully!",
    "transfer.receivedSuccessfully": "File received!",
    "transfer.declined": "Transfer declined",
    "transfer.failedMsg": "Transfer failed",
    "transfer.integrityError": "File integrity check failed",
    "transfer.emptyClipboard": "Clipboard is empty",
    "transfer.clipboardDenied": "Clipboard access denied",

    // Device card
    "device.clickOrDrop": "Click or drop files",
    "device.authenticated": "Authenticated",

    // Clipboard
    "clipboard.title": "Clipboard Sync",
    "clipboard.placeholder": "Type text to share...",
    "clipboard.syncButton": "Sync Clipboard",
    "clipboard.connectPeers": "Connect with peers to sync clipboard",
    "clipboard.sent": "Text sent",
    "clipboard.synced": "Clipboard synced",
    "clipboard.textFrom": "Text from",
    "clipboard.sentTo": "Sent to {{count}} peer(s)",

    // PIN Modal
    "pin.title": "Cross-Network Pairing",
    "pin.createRoom": "Create Room",
    "pin.joinRoom": "Join Room",
    "pin.shareThisPin": "Share this PIN",
    "pin.expiresIn": "Expires in {{minutes}} min",
    "pin.copyPin": "Copy PIN",
    "pin.copied": "Copied!",
    "pin.generateDescription": "Generate a temporary PIN for cross-network pairing",
    "pin.generate": "Generate PIN",
    "pin.enterDescription": "Enter the 6-digit PIN shared by the other device",
    "pin.joinButton": "Join Room",
    "pin.invalidPin": "PIN must be 6 digits",
    "pin.created": "Room PIN created",

    // Toasts
    "toast.connected": "Connected to server",
    "toast.disconnected": "Disconnected from server",
    "toast.peerJoined": "{{name}} joined",
    "toast.peerLeft": "{{name}} left",

    // Errors
    "error.invalidMessage": "Invalid JSON message",
    "error.unknownType": "Unknown message type",
    "error.tokenRequired": "Auth token required",
    "error.invalidToken": "Invalid or expired auth token",
    "error.roomNotFound": "Invalid PIN — room does not exist",
    "error.joinFailed": "Failed to join room",
    "error.peerNotFound": "Target peer not found",
    "error.notSameRoom": "Can only communicate with peers in the same room",

    // General
    "general.loading": "Loading...",
    "general.save": "Save",
    "general.cancel": "Cancel",
    "general.close": "Close",
    "general.settings": "Settings",
  },

  th: {
    // App
    "app.name": "AirShare",
    "app.subtitle": "แชร์ไฟล์ P2P",

    // Header
    "header.connected": "เชื่อมต่อแล้ว",
    "header.connecting": "กำลังเชื่อมต่อ",
    "header.disconnected": "ไม่ได้เชื่อมต่อ",

    // Auth
    "auth.login": "เข้าสู่ระบบ",
    "auth.register": "สมัครสมาชิก",
    "auth.logout": "ออกจากระบบ",
    "auth.email": "อีเมล",
    "auth.password": "รหัสผ่าน",
    "auth.confirmPassword": "ยืนยันรหัสผ่าน",
    "auth.displayName": "ชื่อที่แสดง",
    "auth.forgotPassword": "ลืมรหัสผ่าน?",
    "auth.noAccount": "ยังไม่มีบัญชี?",
    "auth.hasAccount": "มีบัญชีอยู่แล้ว?",
    "auth.loginWithGoogle": "เข้าสู่ระบบด้วย Google",
    "auth.orContinueWith": "หรือดำเนินการต่อด้วย",
    "auth.loginError": "เข้าสู่ระบบล้มเหลว",
    "auth.registerError": "สมัครสมาชิกล้มเหลว",
    "auth.passwordMismatch": "รหัสผ่านไม่ตรงกัน",
    "auth.welcomeBack": "ยินดีต้อนรับกลับ!",
    "auth.createAccount": "สร้างบัญชี",
    "auth.guestMode": "เข้าใช้ในฐานะแขก",

    // Discovery
    "discovery.waiting": "รอให้อุปกรณ์อื่นเข้าร่วม...",
    "discovery.hint": "เปิด AirShare บนอุปกรณ์อื่นในเครือข่ายเดียวกัน",
    "discovery.pairCrossNetwork": "จับคู่ข้ามเครือข่าย",
    "discovery.thisDevice": "อุปกรณ์นี้",
    "discovery.peers": "อุปกรณ์",
    "discovery.peer": "อุปกรณ์",
    "discovery.joined": "เข้าร่วมแล้ว",
    "discovery.left": "ออกแล้ว",

    // Transfer
    "transfer.sending": "ส่งไปยัง",
    "transfer.receiving": "รับจาก",
    "transfer.activeTransfers": "การโอนที่กำลังดำเนินอยู่",
    "transfer.complete": "เสร็จสิ้น",
    "transfer.failed": "ล้มเหลว",
    "transfer.cancel": "ยกเลิก",
    "transfer.accept": "ยอมรับ",
    "transfer.decline": "ปฏิเสธ",
    "transfer.incoming": "การโอนไฟล์เข้า",
    "transfer.wantsToSend": "ต้องการส่งไฟล์ให้คุณ",
    "transfer.total": "ทั้งหมด",
    "transfer.files": "ไฟล์",
    "transfer.dropToShare": "วางไฟล์เพื่อแชร์",
    "releaseToStart": "ปล่อยเพื่อเริ่มแชร์กับอุปกรณ์ใกล้เคียง",
    "transfer.sentSuccessfully": "ส่งไฟล์สำเร็จ!",
    "transfer.receivedSuccessfully": "รับไฟล์สำเร็จ!",
    "transfer.declined": "การโอนถูกปฏิเสธ",
    "transfer.failedMsg": "การโอนล้มเหลว",
    "transfer.integrityError": "การตรวจสอบไฟล์ล้มเหลว",
    "transfer.emptyClipboard": "คลิปบอร์ดว่างเปล่า",
    "transfer.clipboardDenied": "ไม่ได้รับอนุญาตให้เข้าถึงคลิปบอร์ด",

    // Device card
    "device.clickOrDrop": "คลิกหรือวางไฟล์",
    "device.authenticated": "ยืนยันตัวตนแล้ว",

    // Clipboard
    "clipboard.title": "ซิงค์คลิปบอร์ด",
    "clipboard.placeholder": "พิมพ์ข้อความเพื่อแชร์...",
    "clipboard.syncButton": "ซิงค์คลิปบอร์ด",
    "clipboard.connectPeers": "เชื่อมต่อกับอุปกรณ์อื่นเพื่อซิงค์คลิปบอร์ด",
    "clipboard.sent": "ส่งข้อความแล้ว",
    "clipboard.synced": "ซิงค์คลิปบอร์ดแล้ว",
    "clipboard.textFrom": "ข้อความจาก",
    "clipboard.sentTo": "ส่งไปยัง {{count}} อุปกรณ์",

    // PIN Modal
    "pin.title": "จับคู่ข้ามเครือข่าย",
    "pin.createRoom": "สร้างห้อง",
    "pin.joinRoom": "เข้าร่วมห้อง",
    "pin.shareThisPin": "แชร์ PIN นี้",
    "pin.expiresIn": "หมดอายุใน {{minutes}} นาที",
    "pin.copyPin": "คัดลอก PIN",
    "pin.copied": "คัดลอกแล้ว!",
    "pin.generateDescription": "สร้าง PIN ชั่วคราวสำหรับจับคู่ข้ามเครือข่าย",
    "pin.generate": "สร้าง PIN",
    "pin.enterDescription": "ใส่ PIN 6 หลักที่อุปกรณ์อื่นแชร์มา",
    "pin.joinButton": "เข้าร่วมห้อง",
    "pin.invalidPin": "PIN ต้องเป็นตัวเลข 6 หลัก",
    "pin.created": "สร้าง PIN ห้องแล้ว",

    // Toasts
    "toast.connected": "เชื่อมต่อกับเซิร์ฟเวอร์แล้ว",
    "toast.disconnected": "ขาดการเชื่อมต่อจากเซิร์ฟเวอร์",
    "toast.peerJoined": "{{name}} เข้าร่วมแล้ว",
    "toast.peerLeft": "{{name}} ออกแล้ว",

    // Errors
    "error.invalidMessage": "ข้อความ JSON ไม่ถูกต้อง",
    "error.unknownType": "ไม่รู้จักประเภทข้อความ",
    "error.tokenRequired": "ต้องใช้โทเค็นยืนยันตัวตน",
    "error.invalidToken": "โทเค็นไม่ถูกต้องหรือหมดอายุ",
    "error.roomNotFound": "PIN ไม่ถูกต้อง — ไม่พบห้อง",
    "error.joinFailed": "เข้าร่วมห้องล้มเหลว",
    "error.peerNotFound": "ไม่พบอุปกรณ์เป้าหมาย",
    "error.notSameRoom": "สามารถสื่อสารกับอุปกรณ์ในห้องเดียวกันเท่านั้น",

    // General
    "general.loading": "กำลังโหลด...",
    "general.save": "บันทึก",
    "general.cancel": "ยกเลิก",
    "general.close": "ปิด",
    "general.settings": "ตั้งค่า",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

// ─── i18n Class ────────────────────────────────────────────

class I18n {
  private locale: Locale;
  private listeners = new Set<() => void>();

  constructor() {
    this.locale = this.getStoredLocale();
    this.applyLocale(this.locale);
  }

  t(key: string, params?: Record<string, string | number>): string {
    let text = (translations[this.locale] as Record<string, string>)[key] || (translations.en as Record<string, string>)[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      }
    }
    return text;
  }

  getLocale(): Locale {
    return this.locale;
  }

  setLocale(locale: Locale) {
    this.locale = locale;
    this.setStoredLocale(locale);
    this.applyLocale(locale);
    this.listeners.forEach((l) => l());
  }

  toggleLocale(): Locale {
    const next = this.locale === "th" ? "en" : "th";
    this.setLocale(next);
    return next;
  }

  onChange(handler: () => void): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private getStoredLocale(): Locale {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "th" || stored === "en") return stored;
    } catch {}
    return "en";
  }

  private setStoredLocale(locale: Locale) {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
  }

  private applyLocale(locale: Locale) {
    document.documentElement.lang = locale;
  }
}

// Singleton
export const i18n = new I18n();
