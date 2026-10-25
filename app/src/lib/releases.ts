import type { Dict } from './i18n';

/* Métadonnées de la version publiée (remplies au moment du build). */
export const RELEASE = {
  version: '2.4.4',
  files: {
    win: 'Seyra-Setup-2.4.4.exe',
    mac: 'Seyra-2.4.4-universal.dmg',
    linux: 'Seyra-2.4.4.AppImage',
    deb: 'seyra-desktop_2.4.4_amd64.deb',
    apk: 'Seyra-2.4.4.apk',
  },
  sizes: { win: 0, mac: 0, linux: 0, deb: 0, apk: 0 },
};

/** Taille lisible : 3.3 MB, 122 MB… */
export function formatSize(bytes: number): string {
  if (!bytes) return '—';
  const mb = bytes / 1_000_000;
  return mb >= 10 ? Math.round(mb) + ' MB' : mb.toFixed(1) + ' MB';
}
