import { useState, useEffect } from "react";
import { useSignaling } from "@/hooks/useSignaling";
import { usePeers } from "@/hooks/usePeers";
import { useDevice } from "@/hooks/useDevice";
import { useFileTransfer } from "@/hooks/useFileTransfer";
import { useAppStore } from "@/store/appStore";
import { applyTheme } from "@/lib/theme";
import { i18n } from "@/lib/i18n";
import { onAuthChange, isFirebaseConfigured, getIdToken } from "@/lib/firebase";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { Header } from "@/components/layout/Header";
import { RadarView } from "@/components/discovery/RadarView";
import { RoomPinModal } from "@/components/discovery/RoomPinModal";
import { TransferProgress } from "@/components/transfer/TransferProgress";
import { ConsentModal } from "@/components/transfer/ConsentModal";
import { DropZone } from "@/components/transfer/DropZone";
import { ClipboardPanel } from "@/components/clipboard/ClipboardPanel";
import { ToastContainer } from "@/components/ui/Toast";

function AppContent() {
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const { sendFiles } = useFileTransfer();
  const peers = useAppStore((s) => s.peers);
  const theme = useAppStore((s) => s.theme);

  // Initialize all hooks
  useDevice();
  useSignaling();
  usePeers();

  // Sync theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sync locale on mount
  useEffect(() => {
    const stored = localStorage.getItem("airshare-locale") as "th" | "en" | null;
    if (stored) i18n.setLocale(stored);
  }, []);

  const handleGlobalFilesDrop = (files: File[]) => {
    const peerArray = Array.from(peers.values());
    if (peerArray.length === 1) {
      sendFiles(peerArray[0].id, files);
    }
  };

  return (
    <DropZone onFilesDrop={handleGlobalFilesDrop}>
      <div className="min-h-screen flex flex-col dark:bg-[#0a0a0f] bg-[#f8fafc] transition-colors duration-300">
        <Header />

        <div className="flex-1 flex flex-col lg:flex-row">
          <div className="flex-1">
            <RadarView onCreatePin={() => setPinModalOpen(true)} />
          </div>

          {/* Sidebar clipboard (desktop) */}
          <div className="hidden lg:block w-80 p-4 border-l dark:border-gray-800/50 border-gray-200/50">
            <ClipboardPanel />
          </div>
        </div>

        {/* Mobile clipboard */}
        <div className="lg:hidden p-4 border-t dark:border-gray-800/50 border-gray-200/50">
          <ClipboardPanel />
        </div>

        {/* Modals */}
        <RoomPinModal open={pinModalOpen} onClose={() => setPinModalOpen(false)} />
        <ConsentModal />
        <TransferProgress />
        <ToastContainer />
      </div>
    </DropZone>
  );
}

/**
 * AuthGate — watches Firebase auth state and shows login or app accordingly.
 */
function AuthGate() {
  const { user, setUser, isGuest } = useAppStore();
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // No Firebase — show login form (user must choose guest or enter credentials)
      setAuthLoading(false);
      return;
    }

    // Listen to Firebase auth state
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in — get token and set in store
        const token = await getIdToken();
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
        });
      } else {
        // User signed out
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [setUser]);

  // Show loading spinner while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-[#0a0a0f] bg-[#f8fafc]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" className="opacity-75" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm dark:text-gray-400 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return user === null && !isGuest ? <LoginForm /> : <AppContent />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
