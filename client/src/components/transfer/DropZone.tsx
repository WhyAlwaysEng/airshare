import { useState, useCallback, useEffect, type ReactNode } from "react";
import { useAppStore } from "@/store/appStore";
import { i18n } from "@/lib/i18n";
import { Upload } from "lucide-react";

interface DropZoneProps {
  onFilesDrop: (files: File[]) => void;
  children: ReactNode;
}

export function DropZone({ onFilesDrop, children }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  useAppStore((s) => s.localeVersion);

  const t = (key: string) => i18n.t(key as any);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((c) => {
      if (c === 0) setIsDragOver(true);
      return c + 1;
    });
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((c) => {
      const next = c - 1;
      if (next === 0) setIsDragOver(false);
      return next;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setDragCounter(0);
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) onFilesDrop(files);
    },
    [onFilesDrop]
  );

  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <div className="relative min-h-screen">
      {children}

      {isDragOver && (
        <div className="fixed inset-0 z-50 dark:bg-gray-950/80 bg-white/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="glass rounded-3xl p-12 text-center border-2 border-dashed border-cyan-400">
            <Upload size={48} className="text-cyan-400 mx-auto mb-4" />
            <p className="text-xl font-semibold dark:text-white text-gray-900">
              {t("transfer.dropToShare")}
            </p>
            <p className="text-sm dark:text-gray-400 text-gray-500 mt-2">
              {t("releaseToStart")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
