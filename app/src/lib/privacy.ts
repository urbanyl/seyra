/* Confidentialité & dissuasion :
 * - Empêche la sélection, le copier, le menu contextuel et l'impression.
 * - Flou de la fenêtre dès qu'elle perd le focus (repartage d'écran, changement d'onglet).
 * - Écran de confidentialité pendant une capture détectée (touche Impr. écran,
 *   raccourcis Windows/macOS, ou passage en arrière-plan).
 *
 * Aucune de ces mesures ne bloque une capture faite par un appareil externe ou un
 * système compromis : elles dissuadent et rendent la capture « propre » difficile.
 */

const STYLE_ID = 'seyra-privacy-style';
const SHIELD_ID = 'seyra-privacy-shield';

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html, body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    input, textarea, [contenteditable="true"] { -webkit-user-select: text; user-select: text; }
    img, video { -webkit-user-drag: none; user-drag: none; }
    @media print { body { display: none !important; } }
    #${SHIELD_ID} {
      position: fixed; inset: 0; z-index: 2147483647;
      background: #05080b; color: #9fb3c8; display: none;
      place-items: center; text-align: center; padding: 24px;
      font: 500 15px/1.6 system-ui, sans-serif; letter-spacing: 0.01em;
    }
    #${SHIELD_ID}.on { display: grid; }
    #${SHIELD_ID} .shield-card { max-width: 340px; }
    #${SHIELD_ID} strong { display: block; color: #e9edef; font-size: 17px; margin-bottom: 8px; }
    .seyra-blur { filter: blur(18px) saturate(0.6); transition: filter 0.15s ease; }
    @media (prefers-reduced-motion: reduce) { .seyra-blur { transition: none; } }
  `;
  document.head.appendChild(style);
}

function shield(): HTMLElement {
  let el = document.getElementById(SHIELD_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = SHIELD_ID;
    el.innerHTML = '<div class="shield-card"><strong>Écran protégé</strong>'
      + 'Le contenu est masqué pendant une capture ou un aperçu d’écran.</div>';
    document.body.appendChild(el);
  }
  return el;
}

export function installPrivacyShield() {
  installStyles();
  const s = shield();
  const app = () => document.getElementById('root');

  const show = () => s.classList.add('on');
  const hide = () => s.classList.remove('on');

  const onContextMenu = (e: MouseEvent) => e.preventDefault();
  const onSelectStart = (e: Event) => {
    const t = e.target as HTMLElement | null;
    if (t && t.closest('input, textarea, [contenteditable="true"]')) return;
    e.preventDefault();
  };
  const onCopy = (e: ClipboardEvent) => {
    const t = document.querySelector('input:focus, textarea:focus, [contenteditable="true"]:focus');
    if (!t) e.preventDefault();
  };
  const onCut = (e: ClipboardEvent) => {
    const t = document.querySelector('input:focus, textarea:focus, [contenteditable="true"]:focus');
    if (!t) e.preventDefault();
  };
  const onDragStart = (e: DragEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && t.closest('img, video')) e.preventDefault();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key;
    const prt = k === 'PrintScreen' || e.code === 'PrintScreen';
    // Raccourcis de capture : Windows (Win+Maj+S), macOS (Cmd+Maj+3/4/5), aperçu Firefox.
    const winSnip = e.metaKey && e.shiftKey && (k === 's' || k === 'S');
    const winSnipAlt = e.metaKey && e.shiftKey && (k === 'S');
    const altPrt = e.altKey && (k === 'PrintScreen' || e.code === 'PrintScreen');
    const macSnip = e.shiftKey && e.metaKey && ['3', '4', '5'].includes(k);
    if (prt || winSnip || winSnipAlt || altPrt || macSnip) {
      show();
      window.setTimeout(hide, 2500);
    }
  };

  // Ouvrir le clavier ou changer de champ ne doit pas flouter l'écran.
  let lastFocus = 0;
  const onFocus = () => { lastFocus = Date.now(); hide(); };
  const onBlur = () => {
    const el = document.activeElement as HTMLElement | null;
    if (el && el.closest && el.closest('input, textarea, [contenteditable="true"]')) return;
    if (Date.now() - lastFocus < 1500) return;
    app()?.classList.add('seyra-blur');
    window.setTimeout(() => app()?.classList.remove('seyra-blur'), 400);
  };
  const onVisibility = () => {
    if (document.hidden) {
      app()?.classList.add('seyra-blur');
    } else {
      window.setTimeout(() => app()?.classList.remove('seyra-blur'), 200);
    }
  };

  document.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('selectstart', onSelectStart);
  document.addEventListener('copy', onCopy);
  document.addEventListener('cut', onCut);
  document.addEventListener('dragstart', onDragStart);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', (e) => { if (e.key === 'PrintScreen' || e.code === 'PrintScreen') hide(); }, true);
  window.addEventListener('focus', onFocus);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
}
