/**
 * Strip HTML tags and control characters from input strings.
 */
function stripHTML(input: string): string {
  return input.replace(/[<>"'&]/g, "").replace(/[\x00-\x1f\x7f]/g, "");
}

/**
 * Sanitize a device name for safe DOM rendering.
 */
export function sanitizeDeviceName(name: string): string {
  return stripHTML(name).slice(0, 50).trim() || "Unknown Device";
}

/**
 * Sanitize a file name for safe rendering and download.
 */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[<>:"|?*\x00-\x1f]/g, "")
    .replace(/[/\\]/g, "_");
  return stripHTML(cleaned).slice(0, 255).trim() || "unnamed-file";
}

/**
 * Trigger a safe file download without navigating away.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFileName(filename);
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Cleanup after a short delay
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Format file size to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format transfer speed.
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * Format ETA.
 */
export function formatETA(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
