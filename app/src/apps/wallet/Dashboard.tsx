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
import { IconChevronDown, IconGlobe, IconLock } from './icons';
import ChainLogo from './chainIcons';
import { useMarkets } from './useMarkets';
import { chainMarket, formatEur } from './prices';
import { Modal } from '../../components/ui';
import AppFrame from '../../components/AppFrame';
import { useT } from '../../lib/i18n';

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
  const t = useT();
  const chain = chainById(wallet.chainId);
  const { markets } = useMarkets();
  const market = chainMarket(chain, markets);
  const [chainPicker, setChainPicker] = useState(false);
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
  }, [address, chain, tick, t]);

  const refresh = () => setTick((value) => value + 1);

  /* Barre latérale : liste des réseaux avec logo, prix et adresse. */
  const networkNav = (
    <>
      <span className="side-title"><IconGlobe size={13} /> {t('wl.network')}</span>
      <div className="w-chain-list" role="listbox" aria-label={t('wl.pickNetwork')}>
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
                {item.testnet ? ` (${t('wl.testShort')})` : ''}
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
          <span className="code-label"><IconLock size={12} /> {t('wl.address')}</span>
          <code>{`${address.slice(0, 8)}…${address.slice(-6)}`}</code>
          <em>{t('wl.sameAddr')}</em>
        </div>
      )}
    </>
  );

  return (
    <AppFrame
      app="wallet"
      className="w-frame"
      fixedBody
      sideSub={t('wl.sideSub')}
      title={t('wl.title')}
      subtitle={
        <>
          <ChainLogo chain={chain} size={14} className="inline" /> {chain.name}{chain.testnet ? ` (${t('wl.testShort')})` : ''}
          <i className="live online" /> {market ? t('wl.oneUnit', { sym: market.symbol, price: formatEur(market.priceEur) }) : t('wl.nonCustodial')}
        </>
      }
      note={<>{t('wl.note')}</>}
      stats={
        market
          ? [
              [formatEur(market.priceEur), `${market.symbol} (EUR)`],
              [market.change24h === null ? '—' : `${market.change24h >= 0 ? '+' : ''}${market.change24h.toFixed(1)} %`, '24 h'],
              [CHAINS.length, t('wl.statNetworks')],
            ]
          : [
              [chain.symbol, t('wl.statCurrency')],
              [CHAINS.length, t('wl.statNetworks')],
              [chain.testnet ? t('wl.test') : t('wl.main'), t('wl.statType')],
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
            {t('wl.copyAddress')}
          </button>
          <a className="side-action" href="/compte">{t('wl.accountLink')}</a>
        </>
      }
      nav={networkNav}
      actions={
        <button
          type="button"
          className="w-chain-pick icon-btn"
          onClick={() => setChainPicker(true)}
          aria-label={t('wl.pickNetwork')}
          title={t('wl.pickNetwork')}
        >
          <ChainLogo chain={chain} size={20} />
          <IconChevronDown size={13} />
        </button>
      }
    >
      <div className="w-scroll">
        {chainPicker && (
          <Modal title={t('wl.pickNetwork')} onClose={() => setChainPicker(false)} width={380}>
            <div className="w-chain-list w-sheet-list" role="listbox" aria-label={t('wl.pickNetwork')}>
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
                    onClick={() => {
                      onChainChange(item.id);
                      setChainPicker(false);
                    }}
                  >
                    <ChainLogo chain={item} size={28} />
                    <span className="w-chain-row-name">
                      {item.name}
                      {item.testnet ? ` (${t('wl.testShort')})` : ''}
                    </span>
                    <span className="w-chain-row-price">
                      {price && !item.testnet ? formatEur(price.priceEur) : item.symbol}
                    </span>
                  </button>
                );
              })}
            </div>
          </Modal>
        )}
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
              <Notice tone="danger" title={t('wl.unreadableTitle')}>
                {t('wl.unreadableText')}
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
