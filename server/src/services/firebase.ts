import { createLogger } from "../utils/logger.js";

const log = createLogger("Firebase");

// Lazy-loaded Firebase Admin SDK
let firebaseApp: import("firebase-admin/app").App | null = null;
let authInstance: import("firebase-admin/auth").Auth | null = null;
let initialized = false;

async function initFirebase() {
  if (initialized) return;
  initialized = true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!projectId || !serviceAccountKey) {
    log.info("Firebase not configured — auth disabled (guest-only mode)");
    return;
  }

  try {
    // Dynamic import to avoid errors when firebase-admin is not configured
    const admin = await import("firebase-admin/app");
    const auth = await import("firebase-admin/auth");

    firebaseApp = admin.initializeApp({
      credential: admin.cert(JSON.parse(serviceAccountKey)),
      projectId,
    });

    authInstance = auth.getAuth(firebaseApp);
    log.info("Firebase Admin SDK initialized", { projectId });
  } catch (err) {
    log.error("Failed to initialize Firebase", { error: err });
  }
}

/**
 * Verify a Firebase ID token and return the decoded UID.
 * Returns null if Firebase is not configured or token is invalid.
 */
export async function verifyFirebaseToken(
  token: string
): Promise<{ uid: string; email?: string } | null> {
  await initFirebase();

  if (!authInstance) {
    log.debug("Firebase auth not available, skipping token verification");
    return null;
  }

  try {
    const decoded = await authInstance.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch (err) {
    log.warn("Firebase token verification failed", { error: err });
    return null;
  }
}

/** Check if Firebase auth is enabled */
export function isAuthEnabled(): boolean {
  return initialized && authInstance !== null;
}
