import type { ReactNode } from 'react';
import AppFrame from '../../components/AppFrame';
import { IconGrid, IconPencil, IconShield } from '../../components/Icons';
import { useT } from '../../lib/i18n';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/** Cadre SeyraWiki : navigation en barre latérale, page dans le pane. */
export default function WikiFrame({ title, subtitle, actions, children }: Props) {
  const t = useT();
  const path = window.location.pathname.replace(/\/+$/, '') || '/wiki';
  const onIndex = path === '/wiki';
  const onNew = path === '/wiki/nouveau';

  return (
    <AppFrame
      app="wiki"
      className="wiki-frame"
      title={title}
      subtitle={subtitle}
      actions={actions}
      nav={
        <>
          <span className="side-title">{t('wk.encyclopedia')}</span>
          <div className="participants">
            <a className={`participant app-row${onIndex ? ' is-on' : ''}`} href="/wiki" aria-current={onIndex ? 'page' : undefined}>
              <span className="app-row-icon"><IconGrid size={16} /></span>
              <span className="participant-name"><span>{t('wk.all')}</span></span>
            </a>
            <a className={`participant app-row${onNew ? ' is-on' : ''}`} href="/wiki/nouveau" aria-current={onNew ? 'page' : undefined}>
              <span className="app-row-icon"><IconPencil size={16} /></span>
              <span className="participant-name"><span>{t('wk.write')}</span></span>
            </a>
          </div>
          <div className="code-card">
            <span className="code-label"><IconShield size={12} /> {t('wk.frameCard')}</span>
            <em>{t('wk.frameCardText')}</em>
          </div>
        </>
      }
    >
      <div className="wiki-shell">{children}</div>
    </AppFrame>
  );
}
