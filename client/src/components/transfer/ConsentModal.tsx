import { useAppStore } from "@/store/appStore";
import { useFileTransfer } from "@/hooks/useFileTransfer";
import { i18n } from "@/lib/i18n";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatFileSize } from "@/lib/sanitize";
import { File, Download, X } from "lucide-react";

export function ConsentModal() {
  const pending = useAppStore((s) => s.pendingConsentRequest);
  const { acceptTransfer, declineTransfer } = useFileTransfer();
  useAppStore((s) => s.localeVersion);

  const t = (key: string) => i18n.t(key as any);

  if (!pending) return null;

  const totalSize = pending.files.reduce((acc, f) => acc + f.size, 0);

  return (
    <Modal open={!!pending} onClose={() => declineTransfer(pending.transferId, pending.peerId)} title={t("transfer.incoming")}>
      {/* Sender info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <Download size={20} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-medium dark:text-white text-gray-900">{pending.peerName}</p>
          <p className="text-xs dark:text-gray-500 text-gray-400">{t("transfer.wantsToSend")}</p>
        </div>
      </div>

      {/* File list */}
      <div className="space-y-2 mb-4 max-h-48 overflow-auto">
        {pending.files.map((file, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg dark:bg-gray-800/50 bg-gray-100"
          >
            <File size={16} className="dark:text-gray-400 text-gray-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm dark:text-white text-gray-900 truncate">{file.name}</p>
              <p className="text-xs dark:text-gray-500 text-gray-400">{formatFileSize(file.size)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Total size */}
      <p className="text-xs dark:text-gray-500 text-gray-400 mb-4">
        {t("transfer.total")}: {formatFileSize(totalSize)} · {pending.files.length} {t("transfer.files")}
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => declineTransfer(pending.transferId, pending.peerId)}
        >
          <X size={16} />
          {t("transfer.decline")}
        </Button>
        <Button
          className="flex-1"
          onClick={() => acceptTransfer(pending.transferId, pending.peerId)}
        >
          <Download size={16} />
          {t("transfer.accept")}
        </Button>
      </div>
    </Modal>
  );
}
