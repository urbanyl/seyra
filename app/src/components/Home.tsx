import { useState } from 'react';
import { IconCamera, IconCheck, IconLock, IconPin, IconTimer, IconUsers, SeyraMark } from './Icons';
import { useT } from '../lib/i18n';
import LangMenu from './LangMenu';

const NETWORKS: [string, (u: string) => string][] = [
  ['WhatsApp', (u) => `https://wa.me/?text=${encodeURIComponent(u)}`],
  ['Telegram', (u) => `https://t.me/share/url?url=${encodeURIComponent(u)}`],
  ['X', (u) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(u)}`],
  ['LinkedIn', (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`],
  ['Facebook', (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`],
];

const FEATURES = [
  { t: 'f1.t', d: 'f1.d', icon: IconUsers },
  { t: 'f2.t', d: 'f2.d', icon: IconLock },
  { t: 'f3.t', d: 'f3.d', icon: IconTimer },
  { t: 'f4.t', d: 'f4.d', icon: IconCamera },
  { t: 'f5.t', d: 'f5.d', icon: IconPin },
  { t: 'f6.t', d: 'f6.d', icon: IconCheck },
];

const STEPS = [
  { n: '01', t: 's1.t', d: 's1.d' },
  { n: '02', t: 's2.t', d: 's2.d' },
  { n: '03', t: 's3.t', d: 's3.d' },
];

const SEC = [
  { t: 'sec1.t', d: 'sec1.d' },
  { t: 'sec2.t', d: 'sec2.d' },
  { t: 'sec3.t', d: 'sec3.d' },
  { t: 'sec4.t', d: 'sec4.d' },
];

export default function Home() {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/app' : '/app';
  const shareText = `Seyra — ${t('announce.title')} ${shareUrl}`;

  const copy = () => {
    navigator.clipboard?.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="home">
      <header className="home-nav">
        <a className="home-brand" href="/">
          <SeyraMark size={32} />
          <span>Seyra</span>
        </a>
        <nav>
          <a href="#fonctions">{t('nav.features')}</a>
          <a href="#comment">{t('nav.how')}</a>
          <a href="/securite">{t('nav.security')}</a>
          <a href="/nouveautes">{t('nav.news')}</a>
          <LangMenu />
          <a className="home-cta-small" href="/app">{t('nav.open')}</a>
        </nav>
      </header>

      <a className="v2-announce" href="/nouveautes">
        <span className="v2-badge">2.3</span>
        <span className="v2-text">
          <strong>{t('announce.title')}</strong>
          {t('announce.text')}
        </span>
        <span className="v2-go">{t('announce.cta')} →</span>
      </a>

      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">{t('hero.eyebrow')}</p>
          <h1>{t('hero.h1a')} {t('hero.h1b')} <span className="grad">{t('hero.h1c')}</span></h1>
          <p className="lede">{t('hero.lede')}</p>
          <div className="hero-actions">
            <a className="btn-primary" href="/app">{t('hero.cta1')}</a>
            <a className="btn-ghost" href="/app#rejoindre">{t('hero.cta2')}</a>
          </div>
          <ul className="hero-proof">
            <li>{t('hero.p1')}</li>
            <li>{t('hero.p2')}</li>
            <li>{t('hero.p3')}</li>
          </ul>
          <div className="hero-specs" aria-label={t('sec.kicker')}>
            <span>XSalsa20-Poly1305</span>
            <span>PBKDF2 · 210k</span>
            <span>DTLS-SRTP</span>
            <span>128 MB / {t('app.messages')}</span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="mock">
            <div className="mock-head">
              <span className="mock-live" />
              <span>{t('mock.title')}</span>
              <em>{t('mock.online')}</em>
            </div>
            <div className="mock-code">K7Q2 · MX9A · PD4R</div>
            <div className="mock-msg in">{t('mock.q')}</div>
            <div className="mock-msg out">{t('mock.a')}</div>
            <div className="mock-poll">
              <b>{t('mock.poll')}</b>
              <div className="mock-bar"><span style={{ width: '72%' }} /><em>{t('mock.yes')} · 3</em></div>
              <div className="mock-bar alt"><span style={{ width: '28%' }} /><em>{t('mock.no')} · 1</em></div>
            </div>
            <div className="mock-foot"><IconLock size={12} /> {t('mock.foot')}</div>
          </div>
        </div>
      </section>

      <section id="fonctions" className="home-section">
        <p className="section-kicker"><b>01</b>{t('feat.kicker')}</p>
        <h2>{t('feat.h2')}</h2>
        <div className="grid-feat">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <article key={f.t} className="feat">
                <span className="feat-icon"><Icon size={20} /></span>
                <h3>{t(f.t)}</h3>
                <p>{t(f.d)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="comment" className="home-section alt">
        <p className="section-kicker"><b>02</b>{t('how.kicker')}</p>
        <h2>{t('how.h2')}</h2>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="step-n">{s.n}</span>
              <div>
                <h3>{t(s.t)}</h3>
                <p>{t(s.d)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="securite" className="home-section">
        <p className="section-kicker"><b>03</b>{t('sec.kicker')}</p>
        <h2>{t('sec.h2')}</h2>
        <div className="sec-grid">
          {SEC.map((s) => (
            <div key={s.t}>
              <h3>{t(s.t)}</h3>
              <p>{t(s.d)}</p>
            </div>
          ))}
        </div>
        <p className="sec-more">
          <a className="doc-link" href="/securite">{t('sec.link')}</a>
        </p>
      </section>

      <section className="home-final">
        <h2>{t('final.h2')}</h2>
        <a className="btn-primary big" href="/app">{t('final.cta')}</a>

        <div className="home-share">
          <p>{t('share.title')}</p>
          <div className="share-row">
            {NETWORKS.map(([name, build]) => (
              <a key={name} className="share-chip" href={build(shareText)} target="_blank" rel="noopener noreferrer">
                {name}
              </a>
            ))}
            <button className="share-chip" onClick={copy}>{copied ? t('share.copied') : t('share.copy')}</button>
          </div>
        </div>
      </section>

      <footer className="home-foot">
        <span className="foot-brand">Seyra</span>
        <nav>
          <a href="/securite">{t('nav.security')}</a>
          <a href="/nouveautes">{t('nav.news')}</a>
          <a href="/app">{t('nav.open')}</a>
        </nav>
        <span className="foot-note">seyra.website</span>
      </footer>
    </div>
  );
}
