/* Icônes des applis : grille 24, trait arrondi, une seule couleur (currentColor).
 * Utilisées dans le lanceur, la barre latérale et les tuiles. */

export type AppId = 'messages' | 'wallet' | 'notes' | 'canaux' | 'wiki' | 'compte';

const PATHS: Record<AppId, JSX.Element> = {
  messages: (
    <>
      <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-8.2L7 20.5V17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z" />
      <path d="M7.5 10.5h9M7.5 13.5h5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5V6a1.5 1.5 0 0 1 1.5-1.5h11.5" />
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M21 12.5h-4.2a2 2 0 0 0 0 4H21" />
      <path d="M17 14.5h.01" strokeWidth="2.6" />
    </>
  ),
  notes: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 16.5h4" />
    </>
  ),
  canaux: (
    <>
      <path d="M9.5 3.5 7.5 20.5M16.5 3.5l-2 17" />
      <path d="M4 9h16M3.5 15h16" />
    </>
  ),
  wiki: (
    <>
      <path d="M12 6.8C9.9 5.3 7.2 4.7 3.5 5v13.5c3.7-.3 6.4.3 8.5 1.8 2.1-1.5 4.8-2.1 8.5-1.8V5c-3.7-.3-6.4.3-8.5 1.8z" />
      <path d="M12 6.8v13.5" />
      <path d="M6.5 9.2c1.4-.2 2.7 0 3.8.5M6.5 12.2c1.4-.2 2.7 0 3.8.5" />
    </>
  ),
  compte: (
    <>
      <path d="M12 2.8 4.5 5.6v5.6c0 4.7 3.2 8.4 7.5 9.9 4.3-1.5 7.5-5.2 7.5-9.9V5.6z" />
      <rect x="8.8" y="11" width="6.4" height="5" rx="1.2" />
      <path d="M10.2 11V9.6a1.8 1.8 0 0 1 3.6 0V11" />
    </>
  ),
};

export const APP_NAMES: Record<AppId, string> = {
  messages: 'Messagerie',
  wallet: 'Wallet',
  notes: 'Notes chiffrées',
  canaux: 'Canaux',
  wiki: 'SeyraWiki',
  compte: 'Compte',
};

/** Pictogramme seul, en trait. */
export function AppGlyph({ id, size = 20, strokeWidth = 1.8 }: { id: AppId; size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[id]}
    </svg>
  );
}

/** Tuile d'icône : aplat coloré, pictogramme blanc. */
export function AppTile({ id, size = 44 }: { id: AppId; size?: number }) {
  return (
    <span className={`app-tile app-tile--${id}`} style={{ width: size, height: size }}>
      <AppGlyph id={id} size={Math.round(size * 0.52)} strokeWidth={1.9} />
    </span>
  );
}

export function IconMenuLines({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}
