/* Fichiers : compression d'images locale, découpage en morceaux, base64.
 * Tout ce qui sort d'ici est déjà destiné au scellement : rien n'est envoyé
 * en clair, et aucun octet ne part avant d'être chiffré.
 */

export const CHUNK = 512 * 1024;
export const MAX_FILE = 8 * 1024 * 1024;
export const MAX_IMAGE_DIM = 1600;

export type ImageResult = { blob: Blob; w: number; h: number };

export function isCompressibleImage(mime: string): boolean {
  return /^image\//.test(mime) && !/gif|svg/i.test(mime);
}

export function fileKind(mime: string): 'image' | 'video' | 'file' {
  if (/^image\//.test(mime)) return 'image';
  if (/^video\//.test(mime)) return 'video';
  return 'file';
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(bin);
}

export function base64ToBytes(data: string): Uint8Array<ArrayBuffer> {
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Redimensionne puis ré-encode en JPEG. Renvoie null si le navigateur ne suit pas. */
export async function compressImage(file: File, quality: number, maxDim = MAX_IMAGE_DIM): Promise<ImageResult | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Fond blanc : une image avec transparence ne doit pas virer au noir en JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return null;
    return { blob, w, h };
  } catch {
    return null;
  }
}

/**
 * Ré-encode une image sans la redimensionner, uniquement pour jeter les
 * métadonnées embarquées (GPS/EXIF). On garde les dimensions et une qualité
 * élevée. Renvoie null si ce n'est pas possible : dans ce cas, on n'envoie rien
 * plutôt que de laisser fuiter la localisation.
 */
export async function stripImageMetadata(file: File): Promise<ImageResult | null> {
  return compressImage(file, 0.94, Number.MAX_SAFE_INTEGER);
}

/** Extrait un nom lisible d'une URL blob ou d'un fichier. */
export function cleanName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120) || 'fichier';
}
