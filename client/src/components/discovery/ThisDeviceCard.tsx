import { useAppStore } from "@/store/appStore";
import { i18n } from "@/lib/i18n";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import type { DeviceFormFactor } from "@/types";

const formFactorIcons: Record<DeviceFormFactor, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export function ThisDeviceCard() {
  const { device, roomId, peers } = useAppStore();
  useAppStore((s) => s.localeVersion);

  const t = (key: string) => i18n.t(key as any);
  if (!device) return null;

  const Icon = formFactorIcons[device.formFactor];

  return (
    <div className="relative">
      {/* Animated glow ring */}
      <div
        className="absolute -inset-1 rounded-2xl animate-glow-pulse opacity-60"
        style={{
          background: `linear-gradient(135deg, ${device.color}44, transparent, ${device.color}44)`,
        }}
      />

      {/* Pulse ring */}
      <div
        className="absolute inset-0 rounded-2xl animate-pulse-ring"
        style={{ border: `2px solid ${device.color}33` }}
      />

      <div
        className="relative glass rounded-2xl p-4 sm:p-5 w-40 sm:w-48 text-center cursor-default
          border-2 transition-all duration-300"
        style={{
          borderColor: device.color + "66",
          boxShadow: `0 0 20px ${device.color}33, 0 0 40px ${device.color}11`,
        }}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl mx-auto mb-2 sm:mb-3 flex items-center justify-center"
          style={{
            backgroundColor: device.color + "22",
            boxShadow: `0 0 15px ${device.color}44`,
          }}
        >
          <Icon size={26} className="sm:w-7 sm:h-7" style={{ color: device.color }} />
        </div>

        {/* Name */}
        <h3 className="text-xs sm:text-sm font-bold dark:text-white text-gray-900 truncate glow-text-indigo">
          {device.name}
        </h3>
        <p className="text-[10px] sm:text-xs dark:text-gray-500 text-gray-400 mt-0.5 sm:mt-1">
          {device.os} · {device.formFactor}
        </p>

        {/* Room info */}
        {roomId && (
          <p className="text-[9px] sm:text-[10px] dark:text-gray-600 text-gray-300 mt-1.5 sm:mt-2 truncate">
            Room: {roomId.slice(0, 12)}...
          </p>
        )}

        {/* Peer count badge */}
        <div
          className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-600 flex items-center justify-center glow-indigo"
        >
          <span className="text-[10px] sm:text-xs font-bold text-white">{peers.size}</span>
        </div>
      </div>
    </div>
  );
}
