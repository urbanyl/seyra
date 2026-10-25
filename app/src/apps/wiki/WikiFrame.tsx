import type { ReactNode } from 'react';
import { useT } from '../../lib/i18n';
import AppFrame from '../../components/AppFrame';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/** Cadre SeyraWiki : navigation en barre latérale, page dans le pane. */
export default function WikiFrame({ title, subtitle, actions, children }: Props) {
  const t = useT();
  return (
    <AppFrame
      app="wiki"
      className="wiki-frame"
      title={title}
      subtitle={subtitle}
      actions={actions}
      nav={
        <>
          <p className="app-nav-title">{t('wk.encyclopedia')}</p>
          <a className="app-nav-item" href="/wiki">
            <span>{t('wk.all')}</span>
          </a>
          <a className="app-nav-item" href="/wiki/nouveau">
            <span>{t('wk.write')}</span>
          </a>
          <div className="app-card">
            <span className="app-card-label">{t('wk.frameCard')}</span>
            <p>{t('wk.frameCardText')}</p>
          </div>
        </>
      }
    >
      <div className="wiki-shell">{children}</div>
    </AppFrame>
  );
}
