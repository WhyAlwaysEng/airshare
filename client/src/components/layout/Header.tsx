import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { i18n } from "@/lib/i18n";
import { applyTheme, toggleTheme } from "@/lib/theme";
import { Settings, Wifi, WifiOff, Radio, Sun, Moon } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";

export function Header() {
  const { device, wsState, theme, setTheme, locale, setLocale } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  useAppStore((s) => s.localeVersion);

  const t = (key: string) => i18n.t(key as any);

  const handleThemeToggle = () => {
    const next = toggleTheme(theme);
    setTheme(next);
  };

  const handleLocaleToggle = () => {
    const next = locale === "th" ? "en" : "th";
    i18n.setLocale(next);
    setLocale(next);
  };

  return (
    <>
      <header className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg glow-indigo">
            <Radio size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold dark:text-white text-gray-900 tracking-tight glow-text-indigo">
              {t("app.name")}
            </h1>
            <p className="text-[10px] sm:text-xs dark:text-gray-400 text-gray-500 -mt-0.5 hidden sm:block">
              {t("app.subtitle")}
            </p>
          </div>
        </div>

        {/* Right side — always visible */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme toggle — ALWAYS visible */}
          <button
            onClick={handleThemeToggle}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center
              dark:bg-gray-800 bg-gray-100 border dark:border-gray-700 border-gray-200
              dark:hover:bg-gray-700 hover:bg-gray-200
              dark:text-amber-400 text-indigo-500
              transition-all cursor-pointer hover:scale-110 active:scale-95"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Locale toggle — ALWAYS visible */}
          <button
            onClick={handleLocaleToggle}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center
              dark:bg-gray-800 bg-gray-100 border dark:border-gray-700 border-gray-200
              dark:hover:bg-gray-700 hover:bg-gray-200
              dark:text-gray-300 text-gray-700
              transition-all cursor-pointer hover:scale-110 active:scale-95 font-bold text-sm"
            title="Switch language"
          >
            {locale === "th" ? "TH" : "EN"}
          </button>

          {/* Connection status — hidden on very small screens */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl dark:bg-gray-800 bg-gray-100 border dark:border-gray-700 border-gray-200">
            {wsState === "open" ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400 glow-emerald" />
                <span className="text-xs text-emerald-400 font-medium">
                  {t("header.connected")}
                </span>
              </>
            ) : wsState === "connecting" ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-amber-400 font-medium">
                  {t("header.connecting")}
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs text-red-400 font-medium">
                  {t("header.disconnected")}
                </span>
              </>
            )}
          </div>

          {/* Device name — hidden on small screens */}
          {device && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl dark:bg-gray-800 bg-gray-100 border dark:border-gray-700 border-gray-200">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: device.color }}
              />
              <span className="text-sm dark:text-gray-300 text-gray-700 font-medium">
                {device.name}
              </span>
            </div>
          )}

          {/* Settings button — ALWAYS visible */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center
              dark:bg-gray-800 bg-gray-100 border dark:border-gray-700 border-gray-200
              dark:hover:bg-gray-700 hover:bg-gray-200
              dark:text-gray-400 text-gray-500 hover:dark:text-white hover:text-gray-900
              transition-all cursor-pointer hover:scale-110 active:scale-95"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
