import path from 'path';

export interface ValidatedFile {
  buffer: Buffer;
  fileName: string;
  fileType: 'pdf' | 'txt';
  sizeBytes: number;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Sanitizes a filename to prevent directory traversal and remove invalid characters.
 */
export function sanitizeFilename(rawName: string): string {
  // Strip null bytes and control chars
  let cleaned = rawName.replace(/[\x00-\x1f\x80-\x9f]/g, '');

  // Strip path separators and traversals
  cleaned = path.basename(cleaned).replace(/(\.\.[\/\\])+/g, '');

  // Remove disallowed characters on most filesystems
  cleaned = cleaned.replace(/[^a-zA-Z0-9._\- ]/g, '_');

  // Collapse multiple underscores or spaces
  cleaned = cleaned.replace(/_+/g, '_').trim();

  // If empty after sanitization, fallback
  if (!cleaned || cleaned.startsWith('.')) {
    cleaned = `document_${Date.now()}${path.extname(rawName) || '.txt'}`;
  }

  return cleaned;
}

/**
 * Validates file type, size, and sanitizes filename.
 */
export function validateAndSanitizeFile(file: File | { name: string; size: number }, buffer: Buffer): ValidatedFile {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum limit of 5 MB.`);
  }

  const sanitized = sanitizeFilename(file.name);
  const ext = path.extname(sanitized).toLowerCase();

  let fileType: 'pdf' | 'txt';
  if (ext === '.pdf') {
    fileType = 'pdf';
  } else if (ext === '.txt') {
    fileType = 'txt';
  } else {
    throw new Error(`Unsupported file type '${ext}'. Only PDF and TXT files are accepted.`);
  }

  return {
    buffer,
    fileName: sanitized,
    fileType,
    sizeBytes: buffer.length,
  };
}
