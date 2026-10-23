import { useRef } from 'react';
import { WALLPAPERS, THEMES, type Prefs } from '../lib/prefs';
import { Modal } from './ui';
import { IconImage, IconScreenShare } from './Icons';
import MatrixWall from './MatrixWall';
import CracksWall from './CracksWall';
import { useT } from '../lib/i18n';

export default function Settings({ prefs, onChange, onClose }: {
  prefs: Prefs;
  onChange: (patch: Partial<Prefs>) => void;
  onClose: () => void;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const pickWall = (f: File | undefined) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ customWall: String(reader.result || ''), wallpaper: 'custom' });
    reader.readAsDataURL(f);
  };

  const isChosen = (id: string) => prefs.wallpaper === id;

  return (
    <Modal title={t('settings.title')} onClose={onClose} width={480}>
      <div className="settings-grid">
        <div className="settings-row">
          <label>{t('settings.wallPersonalLabel')}</label>
          <div className="wall-swatches">
            {WALLPAPERS.map((w) => (
              <button
                key={w.id}
                className={`wall-swatch ${isChosen(w.id) ? 'on' : ''}`}
                title={t(w.name)}
                style={{ background: w.css }}
                onClick={() => onChange({ wallpaper: w.id, customWall: '' })}
              >
                {w.id === 'matrix' && <MatrixWall mini />}
                {w.id === 'cracks' && <CracksWall mini />}
              </button>
            ))}
            <button
              className={`wall-swatch ${prefs.wallpaper === 'custom' && prefs.customWall ? 'on' : ''}`}
              title={t('settings.import')}
              onClick={() => fileRef.current?.click()}
              style={{ display: 'grid', placeItems: 'center', backgroundImage: prefs.customWall && prefs.wallpaper === 'custom' ? `url(${prefs.customWall})` : 'none' }}
            >
              {!(prefs.wallpaper === 'custom' && prefs.customWall) && <IconImage size={18} />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickWall(e.target.files?.[0]); e.target.value = ''; }} />
          <em className="field-hint">{t('settings.wallPersonalHint')}</em>
        </div>

        <div className="settings-row">
          <label>{t('settings.theme')}</label>
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
          <label>{t('settings.textSize')}</label>
          <div className="seg" role="radiogroup" aria-label={t('settings.textSize')}>
            {([['small', t('settings.small')], ['normal', t('settings.normal')], ['large', t('settings.large')]] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={prefs.fontScale === id}
                className={prefs.fontScale === id ? 'on' : ''}
                onClick={() => onChange({ fontScale: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <label>{t('settings.comfort')}</label>
          <div className="toggle-row">
            <span>{t('settings.colorblind')}<em>{t('settings.colorblindHint')}</em></span>
            <button
              className={`switch ${prefs.colorblind ? 'on' : ''}`}
              role="switch"
              aria-checked={prefs.colorblind}
              onClick={() => onChange({ colorblind: !prefs.colorblind })}
            />
          </div>
          <div className="toggle-row">
            <span>{t('settings.compact')}<em>{t('settings.compactHint')}</em></span>
            <button
              className={`switch ${prefs.density === 'compact' ? 'on' : ''}`}
              role="switch"
              aria-checked={prefs.density === 'compact'}
              onClick={() => onChange({ density: prefs.density === 'compact' ? 'comfortable' : 'compact' })}
            />
          </div>
          <div className="toggle-row">
            <span>{t('settings.discreet')}<em>{t('settings.discreetHint')}</em></span>
            <button
              className={`switch ${prefs.discreet ? 'on' : ''}`}
              role="switch"
              aria-checked={prefs.discreet}
              onClick={() => onChange({ discreet: !prefs.discreet })}
            />
          </div>
          <div className="toggle-row">
            <span>{t('settings.sound')}<em>{t('settings.soundHint')}</em></span>
            <button
              className={`switch ${prefs.sound ? 'on' : ''}`}
              role="switch"
              aria-checked={prefs.sound}
              onClick={() => onChange({ sound: !prefs.sound })}
            />
          </div>
        </div>

        <p className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconScreenShare size={13} /> {t('settings.tip')}
        </p>
      </div>
    </Modal>
  );
}
