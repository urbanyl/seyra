import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import './invite.css';
import { useT } from '../lib/i18n';

export default function InviteQR({ url }: { url: string }) {
  const t = useT();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setFailed(false);
    QRCode.toDataURL(url, {
      width: 220,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b141a', light: '#ffffff' },
      margin: 2,
    })
      .then((data) => { if (alive) setSrc(data); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [url]);

  return (
    <div className="invite-qr">
      {failed ? (
        <p className="invite-qr-error" role="alert">{t('qr.failed')}</p>
      ) : src ? (
        <img src={src} width={220} height={220} alt={t('qr.alt')} />
      ) : (
        <p className="invite-qr-loading" role="status">{t('qr.loading')}</p>
      )}
    </div>
  );
}
