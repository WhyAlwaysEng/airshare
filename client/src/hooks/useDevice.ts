import { useEffect } from "react";
import { getDeviceInfo } from "@/lib/device";
import { useAppStore } from "@/store/appStore";

export function useDevice() {
  const { device, setDevice } = useAppStore();

  useEffect(() => {
    if (!device) {
      const info = getDeviceInfo();
      setDevice(info);
    }
  }, [device, setDevice]);

  return device;
}
