import { useEffect, useMemo, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import type { WalletData } from './types';
import { CHAINS, chainById } from './chains';
import { balanceErrorMessage } from './errors';
import BalanceCard from './BalanceCard';
import SendPanel from './SendPanel';
import SeedPanel from './SeedPanel';
import ImportPanel from './ImportPanel';
import { Notice, SafetyNotes } from './ui';
import { IconGlobe, IconLock } from './icons';
import ChainLogo from './chainIcons';
import { useMarkets } from './useMarkets';
import { chainMarket, formatEur } from './prices';
import AppFrame from '../../components/AppFrame';

type Props = {
  wallet: WalletData;
  onChainChange: (chainId: number) => void;
  onReplace: (phrase: string) => void;
};

type BalanceStatus = {
  key: string;
  loading: boolean;
  balance: bigint | null;
  error: string | null;
};

export default function Dashboard({ wallet, onChainChange, onReplace }: Props) {
  const chain = chainById(wallet.chainId);
  const { markets } = useMarkets();
  const market = chainMarket(chain, markets);
  const account = useMemo(() => {
    try {
      return mnemonicToAccount(wallet.mnemonic);
    } catch {
      return null;
    }
  }, [wallet.mnemonic]);
  const address = account?.address ?? null;
  const balanceKey = address ? `${address}:${chain.id}` : '';
  const [status, setStatus] = useState<BalanceStatus | null>(null);
  const [tick, setTick] = useState(0);
  const active: BalanceStatus =
    status && status.key === balanceKey
      ? status
      : { key: balanceKey, loading: Boolean(address), balance: null, error: null };

  useEffect(() => {
    if (!address) return;
    let alive = true;
    const key = `${address}:${chain.id}`;
    setStatus((previous) => ({
      key,
      loading: true,
      balance: previous && previous.key === key ? previous.balance : null,
      error: null,
    }));
    const client = createPublicClient({
      chain: chain.chain,
      transport: http(chain.rpc, { timeout: 12_000, retryCount: 1 }),
    });
    client
      .getBalance({ address })
      .then((value) => {
        if (!alive) return;
        setStatus({ key, loading: false, balance: value, error: null });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setStatus({
          key,
          loading: false,
          balance: null,
          error: balanceErrorMessage(err, chain),
        });
      });
    return () => {
      alive = false;
    };
  }, [address, chain, tick]);

  const refresh = () => setTick((value) => value + 1);

  /* Barre latérale : liste des réseaux avec logo, prix et adresse. */
  const networkNav = (
    <>
      <span className="side-title"><IconGlobe size={13} /> Réseau</span>
      <div className="w-chain-list" role="listbox" aria-label="Choisir le réseau">
        {CHAINS.map((item) => {
          const price = chainMarket(item, markets);
          const on = item.id === chain.id;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={on}
              className={`w-chain-row${on ? ' is-on' : ''}`}
              onClick={() => onChainChange(item.id)}
            >
              <ChainLogo chain={item} size={26} />
              <span className="w-chain-row-name">
                {item.name}
                {item.testnet ? ' (test)' : ''}
              </span>
              <span className="w-chain-row-price">
                {price ? `${formatEur(price.priceEur)} ${price.change24h !== null ? (price.change24h >= 0 ? '▲' : '▼') : ''}` : item.symbol}
              </span>
            </button>
          );
        })}
      </div>
      {address && (
        <div className="code-card">
          <span className="code-label"><IconLock size={12} /> Adresse</span>
          <code>{`${address.slice(0, 8)}…${address.slice(-6)}`}</code>
          <em>Même adresse sur tous les réseaux EVM listés.</em>
        </div>
      )}
    </>
  );

  return (
    <AppFrame
      app="wallet"
      className="w-frame"
      fixedBody
      sideSub="Clés locales · EVM"
      title="Portefeuille"
      subtitle={
        <>
          <ChainLogo chain={chain} size={14} className="inline" /> {chain.name}{chain.testnet ? ' (test)' : ''}
          <i className="live online" /> {market ? `1 ${market.symbol} ≈ ${formatEur(market.priceEur)}` : 'Non dépositaire'}
        </>
      }
      note={<>Non dépositaire : vos clés restent sur cet appareil, dans le coffre.</>}
      stats={
        market
          ? [
              [formatEur(market.priceEur), `${market.symbol} (EUR)`],
              [market.change24h === null ? '—' : `${market.change24h >= 0 ? '+' : ''}${market.change24h.toFixed(1)} %`, '24 heures'],
              [CHAINS.length, 'Réseaux'],
            ]
          : [
              [chain.symbol, 'Devise'],
              [CHAINS.length, 'Réseaux'],
              [chain.testnet ? 'Test' : 'Principal', 'Type'],
            ]
      }
      quick={
        <>
          <button
            type="button"
            className="side-action"
            disabled={!address}
            onClick={() => { if (address) navigator.clipboard?.writeText(address).catch(() => {}); }}
          >
            Copier l’adresse
          </button>
          <a className="side-action" href="/compte">Compte</a>
        </>
      }
      nav={networkNav}
    >
      <div className="w-scroll">
        <main className="w-main">
          {account ? (
            <>
              <BalanceCard
                address={account.address}
                chain={chain}
                balance={active.balance}
                loading={active.loading}
                error={active.error}
                onRefresh={refresh}
                market={market}
              />
              <SafetyNotes />
              <div className="w-grid">
                <SendPanel
                  key={`${account.address}:${chain.id}`}
                  account={account}
                  chain={chain}
                  balance={active.balance}
                  onRefreshBalance={refresh}
                  market={market}
                />
                <div className="w-side">
                  <SeedPanel key={account.address} mnemonic={wallet.mnemonic} />
                  <ImportPanel onReplace={onReplace} />
                </div>
              </div>
            </>
          ) : (
            <>
              <Notice tone="danger" title="Phrase illisible">
                La phrase stockée dans le coffre ne permet pas de dériver une adresse. Importe ta
                phrase de récupération pour retrouver l'accès.
              </Notice>
              <ImportPanel onReplace={onReplace} defaultOpen />
              <SafetyNotes />
            </>
          )}
        </main>
      </div>
    </AppFrame>
  );
}
