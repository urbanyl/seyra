import { useAutoRestore, useVault } from '../../lib/vault';
import { DEFAULT_CHAIN_ID } from './chains';
import { normalizePhrase } from './mnemonic';
import type { WalletData } from './types';
import Onboarding from './Onboarding';
import Dashboard from './Dashboard';
import AppFrame from '../../components/AppFrame';
import { useT } from '../../lib/i18n';
import './wallet.css';

function readWallet(value: unknown): WalletData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as { mnemonic?: unknown; chainId?: unknown };
  if (typeof data.mnemonic !== 'string') return null;
  const mnemonic = normalizePhrase(data.mnemonic);
  if (!mnemonic) return null;
  const chainId =
    typeof data.chainId === 'number' && Number.isFinite(data.chainId)
      ? data.chainId
      : DEFAULT_CHAIN_ID;
  return { mnemonic, chainId };
}

export default function Wallet() {
  const t = useT();
  useAutoRestore();
  const { vault, update, ready } = useVault();
  const wallet = readWallet(vault.wallet);

  const saveNew = (mnemonic: string, chainId: number) => {
    const phrase = normalizePhrase(mnemonic);
    update((current) => ({ ...current, wallet: { mnemonic: phrase, chainId } }));
  };

  const changeChain = (chainId: number) => {
    update((current) => {
      const existing = readWallet(current.wallet);
      if (!existing) return current;
      return { ...current, wallet: { ...existing, chainId } };
    });
  };

  const replaceWallet = (mnemonic: string) => {
    const phrase = normalizePhrase(mnemonic);
    update((current) => {
      const existing = readWallet(current.wallet);
      return {
        ...current,
        wallet: { mnemonic: phrase, chainId: existing?.chainId ?? DEFAULT_CHAIN_ID },
      };
    });
  };

  if (!ready) {
    // Squelette instantané : la page s'affiche direct pendant la restauration.
    return (
      <AppFrame
        app="wallet"
        className="w-frame"
        fixedBody
        sideSub={t('wl.sideSub')}
        title={t('wl.title')}
        subtitle={<><span className="w-spinner w-spinner-inline" aria-hidden="true" /> {t('wl.opening')}</>}
      >
        <div className="w-scroll">
          <main className="w-main">
            <div className="w-card w-skel" aria-hidden="true">
              <span className="w-skel-line w-skel-line-short" />
              <span className="w-skel-line w-skel-line-xl" />
              <span className="w-skel-line" />
            </div>
            <div className="w-grid">
              <div className="w-card w-skel">
                <span className="w-skel-line w-skel-line-short" />
                <span className="w-skel-line" />
                <span className="w-skel-line" />
              </div>
              <div className="w-card w-skel">
                <span className="w-skel-line w-skel-line-short" />
                <span className="w-skel-line" />
              </div>
            </div>
          </main>
        </div>
      </AppFrame>
    );
  }

  if (!wallet) {
    return (
      <Onboarding
        onCreate={(phrase) => saveNew(phrase, DEFAULT_CHAIN_ID)}
        onImport={(phrase) => saveNew(phrase, DEFAULT_CHAIN_ID)}
      />
    );
  }

  return (
    <Dashboard wallet={wallet} onChainChange={changeChain} onReplace={replaceWallet} />
  );
}
