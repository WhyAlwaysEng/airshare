/**
 * Compute SHA-256 hash of a File in 1MB chunks.
 * Returns hex string.
 */
export async function computeFileHash(file: File): Promise<string> {
  const chunkSize = 1024 * 1024; // 1MB
  const hasher = await crypto.subtle.digest("SHA-256", new ArrayBuffer(0));

  // We need to accumulate the hash
  let offset = 0;
  const chunks: ArrayBuffer[] = [];

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const slice = file.slice(offset, end);
    const buffer = await slice.arrayBuffer();
    chunks.push(buffer);
    offset = end;
  }

  // Concatenate all chunks and hash the full content
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
  const concatenated = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    concatenated.set(new Uint8Array(chunk), pos);
    pos += chunk.byteLength;
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", concatenated);
  return bufferToHex(hashBuffer);
}

/**
 * Compute SHA-256 hash of a Blob.
 * Returns hex string.
 */
export async function computeBlobHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return bufferToHex(hashBuffer);
}

/**
 * Convert ArrayBuffer to hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
