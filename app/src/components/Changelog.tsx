import { SeyraMark } from './Icons';
import { useT } from '../lib/i18n';
import LangMenu from './LangMenu';

const RELEASES: { version: string; date: string; title: string; items: string[] }[] = [
  {
    version: '2.4.0',
    date: 'October 2026',
    title: 'Whiteboard, whispers, ghost sessions',
    items: [
      'Encrypted whiteboard: draw together, strokes are sealed like messages and vanish with the session.',
      'Whispers: a message only one person receives. The server relays it and never stores it.',
      'Ghost session: closes automatically a few minutes after the creator leaves. Set at creation.',
      'Panic key: press Escape three times to leave and blank the screen instantly.',
      'Local dictation: speak into the composer, transcribed on your device only. Hidden when the browser cannot do it offline.',
      'MIT license, and a server package published on GitHub Packages.',
    ],
  },
  {
    version: '2.3',
    date: 'October 2026',
    title: 'English by default, languages, new patterns',
    items: [
      'The whole interface is in English by default, with French, Chinese, Russian and Korean available from the flag menu.',
      'Mention suggestions: type @ and pick a name from the list with the mouse or the arrow keys.',
      'Roles removed: only the session owner can remove a participant.',
      'Flat design: no gradients, no blur, colours taken from the logo.',
      'New conversation patterns, and a text size setting.',
    ],
  },
  {
    version: '2.2.1',
    date: 'October 2026',
    title: 'Simpler polls',
    items: [
      'Poll button in the attachment menu: one question, two to six options, no syntax to remember.',
      'An incomplete /sondage command is refused with the expected format instead of being sent as plain text.',
    ],
  },
  {
    version: '2.2',
    date: 'October 2026',
    title: 'Camera, editing and mentions',
    items: [
      'Camera during a call, up to 4 people, 640 × 360. Dedicated button in the call bubble.',
      'Edit your text messages, with an “edited” mark. Only the author can edit.',
      'Read receipts, chosen when the session is created. Hidden when the option is off.',
      'Search filtered by sender and by type: photos, videos, files, voice notes, polls.',
      'New home page and new changelog page.',
    ],
  },
  {
    version: '2.1.1',
    date: 'October 2026',
    title: 'Fixes',
    items: [
      'Unpinning works: a second click removes the message from pins, for everyone.',
      'Mentions with a name containing spaces (“@Guest 1”) are matched in full.',
      'Session header stays readable on narrow phones.',
      'Deployment runs type checks and tests before every release.',
    ],
  },
  {
    version: '2.1',
    date: 'October 2026',
    title: 'Polls and threads',
    items: [
      'Polls: type /sondage Question | option | option. Votes are encrypted, counts are visible to all.',
      'Threads: a message with replies shows a “View thread” button.',
    ],
  },
  {
    version: '2.0',
    date: 'October 2026',
    title: 'Seyra 2.0',
    items: [
      'Pinned messages, visible at the top of the session for everyone.',
      'Mentions @name, with highlight and a dedicated sound.',
      'Screen sharing rebuilt: close, hide, fullscreen and reopen, sound muted when closed.',
      'Redrawn conversation backgrounds, readable light theme, grouped settings.',
      'Session panel: duration, messages, files and invite link.',
      'Search with Ctrl+F, shortcut help with ?.',
    ],
  },
  {
    version: '1.4',
    date: 'October 2026',
    title: 'Files, photos and videos',
    items: [
      'Send files up to 8 MB, split and encrypted in chunks.',
      'Photos compressed before sending, EXIF metadata removed.',
      'Paste an image from the clipboard (Ctrl+V).',
      'Cascade delete: a file disappears entirely.',
    ],
  },
];

export default function Changelog() {
  const t = useT();
  return (
    <div className="changelog home">
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

      <main className="cl-main">
        <p className="section-kicker">{t('news.kicker')}</p>
        <h1>{t('news.h1')}</h1>
        <p className="cl-lede">{t('news.lede')}</p>

        <div className="cl-timeline">
          {RELEASES.map((r, i) => (
            <section key={r.version} className={`cl-release ${i === 0 ? 'latest' : ''}`}>
              <div className="cl-card">
                <div className="cl-meta">
                  <span className="cl-version">{r.version}</span>
                  <span>{r.date}</span>
                  {i === 0 && <span className="cl-new">{t('news.latest')}</span>}
                </div>
                <h2>{r.title}</h2>
                <ul>
                  {r.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
              </div>
            </section>
          ))}
        </div>

        <a className="btn-primary cl-cta" href="/app">{t('final.cta')}</a>
      </main>
    </div>
  );
}
