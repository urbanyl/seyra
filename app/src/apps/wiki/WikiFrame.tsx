import type { ReactNode } from 'react';
import AppFrame from '../../components/AppFrame';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/** Cadre SeyraWiki : navigation en barre latérale, page dans le pane. */
export default function WikiFrame({ title, subtitle, actions, children }: Props) {
  return (
    <AppFrame
      app="wiki"
      className="wiki-frame"
      title={title}
      subtitle={subtitle}
      actions={actions}
      nav={
        <>
          <p className="app-nav-title">Encyclopédie</p>
          <a className="app-nav-item" href="/wiki">
            <span>Tous les articles</span>
          </a>
          <a className="app-nav-item" href="/wiki/nouveau">
            <span>Écrire un article</span>
          </a>
          <div className="app-card">
            <span className="app-card-label">Sans compte</span>
            <p>Tout le monde peut lire, écrire et corriger. Rien de secret ici.</p>
          </div>
        </>
      }
    >
      <div className="wiki-shell">{children}</div>
    </AppFrame>
  );
}
