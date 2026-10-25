import { useAutoRestore, useVault } from '../../lib/vault';
import { DEFAULT_CHAIN_ID } from './chains';
import { normalizePhrase } from './mnemonic';
import type { WalletData } from './types';
import Onboarding from './Onboarding';
import Dashboard from './Dashboard';
import { IconWallet } from './icons';
import AppFrame from '../../components/AppFrame';
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
    return (
      <AppFrame app="wallet" className="w-frame" title="Portefeuille" subtitle="Ouverture du coffre" fixedBody>
        <div className="w-loading">
          <div className="w-loading-box">
            <span className="w-logo">
              <IconWallet size={22} />
            </span>
            <span className="w-spinner" aria-hidden="true" />
            <p>Ouverture du coffre…</p>
          </div>
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
