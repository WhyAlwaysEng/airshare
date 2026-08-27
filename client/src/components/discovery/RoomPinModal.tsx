import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { getSignalingClient } from "@/lib/signaling";
import { i18n } from "@/lib/i18n";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Link, Copy, Check } from "lucide-react";

interface RoomPinModalProps {
  open: boolean;
  onClose: () => void;
}

export function RoomPinModal({ open, onClose }: RoomPinModalProps) {
  const { currentPin, pinExpiresAt, addToast, device } = useAppStore();
  const [joinPin, setJoinPin] = useState("");
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");
  useAppStore((s) => s.localeVersion);

  const t = (key: string, params?: Record<string, string | number>) =>
    i18n.t(key as any, params);

  const handleCreatePin = () => {
    getSignalingClient().send("CREATE_PIN");
    setMode("create");
  };

  const handleJoinPin = () => {
    if (joinPin.length !== 6) {
      addToast({ type: "error", title: t("pin.invalidPin") });
      return;
    }
    getSignalingClient().send("JOIN", { mode: "pin", pin: joinPin, device });
    onClose();
  };

  const handleCopyPin = () => {
    if (currentPin) {
      navigator.clipboard.writeText(currentPin).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("pin.title")}>
      <div className="space-y-6">
        {/* Mode toggle */}
        <div className="flex rounded-xl dark:bg-gray-800 bg-gray-100 p-1">
          <button
            onClick={() => setMode("create")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              mode === "create"
                ? "bg-indigo-600 text-white"
                : "dark:text-gray-400 text-gray-500 hover:dark:text-white hover:text-gray-900"
            }`}
          >
            {t("pin.createRoom")}
          </button>
          <button
            onClick={() => setMode("join")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              mode === "join"
                ? "bg-indigo-600 text-white"
                : "dark:text-gray-400 text-gray-500 hover:dark:text-white hover:text-gray-900"
            }`}
          >
            {t("pin.joinRoom")}
          </button>
        </div>

        {/* Create mode */}
        {mode === "create" && (
          <div className="text-center space-y-4">
            {currentPin ? (
              <>
                <div className="py-4">
                  <p className="text-xs dark:text-gray-500 text-gray-400 mb-2">
                    {t("pin.shareThisPin")}
                  </p>
                  <p className="text-4xl font-mono font-bold dark:text-white text-gray-900 tracking-[0.3em]">
                    {currentPin}
                  </p>
                  {pinExpiresAt && (
                    <p className="text-xs dark:text-gray-500 text-gray-400 mt-2">
                      {t("pin.expiresIn", {
                        minutes: Math.ceil((pinExpiresAt - Date.now()) / 60000),
                      })}
                    </p>
                  )}
                </div>
                <Button variant="secondary" onClick={handleCopyPin} className="w-full">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t("pin.copied") : t("pin.copyPin")}
                </Button>
              </>
            ) : (
              <div className="py-4">
                <Link size={32} className="dark:text-gray-600 text-gray-300 mx-auto mb-3" />
                <p className="text-sm dark:text-gray-400 text-gray-500 mb-4">
                  {t("pin.generateDescription")}
                </p>
                <Button onClick={handleCreatePin} className="w-full">
                  {t("pin.generate")}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Join mode */}
        {mode === "join" && (
          <div className="space-y-4">
            <p className="text-sm dark:text-gray-400 text-gray-500 text-center">
              {t("pin.enterDescription")}
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={joinPin}
              onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center text-3xl font-mono font-bold tracking-[0.3em]
                dark:bg-gray-800 bg-gray-100 border dark:border-gray-700 border-gray-200 rounded-xl py-4
                dark:text-white text-gray-900
                focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                placeholder:dark:text-gray-700 placeholder:text-gray-300"
            />
            <Button
              onClick={handleJoinPin}
              disabled={joinPin.length !== 6}
              className="w-full"
            >
              {t("pin.joinButton")}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
