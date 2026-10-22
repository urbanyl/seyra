import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import './invite.css';

export default function InviteQR({ url }: { url: string }) {
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
        <p className="invite-qr-error" role="alert">Impossible de générer le QR code.</p>
      ) : src ? (
        <img src={src} width={220} height={220} alt="QR code d'invitation" />
      ) : (
        <p className="invite-qr-loading" role="status">Génération du QR code…</p>
      )}
    </div>
  );
}
