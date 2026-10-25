import type { ChainInfo } from './chains';
import { formatToken } from './format';

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
  const message = rawError(err).toLowerCase();
  if (isNetworkIssue(message)) {
    return `Impossible de joindre le RPC public de ${chain.name}. Vérifie ta connexion, puis réessaie.`;
  }
  return `Impossible de lire le solde sur ${chain.name}. Réessaie dans un instant.`;
}

export function sendErrorMessage(err: unknown, chain: ChainInfo, balance: bigint | null): string {
  const message = rawError(err).toLowerCase();
  if (
    message.includes('insufficient funds') ||
    message.includes('insufficient balance') ||
    message.includes('exceeds the balance') ||
    message.includes('total cost')
  ) {
    const available =
      balance === null ? '' : ` Solde disponible : ${formatToken(balance)} ${chain.symbol}.`;
    return `Fonds insuffisants pour payer le montant et les frais de réseau.${available}`;
  }
  if (message.includes('replacement transaction underpriced')) {
    return 'Une transaction identique est déjà en attente. Attends sa confirmation avant de réessayer.';
  }
  if (message.includes('already known')) {
    return 'Cette transaction est déjà en attente sur le réseau. Vérifie-la avant de réessayer.';
  }
  if (message.includes('nonce')) {
    return 'Le nonce de la transaction est invalide. Patiente quelques secondes, puis réessaie.';
  }
  if (message.includes('gas limit') || message.includes('intrinsic gas')) {
    return 'La transaction dépasse la limite de gaz du réseau. Vérifie le montant et réessaie.';
  }
  if (message.includes('underpriced') || message.includes('fee too low')) {
    return 'Les frais proposés sont trop bas pour ce réseau. Réessaie dans un instant.';
  }
  if (isNetworkIssue(message)) {
    return `Impossible de joindre le RPC public de ${chain.name}. La transaction n'a pas été envoyée. Vérifie ta connexion, puis réessaie.`;
  }
  if (message.includes('invalid address')) {
    return "L'adresse de destination est invalide. Vérifie-la avant de réessayer.";
  }
  if (message.includes('execution reverted') || message.includes('revert')) {
    return "Le réseau a rejeté la transaction. Vérifie l'adresse et le montant.";
  }
  return "La transaction a échoué. Vérifie l'adresse, le montant et ta connexion, puis réessaie.";
}
