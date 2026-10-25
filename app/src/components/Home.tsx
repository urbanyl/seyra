import { useState } from 'react';
import { IconCamera, IconCheck, IconLock, IconPin, IconTimer, IconUsers, SeyraMark } from './Icons';
import { useT } from '../lib/i18n';
import LangMenu from './LangMenu';
import { RELEASE, formatSize } from '../lib/releases';

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
          <a className="home-dl-nav" href="#telecharger">{t('dl.kicker')}</a>
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
        <span className="v2-go">{t('announce.cta')} â†’</span>
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

      <section id="telecharger" className="home-section">
        <p className="section-kicker"><b>04</b>{t('dl.kicker')}</p>
        <h2>{t('dl.title')}</h2>
        <p className="dl-lead">{t('dl.sub')}</p>
        <div className="dl-grid">
          <a className="dl-card" href={`/downloads/${RELEASE.files.win}`} download>
            <span className="dl-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.6l7.6-1.05V11H3V4.6zm8.6-1.18L21 2v9h-9.4V3.42zM3 12h7.6v7.45L3 18.4V12zm8.6 0H21v9l-9.4-1.3V12z"/></svg>
            </span>
            <span className="dl-body"><b>{t('dl.win')}</b><em>{t('dl.winNote')}</em></span>
            <span className="dl-size">{formatSize(RELEASE.sizes.win)}</span>
          </a>
          <a className="dl-card" href={`/downloads/${RELEASE.files.mac}`} download>
            <span className="dl-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.7 12.9c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.5.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.5 2 1 0 1.4-.6 2.6-.6 1.2 0 1.5.6 2.6.6 1.1 0 1.8-1 2.4-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.2-.8-2.2-3zM14.6 6.2c.5-.6.8-1.4.7-2.2-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.8 2.2.8.1 1.7-.4 2.2-1.1z"/></svg>
            </span>
            <span className="dl-body"><b>{t('dl.mac')}</b><em>{t('dl.macNote')}</em></span>
            <span className="dl-size">{formatSize(RELEASE.sizes.mac)}</span>
          </a>
          <a className="dl-card" href={`/downloads/${RELEASE.files.linux}`} download>
            <span className="dl-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm2 4.6l3.4 3.4L5 15.4l1.4 1.4 4.8-4.8-4.8-4.8L5 8.6zM12 15h6v2h-6v-2z"/></svg>
            </span>
            <span className="dl-body"><b>{t('dl.linux')}</b><em>{t('dl.linuxNote')}</em></span>
            <span className="dl-size">{formatSize(RELEASE.sizes.linux)}</span>
          </a>
          <a className="dl-card" href={`/downloads/${RELEASE.files.apk}`} download>
            <span className="dl-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 4.3l-1.1-1.9a.4.4 0 0 1 .7-.4l1.1 2A6.9 6.9 0 0 1 12 3.2c1.5 0 2.9.4 4.1 1L17.2 2a.4.4 0 0 1 .7.4l-1.1 1.9A6.6 6.6 0 0 1 20 9.5H4a6.6 6.6 0 0 1 3.2-5.2zM8.5 7.4a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6zm7 0a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6zM4 10.5h16V17a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17v-6.5zM2.5 11H4v6H2.5A1.5 1.5 0 0 1 1 15.5v-3A1.5 1.5 0 0 1 2.5 11zm19 0H20v6h1.5A1.5 1.5 0 0 0 23 15.5v-3a1.5 1.5 0 0 0-1.5-1.5z"/></svg>
            </span>
            <span className="dl-body"><b>{t('dl.android')}</b><em>{t('dl.apkNote')}</em></span>
            <span className="dl-size">{formatSize(RELEASE.sizes.apk)}</span>
          </a>
        </div>
        <p className="dl-extra">
          <span>{t('dl.deb')}</span>
          <a href={`/downloads/${RELEASE.files.deb}`} download>.deb ({formatSize(RELEASE.sizes.deb)})</a>
        </p>
        <p className="dl-warn">{t('dl.unsigned')}</p>
        <p className="dl-foot">
          <span>{t('dl.version')} {RELEASE.version}</span>
          <a href="/downloads/SHA256SUMS.txt" target="_blank" rel="noopener noreferrer">{t('dl.verify')}</a>
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
          <a href="#telecharger">{t('dl.kicker')}</a>
          <a href="/app">{t('nav.open')}</a>
        </nav>
        <span className="foot-note">seyra.website</span>
      </footer>
    </div>
  );
}

