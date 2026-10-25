import type { Dict } from './i18n';

/* Métadonnées de la version publiée (générées au moment du build). */
export const RELEASE = {
  version: '2.4.4',
  files: {
    win: 'Seyra-Setup-2.4.4.exe',
    mac: 'Seyra-2.4.4-universal.dmg',
    linux: 'Seyra-2.4.4.AppImage',
    deb: 'seyra-desktop_2.4.4_amd64.deb',
    apk: 'Seyra-2.4.4.apk',
  },
  sizes: {
    win: 121722422,
    mac: 223012282,
    linux: 126157553,
    deb: 101554552,
    apk: 3373078,
  },
};

/** Taille lisible : 3.4 MB, 121 MB… */
export function formatSize(bytes: number): string {
  if (!bytes) return '—';
  const mb = bytes / 1_000_000;
  return mb >= 10 ? Math.round(mb) + ' MB' : mb.toFixed(1) + ' MB';
}

/** Petit type partagé pour les dictionnaires. */
export type ReleaseDict = Dict;
