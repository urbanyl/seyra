import { SeyraMark } from './Icons';
import { useT } from '../lib/i18n';
import LangMenu from './LangMenu';

const RELEASES: { version: string; date: string; title: string; items: string[] }[] = [
  {
    version: '2.4.4',
    date: 'October 2026',
    title: 'One app, six languages, AI articles',
    items: [
      'Every app now shares the messaging layout: a sidebar with quick actions and stats, and a clean header.',
      'The whole interface is translated into six languages: English, French, Chinese, Russian, Korean and Arabic, right-to-left included.',
      'Pages open instantly: no more sign-in flash and no loading screen before the app.',
      'Wallet: pick the network from the header on phones, real chain logos, live CoinGecko prices in euros and 24-hour change.',
      'SeyraWiki: write a draft with the AI, browse an alphabetical index, filter by category, and read with a table of contents.',
      'Channels, notes and the account page are polished for desktop and phones, with larger tap targets and no duplicate buttons.',
      'New installers for Windows, macOS, Linux and Android, with SHA-256 checksums.',
    ],
  },
  {
    version: '2.4.3',
    date: 'October 2026',
    title: 'Arabic, desktop and Android apps, local AI',
    items: [
      'Arabic is available in right-to-left, bringing the interface to six languages.',
      'Windows installer and Android app, downloadable from the home page.',
      'macOS universal (Apple Silicon and Intel) and Linux AppImage/.deb builds, produced in CI.',
      'ai.seyra.website: a chat assistant running on the server, rate-limited and reachable over HTTPS.',
      'The AI subdomain only exposes /api/chat; model administration stays private.',
      'French strings that displayed garbled characters are fixed.',
      'Photo attachments use a single quality; the four compression variants are gone.',
      'SSH accepts keys only, and room memory is now capped globally.',
      'robots.txt, sitemap, favicon and absolute preview images for link sharing.',
    ],
  },
  {
    version: '2.4.2',
    date: 'October 2026',
    title: 'Typing that does not stutter',
    items: [
      'The text field is now uncontrolled: a keystroke no longer triggers any React render.',
      'Cracked earth background is rasterised once into an image instead of running a live SVG filter over the whole screen.',
      'Animated background uses fewer columns on phones and no longer forces a GPU layer per column.',
      'The anti-capture blur no longer fires when the keyboard opens or the focus moves between fields.',
    ],
  },
  {
    version: '2.4.1',
    date: 'October 2026',
    title: 'Faster typing on phones',
    items: [
      'The composer is now its own component: typing no longer re-renders the whole conversation.',
      'On phones, the bar keeps only attach, text and send. Emoji, whispers, dictation and message timers move into the attach menu.',
      'The header folds the whiteboard, selection and screen share into a "more" menu.',
      'Typing signals are throttled, and the text field autosize no longer forces a layout on every keystroke.',
    ],
  },
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
