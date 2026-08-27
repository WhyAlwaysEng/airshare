import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { useClipboard } from "@/hooks/useClipboard";
import { i18n } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Clipboard, Send, Copy, Check } from "lucide-react";

export function ClipboardPanel() {
  const { clipboardText, peers } = useAppStore();
  const { broadcastClipboard, sendText } = useClipboard();
  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState(false);
  useAppStore((s) => s.localeVersion);

  const t = (key: string) => i18n.t(key as any);
  const hasConnectedPeers = peers.size > 0;

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendText(inputText);
    setInputText("");
  };

  const handleCopy = () => {
    if (clipboardText) {
      navigator.clipboard.writeText(clipboardText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clipboard size={16} className="dark:text-gray-400 text-gray-500" />
        <h3 className="text-sm font-semibold dark:text-gray-300 text-gray-700">
          {t("clipboard.title")}
        </h3>
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t("clipboard.placeholder")}
          className="flex-1 dark:bg-gray-800 bg-gray-100 border dark:border-gray-700 border-gray-200 rounded-lg px-3 py-2
            text-sm dark:text-white text-gray-900 placeholder:text-gray-500
            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          disabled={!hasConnectedPeers}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!hasConnectedPeers || !inputText.trim()}
        >
          <Send size={14} />
        </Button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={broadcastClipboard}
          disabled={!hasConnectedPeers}
          className="flex-1"
        >
          <Clipboard size={14} />
          {t("clipboard.syncButton")}
        </Button>
      </div>

      {/* Last received text */}
      {clipboardText && (
        <div className="mt-2 p-3 rounded-lg dark:bg-gray-800/50 bg-gray-100 relative group">
          <p className="text-sm dark:text-gray-300 text-gray-700 break-all pr-8">
            {clipboardText}
          </p>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1 rounded-lg hover:dark:bg-gray-700 hover:bg-gray-200 dark:text-gray-500 text-gray-400 hover:dark:text-white hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}

      {!hasConnectedPeers && (
        <p className="text-xs dark:text-gray-600 text-gray-400 text-center">
          {t("clipboard.connectPeers")}
        </p>
      )}
    </div>
  );
}
