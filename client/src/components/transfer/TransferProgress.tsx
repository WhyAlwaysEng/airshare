import { useAppStore } from "@/store/appStore";
import { i18n } from "@/lib/i18n";
import { Progress } from "@/components/ui/Progress";
import { formatFileSize } from "@/lib/sanitize";
import { X, CheckCircle, AlertCircle, Send, Download } from "lucide-react";

export function TransferProgress() {
  const activeTransfers = useAppStore((s) => s.activeTransfers);
  const cancelTransfer = useAppStore((s) => s.cancelTransfer);
  useAppStore((s) => s.localeVersion);

  const t = (key: string) => i18n.t(key as any);
  const transfers = Array.from(activeTransfers.values());

  if (transfers.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40">
      <div className="glass rounded-2xl p-4 shadow-2xl space-y-3">
        <h3 className="text-xs font-semibold dark:text-gray-400 text-gray-500 uppercase tracking-wider">
          {t("transfer.activeTransfers")}
        </h3>

        {transfers.map((transfer) => {
          const totalProgress =
            transfer.files.length > 0
              ? transfer.files.reduce((acc, f) => acc + f.progress, 0) /
                transfer.files.length
              : 0;

          const totalBytes = transfer.files.reduce((acc, f) => acc + f.size, 0);
          const sentBytes = transfer.files.reduce(
            (acc, f) => acc + (f.size * f.progress) / 100,
            0
          );

          return (
            <div key={transfer.id} className="space-y-2">
              {/* Transfer info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {transfer.direction === "send" ? (
                    <Send size={14} className="text-indigo-400 shrink-0" />
                  ) : (
                    <Download size={14} className="text-cyan-400 shrink-0" />
                  )}
                  <span className="text-sm dark:text-white text-gray-900 truncate">
                    {transfer.direction === "send"
                      ? t("transfer.sending")
                      : t("transfer.receiving")}{" "}
                    {transfer.peerName}
                  </span>
                </div>

                {transfer.status === "complete" ? (
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                ) : transfer.status === "failed" ? (
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                ) : (
                  <button
                    onClick={() => cancelTransfer(transfer.id)}
                    className="p-1 rounded-lg hover:dark:bg-gray-700 hover:bg-gray-200 dark:text-gray-500 text-gray-400 hover:dark:text-white hover:text-gray-900 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <Progress
                value={totalProgress}
                color={transfer.status === "complete" ? "green" : "indigo"}
              />

              {/* Metrics */}
              <div className="flex items-center justify-between text-xs dark:text-gray-500 text-gray-400">
                <span>
                  {formatFileSize(sentBytes)} / {formatFileSize(totalBytes)}
                </span>
                <span>{Math.round(totalProgress)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
