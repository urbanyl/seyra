import { Fragment } from 'react';
import { SeyraMark } from './Icons';
import LangMenu from './LangMenu';
import { useLang, useT } from '../lib/i18n';
import { SECURITY_DOC, type Block } from '../lib/securityDoc';

/** Mini-balisage : **gras**, `code`. */
function rich(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === 'p') return <p key={i}>{rich(b.v)}</p>;
        if (b.t === 'note') return <p key={i} className="doc-note">{rich(b.v)}</p>;
        if (b.t === 'pre') return <pre key={i} className="doc-code">{b.v}</pre>;
        return <ul key={i}>{b.v.map((li) => <li key={li}>{rich(li)}</li>)}</ul>;
      })}
    </>
  );
}

export default function Security() {
  const t = useT();
  const lang = useLang();
  const doc = SECURITY_DOC[lang === 'fr' ? 'fr' : 'en'];

  return (
    <div className="home doc">
      <header className="home-nav">
        <a className="home-brand" href="/">
          <SeyraMark size={32} />
          <span>Seyra</span>
        </a>
        <nav>
          <a href="/securite">{t('nav.security')}</a>
          <LangMenu />
          <a className="home-cta-small" href="/app">{t('nav.open')}</a>
        </nav>
      </header>

      <article className="doc-wrap">
        <p className="eyebrow">{doc.eyebrow}</p>
        <h1>{doc.h1}</h1>
        <p className="doc-lede">{doc.lede}</p>

        <div className="doc-kpis">
          {doc.kpis.map((k) => (
            <div key={k.k}><strong>{k.k}</strong><span>{k.v}</span></div>
          ))}
        </div>

        <div className="doc-layout">
          <nav className="doc-toc">
            {doc.sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}>{Number(s.n)}. {s.title}</a>
            ))}
          </nav>

          <div className="doc-main">
            {doc.sections.map((s) => (
              <section key={s.id} id={s.id} className="doc-sec">
                <h2><span>{s.n}</span>{s.title}</h2>
                {s.id === 'chiffres' ? (
                  <div className="doc-kv">
                    {doc.numbers.map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Blocks blocks={s.blocks} />
                )}
              </section>
            ))}

            <div className="doc-end">
              <p>{doc.updated}</p>
              <a className="btn-primary" href="/app">{doc.cta}</a>
            </div>
          </div>
        </div>
      </article>

      <footer className="home-foot">
        <span className="foot-brand">Seyra</span>
        <nav>
          <a href="/">{t('nav.home')}</a>
          <a href="/nouveautes">{t('nav.news')}</a>
        </nav>
        <span className="foot-note">seyra.website</span>
      </footer>
    </div>
  );
}
