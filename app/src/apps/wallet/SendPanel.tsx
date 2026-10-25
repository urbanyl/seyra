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

const TX_COPY: Record<TxStatus, { title: string; text: string }> = {
  pending: {
    title: 'Transaction envoyée',
    text: 'Diffusée sur le réseau. En attente de confirmation…',
  },
  confirmed: {
    title: 'Transaction confirmée',
    text: 'Le transfert est confirmé et le solde a été actualisé.',
  },
  unconfirmed: {
    title: 'Transaction diffusée',
    text: "Confirmation non détectée dans le délai. Vérifie l'explorateur avant de réessayer.",
  },
  reverted: {
    title: 'Transaction rejetée par le réseau',
    text: "La transaction a été confirmée mais a échoué. Aucun montant n'a été transféré.",
  },
};

export default function SendPanel({ account, chain, balance, onRefreshBalance, market }: Props) {
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
      setError("Indique l'adresse de destination.");
      return;
    }
    if (!isAddress(destination)) {
      setError(
        "Adresse de destination invalide. Elle doit commencer par 0x et contenir 42 caractères.",
      );
      return;
    }
    const normalized = getAddress(destination);
    const raw = amount.trim().replace(',', '.');
    if (!raw) {
      setError('Indique le montant à envoyer.');
      return;
    }
    if (!/^\d+(?:\.\d+)?$/.test(raw)) {
      setError('Montant invalide. Utilise un nombre, par exemple 0.01.');
      return;
    }
    let value: bigint;
    try {
      value = parseEther(raw);
    } catch {
      setError('Montant invalide. Utilise un nombre, par exemple 0.01.');
      return;
    }
    if (value <= 0n) {
      setError('Le montant doit être supérieur à zéro.');
      return;
    }
    if (balance !== null && value > balance) {
      setError(`Montant supérieur au solde disponible (${formatToken(balance)} ${chain.symbol}).`);
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
    <section className="w-card" aria-label="Envoyer des fonds">
      <div className="w-card-head">
        <div className="w-card-title">
          <IconSend size={17} />
          Envoyer
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
              <dt>Réseau</dt>
              <dd>
                <ChainLogo chain={chain} size={14} className="inline" /> {chain.name}
                {chain.testnet ? ' (test)' : ''}
              </dd>
            </div>
            <div>
              <dt>Depuis</dt>
              <dd>
                <code>{account.address}</code>
              </dd>
            </div>
            <div>
              <dt>Vers</dt>
              <dd>
                <code>{to}</code>
              </dd>
            </div>
            <div>
              <dt>Montant</dt>
              <dd className="w-summary-amount">
                {amount} {chain.symbol}
              </dd>
            </div>
            <div>
              <dt>Frais</dt>
              <dd>Estimés par le réseau au moment de l'envoi</dd>
            </div>
          </dl>
          <Notice tone="warn" title="Transaction irréversible">
            Vérifie l'adresse et le réseau. Un envoi confirmé ne peut pas être annulé.
          </Notice>
          {chain.testnet && (
            <Notice tone="info">
              Réseau de test : ces fonds n'ont aucune valeur réelle.
            </Notice>
          )}
          {error && (
            <Notice tone="danger" title="Envoi impossible">
              <p>{error}</p>
              {tech && <TechDetails text={tech} />}
            </Notice>
          )}
          <div className="w-btn-row">
            <button type="button" className="w-btn primary" onClick={send} disabled={sending}>
              {sending ? (
                <>
                  <span className="w-spinner" aria-hidden="true" />
                  Envoi en cours…
                </>
              ) : (
                "Confirmer l'envoi"
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
              Modifier
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
            <label htmlFor="w-send-to">Adresse de destination</label>
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
              <label htmlFor="w-send-amount">Montant</label>
              <span>
                Disponible : {balance === null ? '—' : `${formatToken(balance)} ${chain.symbol}`}
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
            <Notice tone="danger" title="Vérification impossible">
              <p>{error}</p>
              {tech && <TechDetails text={tech} />}
            </Notice>
          )}
          <button type="submit" className="w-btn primary full">
            Continuer
          </button>
        </form>
      )}
    </section>
  );
}

function TxResult({ tx, onReset }: { tx: TxState; onReset: () => void }) {
  const copy = TX_COPY[tx.status];
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
          <strong>{copy.title}</strong>
          <p>{copy.text}</p>
        </div>
      </div>
      <div className="w-addr-row">
        <code>{tx.hash}</code>
        <CopyButton text={tx.hash} iconOnly label="Copier le hash" copiedLabel="Hash copié" />
      </div>
      <div className="w-btn-row">
        <a
          className="w-btn small ghost"
          href={txUrl(tx.chainId, tx.hash)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Voir sur l'explorateur
          <IconExternal size={14} />
        </a>
        <button type="button" className="w-btn small" onClick={onReset}>
          Nouvelle transaction
        </button>
      </div>
    </div>
  );
}
