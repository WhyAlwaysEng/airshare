import { useAppStore } from "@/store/appStore";
import { useFileTransfer } from "@/hooks/useFileTransfer";
import { i18n } from "@/lib/i18n";
import { ThisDeviceCard } from "./ThisDeviceCard";
import { DeviceCard } from "./DeviceCard";
import { Link } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RadarViewProps {
  onCreatePin: () => void;
}

export function RadarView({ onCreatePin }: RadarViewProps) {
  const peers = useAppStore((s) => s.peers);
  const { sendFiles } = useFileTransfer();
  useAppStore((s) => s.localeVersion);

  const t = (key: string) => i18n.t(key as any);
  const peerArray = Array.from(peers.values());

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      {/* Radar area */}
      <div className="relative flex flex-col items-center gap-5 sm:gap-8">
        {/* Top peers */}
        {peerArray.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {peerArray.slice(0, Math.ceil(peerArray.length / 2)).map((peer) => (
              <DeviceCard key={peer.id} peer={peer} onSendFiles={sendFiles} />
            ))}
          </div>
        )}

        {/* This Device */}
        <ThisDeviceCard />

        {/* Bottom peers */}
        {peerArray.length > 2 && (
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {peerArray.slice(Math.ceil(peerArray.length / 2)).map((peer) => (
              <DeviceCard key={peer.id} peer={peer} onSendFiles={sendFiles} />
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {peerArray.length === 0 && (
        <p className="dark:text-gray-600 text-gray-400 text-xs sm:text-sm mt-4 sm:mt-6 text-center">
          {t("discovery.waiting")}
          <br />
          <span className="text-[10px] sm:text-xs dark:text-gray-700 text-gray-300">
            {t("discovery.hint")}
          </span>
        </p>
      )}

      {/* Bottom action */}
      <div className="mt-8 sm:mt-12 flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onCreatePin}>
          <Link size={14} />
          {t("discovery.pairCrossNetwork")}
        </Button>
      </div>
    </div>
  );
}
