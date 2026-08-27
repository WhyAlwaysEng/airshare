import { useAppStore, type Toast } from "@/store/appStore";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: "border-emerald-500/30 bg-emerald-500/10",
  error: "border-red-500/30 bg-red-500/10",
  info: "border-blue-500/30 bg-blue-500/10",
  warning: "border-amber-500/30 bg-amber-500/10",
};

const darkColors = {
  success: "dark:border-emerald-500/30 dark:bg-emerald-500/10 border-emerald-200 bg-emerald-50",
  error: "dark:border-red-500/30 dark:bg-red-500/10 border-red-200 bg-red-50",
  info: "dark:border-blue-500/30 dark:bg-blue-500/10 border-blue-200 bg-blue-50",
  warning: "dark:border-amber-500/30 dark:bg-amber-500/10 border-amber-200 bg-amber-50",
};

const iconColors = {
  success: "text-emerald-500 dark:text-emerald-400",
  error: "text-red-500 dark:text-red-400",
  info: "text-blue-500 dark:text-blue-400",
  warning: "text-amber-500 dark:text-amber-400",
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useAppStore((s) => s.removeToast);
  const Icon = icons[toast.type];

  return (
    <div
      className={`relative glass rounded-xl border p-3 pr-8 animate-slide-in-right
        ${darkColors[toast.type]} shadow-lg`}
    >
      {/* Close button */}
      <button
        onClick={() => removeToast(toast.id)}
        className="absolute top-2 right-2 p-0.5 rounded-lg hover:dark:bg-gray-700 hover:bg-gray-200
          dark:text-gray-500 text-gray-400 hover:dark:text-gray-300 hover:text-gray-600 transition-colors cursor-pointer"
      >
        <X size={14} />
      </button>

      <div className="flex items-start gap-3">
        {/* Icon with animated background */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors[toast.type]}`}>
          <Icon size={16} className={iconColors[toast.type]} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold dark:text-white text-gray-900">{toast.title}</p>
          {toast.message && (
            <p className="text-xs dark:text-gray-400 text-gray-500 mt-0.5 line-clamp-2">
              {toast.message}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar that shrinks over time */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
        <div
          className={`h-full ${colors[toast.type]} animate-shrink`}
          style={{
            animation: `shrink ${(toast.duration || 5000)}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-h-[60vh] overflow-auto pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
