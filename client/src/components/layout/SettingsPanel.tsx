import { useAppStore } from "@/store/appStore";
import { i18n } from "@/lib/i18n";
import { applyTheme, toggleTheme } from "@/lib/theme";
import { logout as firebaseLogout, isFirebaseConfigured } from "@/lib/firebase";
import { Sun, Moon, Globe, LogOut, ChevronRight } from "lucide-react";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { theme, setTheme, locale, setLocale, user, setUser } = useAppStore();
  const t = (key: string) => i18n.t(key as any);

  // Force re-render on locale change
  useAppStore((s) => s.localeVersion);

  const handleThemeToggle = () => {
    const next = toggleTheme(theme);
    setTheme(next);
  };

  const handleLocaleToggle = () => {
    const next = locale === "th" ? "en" : "th";
    i18n.setLocale(next);
    setLocale(next);
  };

  const handleLogout = async () => {
    if (isFirebaseConfigured) {
      await firebaseLogout();
    }
    setUser(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-80 h-full glass animate-slide-in-left overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold dark:text-white text-gray-900">
              {t("general.settings")}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:dark:bg-gray-700 hover:bg-gray-200 dark:text-gray-400 text-gray-500 transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 rounded-xl dark:bg-gray-800/50 bg-gray-100">
              <p className="text-sm font-medium dark:text-white text-gray-900">{user.email}</p>
              <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">{user.uid.slice(0, 20)}...</p>
            </div>
          )}

          {/* Theme Toggle */}
          <div>
            <label className="text-xs font-semibold dark:text-gray-400 text-gray-500 uppercase tracking-wider mb-3 block">
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </label>
            <button
              onClick={handleThemeToggle}
              className="w-full flex items-center gap-3 p-3 rounded-xl dark:bg-gray-800/50 bg-gray-100
                hover:dark:bg-gray-700 hover:bg-gray-200 transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center">
                {theme === "dark" ? (
                  <Moon size={20} className="text-indigo-400" />
                ) : (
                  <Sun size={20} className="text-amber-500" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium dark:text-white text-gray-900">
                  {theme === "dark" ? "Dark" : "Light"}
                </p>
                <p className="text-xs dark:text-gray-500 text-gray-400">
                  {theme === "dark" ? "Slüssa for night use" : "Easy on the eyes"}
                </p>
              </div>
              <div
                className={`w-12 h-6 rounded-full transition-colors ${
                  theme === "dark" ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${
                    theme === "dark" ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Language Toggle */}
          <div>
            <label className="text-xs font-semibold dark:text-gray-400 text-gray-500 uppercase tracking-wider mb-3 block">
              <Globe size={12} className="inline mr-1" />
              Language
            </label>
            <button
              onClick={handleLocaleToggle}
              className="w-full flex items-center gap-3 p-3 rounded-xl dark:bg-gray-800/50 bg-gray-100
                hover:dark:bg-gray-700 hover:bg-gray-200 transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Globe size={20} className="text-emerald-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium dark:text-white text-gray-900">
                  {locale === "th" ? "🇹🇭 ภาษาไทย" : "🇺🇸 English"}
                </p>
                <p className="text-xs dark:text-gray-500 text-gray-400">
                  {locale === "th" ? "Thai" : "English"}
                </p>
              </div>
              <div className="flex gap-1">
                <span
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    locale === "th"
                      ? "bg-indigo-600 text-white"
                      : "dark:bg-gray-700 bg-gray-200 dark:text-gray-400 text-gray-500"
                  }`}
                >
                  TH
                </span>
                <span
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    locale === "en"
                      ? "bg-indigo-600 text-white"
                      : "dark:bg-gray-700 bg-gray-200 dark:text-gray-400 text-gray-500"
                  }`}
                >
                  EN
                </span>
              </div>
            </button>
          </div>

          {/* Logout */}
          {user && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20
                text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">{t("auth.logout")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
