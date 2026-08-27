import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { i18n } from "@/lib/i18n";
import {
  loginWithEmail,
  registerWithEmail,
  isFirebaseConfigured,
} from "@/lib/firebase";
import { Mail, Lock, User, Eye, EyeOff, Radio, AlertCircle } from "lucide-react";

type Mode = "login" | "register";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { setUser, setGuestMode, theme, setTheme, locale, setLocale } = useAppStore();
  useAppStore((s) => s.localeVersion);

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    import("@/lib/theme").then(({ setStoredTheme }) => setStoredTheme(next));
    setTheme(next);
  };

  const handleLocaleToggle = () => {
    const next = locale === "th" ? "en" : "th";
    import("@/lib/i18n").then(({ i18n }) => i18n.setLocale(next));
    setLocale(next);
  };

  const t = (key: string, params?: Record<string, string | number>) =>
    i18n.t(key as any, params);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      if (isFirebaseConfigured) {
        const result =
          mode === "login"
            ? await loginWithEmail(email, password)
            : await registerWithEmail(email, password, displayName);

        if (result.success && result.user) {
          setUser({ uid: result.user.uid, email: result.user.email || email });
        } else {
          setError(result.error || t("auth.loginError"));
        }
      } else {
        await new Promise((r) => setTimeout(r, 800));
        setUser({ uid: `guest_${Date.now()}`, email });
      }
    } catch {
      setError(t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    setGuestMode(true);
    setUser({ uid: `guest_${Date.now()}`, email: "guest" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-bounce-in">
        {/* Theme & Locale toggles — top right */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
          <button
            onClick={handleThemeToggle}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center
              dark:bg-gray-800 bg-gray-100 border dark:border-gray-700 border-gray-200
              dark:hover:bg-gray-700 hover:bg-gray-200
              dark:text-amber-400 text-indigo-500
              transition-all cursor-pointer hover:scale-110 active:scale-95"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
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
        </div>

        {/* Logo with glow */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg glow-indigo animate-glow-pulse">
            <Radio size={28} className="text-white sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold dark:text-white text-gray-900 glow-text-indigo">
            {t("app.name")}
          </h1>
          <p className="text-xs sm:text-sm dark:text-gray-400 text-gray-500 mt-1">
            {t("app.subtitle")}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold dark:text-white text-gray-900 mb-5 sm:mb-6">
            {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h2>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 animate-slide-up glow-red">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {mode === "register" && (
              <div className="relative animate-slide-up">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("auth.displayName")}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl dark:bg-gray-800/50 bg-gray-100 border dark:border-gray-700 border-gray-200 dark:text-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:glow-border transition-all text-sm"
                />
              </div>
            )}

            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email")}
                required
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl dark:bg-gray-800/50 bg-gray-100 border dark:border-gray-700 border-gray-200 dark:text-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:glow-border transition-all text-sm"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.password")}
                required
                minLength={6}
                className="w-full pl-10 pr-12 py-2.5 sm:py-3 rounded-xl dark:bg-gray-800/50 bg-gray-100 border dark:border-gray-700 border-gray-200 dark:text-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:glow-border transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400 hover:dark:text-gray-300 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {mode === "register" && (
              <div className="relative animate-slide-up">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-500 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("auth.confirmPassword")}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl dark:bg-gray-800/50 bg-gray-100 border dark:border-gray-700 border-gray-200 dark:text-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:glow-border transition-all text-sm"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium glow-indigo hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t("general.loading")}
                </span>
              ) : mode === "login" ? t("auth.login") : t("auth.register")}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4 sm:my-5">
            <div className="flex-1 h-px dark:bg-gray-700 bg-gray-200" />
            <span className="text-xs dark:text-gray-500 text-gray-400">{t("auth.orContinueWith")}</span>
            <div className="flex-1 h-px dark:bg-gray-700 bg-gray-200" />
          </div>

          {/* Guest mode */}
          <button
            onClick={handleGuest}
            className="w-full py-2.5 sm:py-3 rounded-xl dark:bg-gray-800 bg-gray-100 border dark:border-gray-700 border-gray-200 dark:text-gray-300 text-gray-700 font-medium hover:dark:bg-gray-700 hover:bg-gray-200 transition-all cursor-pointer mt-2.5 sm:mt-3 hover:scale-[1.02] text-sm"
          >
            {t("auth.guestMode")}
          </button>

          {/* Toggle mode */}
          <p className="text-center text-xs sm:text-sm dark:text-gray-400 text-gray-500 mt-4 sm:mt-5">
            {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              {mode === "login" ? t("auth.register") : t("auth.login")}
            </button>
          </p>

          {/* Firebase status */}
          {!isFirebaseConfigured && (
            <p className="text-center text-[10px] sm:text-xs dark:text-gray-600 text-gray-400 mt-3 p-2 rounded-lg dark:bg-gray-800/30 bg-gray-50">
              ℹ️ Demo mode — configure Firebase in .env for real auth
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
