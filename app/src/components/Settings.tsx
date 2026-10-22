import { useRef } from 'react';
import { WALLPAPERS, THEMES, type Prefs } from '../lib/prefs';
import { Modal } from './ui';
import { IconImage, IconScreenShare } from './Icons';

export default function Settings({ prefs, onChange, sessionWall, onSetWall, onClose }: {
  prefs: Prefs;
  onChange: (patch: Partial<Prefs>) => void;
  sessionWall: string | null;
  onSetWall: (wall: string) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const pickWall = (f: File | undefined) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ customWall: String(reader.result || ''), wallpaper: 'custom' });
    reader.readAsDataURL(f);
  };

  const isShared = (id: string) => sessionWall === id || (id === 'none' && !sessionWall);

  return (
    <Modal title="Personnaliser" onClose={onClose} width={480}>
      <div className="settings-grid">
        <div className="settings-row">
          <label>Fond de la conversation <em className="opt">— pour tout le monde</em></label>
          <div className="wall-swatches">
            {WALLPAPERS.map((w) => (
              <button
                key={w.id}
                className={`wall-swatch ${isShared(w.id) ? 'on' : ''}`}
                title={w.name}
                style={{ backgroundImage: w.css === 'none' ? 'none' : w.css }}
                onClick={() => onSetWall(w.id === 'none' ? '' : w.id)}
              />
            ))}
          </div>
          <em className="field-hint">Le motif choisi s'applique à la session : tout le monde le voit. Le filigrane est léger pour ne pas gêner la lecture.</em>
        </div>

        <div className="settings-row">
          <label>Thème <em className="opt">— votre appareil</em></label>
          <div className="swatches">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`swatch ${prefs.theme === t.id ? 'on' : ''}`}
                style={{ background: `linear-gradient(135deg, ${t.head}, ${t.bubbleOut})` }}
                title={t.name}
                onClick={() => onChange({ theme: t.id })}
              >
                <i style={{ background: t.accent }} />
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <label>Image de fond personnelle <em className="opt">— vous seulement, jamais envoyée</em></label>
          <div className="wall-swatches">
            {prefs.customWall && (
              <button
                className={`wall-swatch ${prefs.wallpaper === 'custom' ? 'on' : ''}`}
                style={{ backgroundImage: `url(${prefs.customWall})` }}
                title="Image personnalisée"
                onClick={() => { onChange({ wallpaper: 'custom' }); onSetWall(''); }}
              />
            )}
            <button className="wall-swatch" title="Importer une image" onClick={() => fileRef.current?.click()} style={{ display: 'grid', placeItems: 'center' }}>
              <IconImage size={18} />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickWall(e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        <div className="settings-row">
          <label>Confort</label>
          <div className="toggle-row">
            <span>Densité compacte<em>Plus de messages à l'écran</em></span>
            <button
              className={`switch ${prefs.density === 'compact' ? 'on' : ''}`}
              role="switch"
              aria-checked={prefs.density === 'compact'}
              onClick={() => onChange({ density: prefs.density === 'compact' ? 'comfortable' : 'compact' })}
            />
          </div>
          <div className="toggle-row">
            <span>Mode discret<em>Le texte se floute jusqu'au survol</em></span>
            <button
              className={`switch ${prefs.discreet ? 'on' : ''}`}
              role="switch"
              aria-checked={prefs.discreet}
              onClick={() => onChange({ discreet: !prefs.discreet })}
            />
          </div>
          <div className="toggle-row">
            <span>Son des messages<em>Un petit bip à chaque nouveau message</em></span>
            <button
              className={`switch ${prefs.sound ? 'on' : ''}`}
              role="switch"
              aria-checked={prefs.sound}
              onClick={() => onChange({ sound: !prefs.sound })}
            />
          </div>
        </div>

        <p className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconScreenShare size={13} /> Astuce : le bouton écran dans l'en-tête partage votre écran pendant un appel.
        </p>
      </div>
    </Modal>
  );
}
