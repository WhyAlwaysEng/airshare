/**
 * Strip HTML tags and control characters from input strings.
 */
function stripHTML(input: string): string {
  return input.replace(/[<>"'&]/g, "").replace(/[\x00-\x1f\x7f]/g, "");
}

/**
 * Sanitize a device name for safe DOM rendering.
 * Max 50 characters, no HTML, no control characters.
 */
export function sanitizeDeviceName(name: string): string {
  return stripHTML(name).slice(0, 50).trim() || "Unknown Device";
}

/**
 * Sanitize a file name for safe rendering and download.
 * Max 255 characters, preserves dots and extensions.
 */
export function sanitizeFileName(name: string): string {
  // Remove path separators and dangerous characters
  const cleaned = name
    .replace(/[<>:"|?*\x00-\x1f]/g, "")
    .replace(/[/\\]/g, "_");
  return stripHTML(cleaned).slice(0, 255).trim() || "unnamed-file";
}
