import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatEther } from 'viem';
import type { ChainInfo } from './chains';
import { formatToken } from './format';
import { CopyButton, Notice } from './ui';
import { IconRefresh } from './icons';
import ChainLogo from './chainIcons';
import { formatEur, type Market } from './prices';

type Props = {
  address: `0x${string}`;
  chain: ChainInfo;
  balance: bigint | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  market: Market | null;
};

export default function BalanceCard({ address, chain, balance, loading, error, onRefresh, market }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    let alive = true;
    setQr(null);
    setQrError(false);
    QRCode.toDataURL(address, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 360,
      color: { dark: '#0d151c', light: '#ffffff' },
    })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setQrError(true);
      });
    return () => {
      alive = false;
    };
  }, [address]);

  const exact = balance === null ? null : formatEther(balance);
  const shown = balance === null ? '—' : formatToken(balance);
  const fiat =
    balance !== null && market && Number.isFinite(market.priceEur)
      ? market.priceEur * Number(formatEther(balance))
      : null;

  return (
    <section className="w-card w-balance-card" aria-label="Solde du portefeuille" aria-busy={loading}>
      <div className="w-balance-head">
        <div className="w-balance-main">
          <div className="w-balance-caption">
            <ChainLogo chain={chain} size={16} className="inline" />
            <span>Solde</span>
            <span className="w-dot" />
            <span>{chain.name}</span>
            {chain.testnet && <span className="w-testnet">test</span>}
          </div>
          <div className="w-balance-value" title={exact ? `${exact} ${chain.symbol}` : undefined}>
            {shown}
            {balance !== null && <small>{chain.symbol}</small>}
            {loading && <span className="w-spinner w-spinner-inline" aria-hidden="true" />}
          </div>
          {fiat !== null && !chain.testnet && (
            <div className="w-balance-fiat">
              <strong>{formatEur(fiat)}</strong>
              {market && market.change24h !== null && (
                <span className={`w-change ${market.change24h >= 0 ? 'up' : 'down'}`}>
                  {market.change24h >= 0 ? '▲' : '▼'} {Math.abs(market.change24h).toFixed(1)} % · 24 h
                </span>
              )}
              {market && <span className="w-unit">{`1 ${market.symbol} ≈ ${formatEur(market.priceEur)}`}</span>}
            </div>
          )}
          <p className="w-balance-hint">
            {market && !chain.testnet
              ? 'Prix en direct via CoinGecko, actualisé chaque minute.'
              : 'Même adresse sur tous les réseaux EVM listés.'}
          </p>
        </div>
        <div className="w-qr-wrap" aria-label="QR code de réception">
          {qr ? (
            <img src={qr} alt={`QR code de l'adresse ${address}`} width={360} height={360} />
          ) : (
            <div className="w-qr-empty">
              {qrError ? 'QR indisponible' : <span className="w-spinner" aria-hidden="true" />}
            </div>
          )}
        </div>
      </div>

      <div className="w-addr-row">
        <code>{address}</code>
        <CopyButton
          text={address}
          iconOnly
          label="Copier l'adresse"
          copiedLabel="Adresse copiée"
        />
        <button
          type="button"
          className="w-icon-btn"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Rafraîchir le solde"
          title="Rafraîchir le solde"
        >
          <IconRefresh size={17} />
        </button>
      </div>
      <div className="w-addr-caption">
        Scanne le QR code ou copie l'adresse pour recevoir des fonds sur {chain.name}.
      </div>

      {error && (
        <div className="w-balance-error">
          <Notice tone="danger" title="Solde indisponible">
            <p>{error}</p>
            <p className="w-rpc">
              RPC : <code>{chain.rpc}</code>
            </p>
            <button type="button" className="w-btn small ghost" onClick={onRefresh}>
              Réessayer
            </button>
          </Notice>
        </div>
      )}
    </section>
  );
}
