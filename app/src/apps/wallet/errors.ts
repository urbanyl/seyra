import type { ChainInfo } from './chains';
import { formatToken } from './format';
import { getLang, t } from '../../lib/i18n';

const NETWORK_HINTS = [
  'failed to fetch',
  'fetch failed',
  'networkerror',
  'network error',
  'network request failed',
  'timeout',
  'timed out',
  'econnrefused',
  'econnreset',
  'enotfound',
  'http request failed',
  'rpc request failed',
  'socket hang up',
  'offline',
  'cors',
  '429',
  '502',
  '503',
  '504',
];

export function rawError(err: unknown): string {
  if (err && typeof err === 'object') {
    const value = err as { shortMessage?: unknown; details?: unknown; message?: unknown };
    const parts = [value.shortMessage, value.details, value.message].filter(
      (part): part is string => typeof part === 'string' && part.trim().length > 0,
    );
    if (parts.length) return parts.join(' · ');
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function isNetworkIssue(message: string): boolean {
  return NETWORK_HINTS.some((hint) => message.includes(hint));
}

export function balanceErrorMessage(err: unknown, chain: ChainInfo): string {
  const lang = getLang();
  const message = rawError(err).toLowerCase();
  if (isNetworkIssue(message)) {
    return t(lang, 'wl.errBalanceNetwork', { chain: chain.name });
  }
  return t(lang, 'wl.errBalanceRead', { chain: chain.name });
}

export function sendErrorMessage(err: unknown, chain: ChainInfo, balance: bigint | null): string {
  const lang = t.bind(null, getLang());
  const message = rawError(err).toLowerCase();
  if (
    message.includes('insufficient funds') ||
    message.includes('insufficient balance') ||
    message.includes('exceeds the balance') ||
    message.includes('total cost')
  ) {
    const available =
      balance === null ? '' : lang('wl.errFundsAvail', { amt: formatToken(balance), sym: chain.symbol });
    return lang('wl.errFunds') + available;
  }
  if (message.includes('replacement transaction underpriced')) return lang('wl.errReplacement');
  if (message.includes('already known')) return lang('wl.errKnown');
  if (message.includes('nonce')) return lang('wl.errNonce');
  if (message.includes('gas limit') || message.includes('intrinsic gas')) return lang('wl.errGas');
  if (message.includes('underpriced') || message.includes('fee too low')) return lang('wl.errUnderpriced');
  if (isNetworkIssue(message)) return lang('wl.errSendNetwork', { chain: chain.name });
  if (message.includes('invalid address')) return lang('wl.errSendAddress');
  if (message.includes('execution reverted') || message.includes('revert')) return lang('wl.errReverted');
  return lang('wl.errSendGeneric');
}
