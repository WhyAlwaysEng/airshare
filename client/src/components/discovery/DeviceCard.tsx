import { useState, useCallback, type DragEvent } from "react";
import { useAppStore } from "@/store/appStore";
import { i18n } from "@/lib/i18n";
import { Monitor, Smartphone, Tablet, Send } from "lucide-react";
import type { PeerInfo, DeviceFormFactor } from "@/types";

interface DeviceCardProps {
  peer: PeerInfo;
  onSendFiles: (peerId: string, files: File[]) => void;
}

const formFactorIcons: Record<DeviceFormFactor, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export function DeviceCard({ peer, onSendFiles }: DeviceCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  useAppStore((s) => s.localeVersion);

  const t = (key: string) => i18n.t(key as any);
  const Icon = formFactorIcons[peer.formFactor] || Monitor;

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onSendFiles(peer.id, files);
    },
    [peer.id, onSendFiles]
  );

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      if (files.length > 0) onSendFiles(peer.id, files);
    };
    input.click();
  }, [peer.id, onSendFiles]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        glass glass-hover rounded-2xl p-3 sm:p-4 w-36 sm:w-44 text-center cursor-pointer
        transition-all duration-300 animate-float select-none
        hover:scale-105
        ${isDragging
          ? "scale-110 !border-cyan-400 glow-cyan dark:bg-cyan-500/10 bg-cyan-50"
          : "hover:shadow-xl"
        }
      `}
      style={{
        borderColor: isDragging ? "#06b6d4" : peer.color + "44",
        boxShadow: isDragging
          ? undefined
          : `0 0 12px ${peer.color}33, 0 4px 20px ${peer.color}11`,
        animationDelay: `${Math.random() * 2}s`,
      }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-auto mb-2 sm:mb-3 flex items-center justify-center"
        style={{
          backgroundColor: peer.color + "22",
          boxShadow: `0 0 12px ${peer.color}44`,
        }}
      >
        <Icon size={22} style={{ color: peer.color }} />
      </div>

      {/* Name */}
      <h3 className="text-xs sm:text-sm font-semibold dark:text-white text-gray-900 truncate">
        {peer.name}
      </h3>
      <p className="text-[10px] sm:text-xs dark:text-gray-500 text-gray-400 mt-0.5 sm:mt-1">
        {peer.os} · {peer.formFactor}
      </p>

      {/* Auth badge */}
      {peer.isAuth && (
        <span className="inline-block mt-1.5 sm:mt-2 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded-full glow-emerald">
          {t("device.authenticated")}
        </span>
      )}

      {/* Send indicator */}
      <div className="mt-2 sm:mt-3 flex items-center justify-center gap-1 dark:text-gray-600 text-gray-300">
        <Send size={10} className="sm:w-3 sm:h-3" />
        <span className="text-[9px] sm:text-[10px]">{t("device.clickOrDrop")}</span>
      </div>
    </div>
  );
}
