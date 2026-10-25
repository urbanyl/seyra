import { useEffect, useRef, useState } from 'react';
import { createPublicClient, createWalletClient, getAddress, http, isAddress, parseEther } from 'viem';
import type { HDAccount } from 'viem/accounts';
import type { ChainInfo } from './chains';
import { txUrl } from './chains';
import { rawError, sendErrorMessage } from './errors';
import { formatToken } from './format';
import { CopyButton, Notice, TechDetails } from './ui';
import { IconCheck, IconExternal, IconSend, IconWarning } from './icons';
import ChainLogo from './chainIcons';
import { formatEur, type Market } from './prices';
import { useT } from '../../lib/i18n';

type Props = {
  account: HDAccount;
  chain: ChainInfo;
  balance: bigint | null;
  onRefreshBalance: () => void;
  market: Market | null;
};

type TxStatus = 'pending' | 'confirmed' | 'unconfirmed' | 'reverted';

type TxState = {
  hash: `0x${string}`;
  chainId: number;
  status: TxStatus;
};

export default function SendPanel({ account, chain, balance, onRefreshBalance, market }: Props) {
  const t = useT();
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tech, setTech] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [tx, setTx] = useState<TxState | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const clearError = () => {
    setError(null);
    setTech(null);
  };

  const review = () => {
    clearError();
    const destination = to.trim();
    if (!destination) {
      setError(t('wl.errDest'));
      return;
    }
    if (!isAddress(destination)) {
      setError(t('wl.errDestFormat'));
      return;
    }
    const normalized = getAddress(destination);
    const raw = amount.trim().replace(',', '.');
    if (!raw) {
      setError(t('wl.errAmount'));
      return;
    }
    if (!/^\d+(?:\.\d+)?$/.test(raw)) {
      setError(t('wl.errAmountFormat'));
      return;
    }
    let value: bigint;
    try {
      value = parseEther(raw);
    } catch {
      setError(t('wl.errAmountFormat'));
      return;
    }
    if (value <= 0n) {
      setError(t('wl.errAmountZero'));
      return;
    }
    if (balance !== null && value > balance) {
      setError(t('wl.errAmountOver', { amt: formatToken(balance), sym: chain.symbol }));
      return;
    }
    setTo(normalized);
    setAmount(raw);
    setStep('confirm');
  };

  const send = async () => {
    if (sending) return;
    setSending(true);
    clearError();
    const active = chain;

    try {
      const value = parseEther(amount);
      const destination = getAddress(to);
      const walletClient = createWalletClient({
        account,
        chain: active.chain,
        transport: http(active.rpc, { timeout: 20_000, retryCount: 1 }),
      });
      const hash = await walletClient.sendTransaction({
        account,
        chain: active.chain,
        to: destination,
        value,
      });
      if (!mounted.current) return;
      setTx({ hash, chainId: active.id, status: 'pending' });
      setStep('form');
      setTo('');
      setAmount('');
      setSending(false);
      onRefreshBalance();

      const publicClient = createPublicClient({
        chain: active.chain,
        transport: http(active.rpc, { timeout: 15_000, retryCount: 1 }),
      });
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 90_000,
          pollingInterval: 3_000,
        });
        if (!mounted.current) return;
        const status: TxStatus = receipt.status === 'success' ? 'confirmed' : 'reverted';
        setTx((current) => (current && current.hash === hash ? { ...current, status } : current));
        onRefreshBalance();
      } catch {
        if (!mounted.current) return;
        setTx((current) =>
          current && current.hash === hash ? { ...current, status: 'unconfirmed' } : current,
        );
      }
    } catch (err) {
      if (!mounted.current) return;
      setError(sendErrorMessage(err, active, balance));
      setTech(rawError(err));
      setSending(false);
    }
  };

  return (
    <section className="w-card" aria-label={t('wl.sendAria')}>
      <div className="w-card-head">
        <div className="w-card-title">
          <IconSend size={17} />
          {t('wl.send')}
        </div>
        <span className="w-chip">
          <ChainLogo chain={chain} size={14} className="inline" /> {chain.symbol}
        </span>
      </div>

      {tx ? (
        <TxResult tx={tx} onReset={() => setTx(null)} />
      ) : step === 'confirm' ? (
        <div className="w-send-confirm">
          <dl className="w-summary">
            <div>
              <dt>{t('wl.networkLabel')}</dt>
              <dd>
                <ChainLogo chain={chain} size={14} className="inline" /> {chain.name}
                {chain.testnet ? ` (${t('wl.testShort')})` : ''}
              </dd>
            </div>
            <div>
              <dt>{t('wl.from')}</dt>
              <dd>
                <code>{account.address}</code>
              </dd>
            </div>
            <div>
              <dt>{t('wl.to')}</dt>
              <dd>
                <code>{to}</code>
              </dd>
            </div>
            <div>
              <dt>{t('wl.amount')}</dt>
              <dd className="w-summary-amount">
                {amount} {chain.symbol}
              </dd>
            </div>
            <div>
              <dt>{t('wl.fees')}</dt>
              <dd>{t('wl.feesEstimate')}</dd>
            </div>
          </dl>
          <Notice tone="warn" title={t('wl.irreversibleTitle')}>
            {t('wl.irreversibleText')}
          </Notice>
          {chain.testnet && (
            <Notice tone="info">
              {t('wl.testnetNote')}
            </Notice>
          )}
          {error && (
            <Notice tone="danger" title={t('wl.sendFailTitle')}>
              <p>{error}</p>
              {tech && <TechDetails text={tech} />}
            </Notice>
          )}
          <div className="w-btn-row">
            <button type="button" className="w-btn primary" onClick={send} disabled={sending}>
              {sending ? (
                <>
                  <span className="w-spinner" aria-hidden="true" />
                  {t('wl.sendingBtn')}
                </>
              ) : (
                t('wl.confirmSend')
              )}
            </button>
            <button
              type="button"
              className="w-btn ghost"
              onClick={() => {
                setStep('form');
                clearError();
              }}
              disabled={sending}
            >
              {t('wl.modify')}
            </button>
          </div>
        </div>
      ) : (
        <form
          className="w-form"
          onSubmit={(event) => {
            event.preventDefault();
            review();
          }}
        >
          <div className="w-field">
            <label htmlFor="w-send-to">{t('wl.destination')}</label>
            <input
              id="w-send-to"
              className="w-input mono"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                clearError();
              }}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div className="w-field">
            <div className="w-label-row">
              <label htmlFor="w-send-amount">{t('wl.amount')}</label>
              <span>
                {t('wl.available')} {balance === null ? '—' : `${formatToken(balance)} ${chain.symbol}`}
              </span>
            </div>
            <div className="w-amount-wrap">
              <input
                id="w-send-amount"
                className="w-input"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  clearError();
                }}
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="w-amount-unit">{chain.symbol}</span>
            </div>
            {(() => {
              const raw = amount.trim().replace(',', '.');
              const value = raw && /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : null;
              if (value === null || !market || chain.testnet) return null;
              return (
                <p className="w-amount-fiat">≈ {formatEur(value * market.priceEur)}</p>
              );
            })()}
          </div>
          {error && (
            <Notice tone="danger" title={t('wl.checkFail')}>
              <p>{error}</p>
              {tech && <TechDetails text={tech} />}
            </Notice>
          )}
          <button type="submit" className="w-btn primary full">
            {t('wl.continue')}
          </button>
        </form>
      )}
    </section>
  );
}

function TxResult({ tx, onReset }: { tx: TxState; onReset: () => void }) {
  const t = useT();
  const copy: Record<TxStatus, { title: string; text: string }> = {
    pending: { title: t('wl.txPendingTitle'), text: t('wl.txPendingText') },
    confirmed: { title: t('wl.txConfirmedTitle'), text: t('wl.txConfirmedText') },
    unconfirmed: { title: t('wl.txUnconfirmedTitle'), text: t('wl.txUnconfirmedText') },
    reverted: { title: t('wl.txRevertedTitle'), text: t('wl.txRevertedText') },
  };
  const chosen = copy[tx.status];
  return (
    <div className={`w-tx w-tx-${tx.status}`}>
      <div className="w-tx-head">
        <span className="w-tx-icon">
          {tx.status === 'confirmed' ? (
            <IconCheck size={18} />
          ) : tx.status === 'pending' ? (
            <span className="w-spinner" aria-hidden="true" />
          ) : (
            <IconWarning size={18} />
          )}
        </span>
        <div>
          <strong>{chosen.title}</strong>
          <p>{chosen.text}</p>
        </div>
      </div>
      <div className="w-addr-row">
        <code>{tx.hash}</code>
        <CopyButton text={tx.hash} iconOnly label={t('wl.copyHash')} copiedLabel={t('wl.hashCopied')} />
      </div>
      <div className="w-btn-row">
        <a
          className="w-btn small ghost"
          href={txUrl(tx.chainId, tx.hash)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('wl.viewExplorer')}
          <IconExternal size={14} />
        </a>
        <button type="button" className="w-btn small" onClick={onReset}>
          {t('wl.newTx')}
        </button>
      </div>
    </div>
  );
}
