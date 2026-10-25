import { useState, type ReactNode } from 'react';
import { SeyraMark, IconUsers, IconX } from './Icons';
import { AppTile, type AppId } from './AppIcons';
import { Avatar } from './ui';
import { useT } from '../lib/i18n';
import './appframe.css';

type Stat = [value: ReactNode, label: string];

type Props = {
  /** Appli courante : icône du pane-head et nom du cadre. */
  app: AppId;
  /** Sous-titre sous la marque (équivalent de « session privée »). */
  sideSub?: string;
  /** Deux actions (.side-action) sous la marque. */
  quick?: ReactNode;
  /** Trois statistiques (.side-stats). */
  stats?: Stat[];
  /** Contenu de la carte (.code-card). */
  card?: ReactNode;
  /** Contenu de la barre latérale au-dessus de la liste : recherche, sections, réseaux. */
  nav?: ReactNode;
  /** Titre de la liste (.side-title). */
  sideTitle?: ReactNode;
  /** Lignes de la liste (SideRow). */
  list?: ReactNode;
  /** Pied de la barre latérale : action principale et note. */
  foot?: ReactNode;
  /** Titre du pane-head. */
  title: ReactNode;
  /** Sous-titre du pane-head : texte, icônes et point de statut. */
  subtitle?: ReactNode;
  /** Avatars empilés à gauche du titre (par défaut : icône de l'appli). */
  avatars?: ReactNode;
  /** Boutons à droite du pane-head (.icon-btn). */
  actions?: ReactNode;
  /** Bandeau discret en haut de la zone (.e2e-note). */
  note?: ReactNode;
  /** Barre du bas (.composer). */
  bottom?: ReactNode;
  /** La zone de contenu gère son propre défilement. */
  fixedBody?: boolean;
  className?: string;
  children?: ReactNode;
};

/** Ligne de liste : même rendu qu'un participant de la Messagerie. */
export function SideRow({
  name, color = 0, sub, right, active, onClick, title,
}: {
  name: string; color?: number; sub?: ReactNode; right?: ReactNode; active?: boolean; onClick?: () => void; title?: string;
}) {
  return (
    <button type="button" className={`participant app-row${active ? ' is-on' : ''}`} onClick={onClick} title={title} aria-current={active ? 'true' : undefined}>
      <Avatar name={name} color={color} size={38} />
      <span className="participant-name">
        <span>{name}</span>
        {sub && <em>{sub}</em>}
      </span>
      {right && <span className="app-row-right">{right}</span>}
    </button>
  );
}

/**
 * Cadre commun des applis, sur le modèle exact de /app (Messagerie) :
 * barre latérale (marque, actions, statistiques, carte, liste, pied) et
 * panneau de droite (en-tête, fond de conversation, barre du bas).
 */
export default function AppFrame(p: Props) {
  const t = useT();
  const appName = t('app.' + p.app);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className={`session app-frame${p.className ? ` ${p.className}` : ''}`}>
      <aside
        className={`side${open ? ' open' : ''}`}
        aria-label={appName}
        onClick={(event) => {
          // Sur mobile, choisir un élément de la liste referme la feuille.
          const target = event.target as HTMLElement | null;
          if (target?.closest('.participant, .side-action')) close();
        }}
      >
        <header className="side-head">
          <a className="side-brand" href="/" title={t('fw.home')}>
            <SeyraMark size={36} />
            <div>
              <strong>Seyra</strong>
              <span>{p.sideSub ?? appName}</span>
            </div>
          </a>
          <button type="button" className="side-hide" onClick={close} aria-label={t('fw.close')}>
            <IconX size={20} />
          </button>
        </header>

        {p.quick && <div className="side-quick">{p.quick}</div>}

        {p.stats && (
          <div className="side-stats" aria-label={appName}>
            {p.stats.map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        {p.card && <div className="code-card">{p.card}</div>}

        {(p.nav || p.list !== undefined) && (
          <div className="side-section app-scroll">
            {p.nav}
            {p.list !== undefined && (
              <>
                {p.sideTitle && <span className="side-title">{p.sideTitle}</span>}
                <div className="participants">{p.list}</div>
              </>
            )}
          </div>
        )}

        {p.foot && <div className="side-foot">{p.foot}</div>}
      </aside>
      {open && <div className="scrim" onClick={close} />}

      <main className="main">
        <section className="pane app-pane">
          <header className="pane-head">
            <button type="button" className="icon-btn mobile-only" onClick={() => setOpen(true)} aria-label={t('fw.menu')}>
              <IconUsers size={19} />
            </button>
            {p.avatars ? <div className="stack">{p.avatars}</div> : <AppTile id={p.app} size={34} />}
            <div className="pane-title">
              <h2>{p.title}</h2>
              {p.subtitle && <p>{p.subtitle}</p>}
            </div>
            {p.actions && <div className="pane-actions">{p.actions}</div>}
          </header>

          <div className={`messages app-body${p.fixedBody ? ' app-body--fixed' : ''}`}>
            {p.note && <div className="e2e-note app-note">{p.note}</div>}
            {p.children}
          </div>

          {p.bottom && <div className="composer app-bottom">{p.bottom}</div>}
        </section>
      </main>
    </div>
  );
}
