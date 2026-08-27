import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";

// ─── Firebase Config ───────────────────────────────────────

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

// ─── Initialize Firebase ───────────────────────────────────

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export { app, auth };

// ─── Auth Functions ────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
}

/**
 * Sign up with email/password.
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult> {
  if (!auth) {
    return { success: false, error: "Firebase not configured" };
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    // Set display name if provided
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }

    return {
      success: true,
      user: {
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName,
      },
    };
  } catch (err: any) {
    return { success: false, error: getFirebaseErrorMessage(err.code) };
  }
}

/**
 * Sign in with email/password.
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!auth) {
    return { success: false, error: "Firebase not configured" };
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    return {
      success: true,
      user: {
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName,
      },
    };
  } catch (err: any) {
    return { success: false, error: getFirebaseErrorMessage(err.code) };
  }
}

/**
 * Sign out.
 */
export async function logout(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }
}

/**
 * Get current user's ID token (for server verification).
 */
export async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// ─── Helpers ───────────────────────────────────────────────

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case "auth/user-not-found":
      return "No account found with this email";
    case "auth/wrong-password":
      return "Incorrect password";
    case "auth/email-already-in-use":
      return "This email is already registered";
    case "auth/invalid-email":
      return "Invalid email address";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed";
    case "auth/network-request-failed":
      return "Network error. Check your connection";
    default:
      return `Authentication error: ${code}`;
  }
}
