import type { Chain } from 'viem';
import { base, mainnet, polygon, sepolia } from 'viem/chains';

export type ChainInfo = {
  chain: Chain;
  id: number;
  name: string;
  symbol: string;
  rpc: string;
  explorer: string;
  testnet: boolean;
  /** Clé du logo de marque (chainIcons). */
  mark: 'eth' | 'base' | 'polygon';
  /** Identifiants CoinGecko de la devise native, par ordre de préférence. */
  cgIds: string[];
};

export const CHAINS: ChainInfo[] = [
  {
    chain: base,
    id: 8453,
    name: 'Base',
    symbol: 'ETH',
    rpc: 'https://base-rpc.publicnode.com',
    explorer: 'https://basescan.org',
    testnet: false,
    mark: 'base',
    cgIds: ['ethereum'],
  },
  {
    chain: mainnet,
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpc: 'https://ethereum-rpc.publicnode.com',
    explorer: 'https://etherscan.io',
    testnet: false,
    mark: 'eth',
    cgIds: ['ethereum'],
  },
  {
    chain: polygon,
    id: 137,
    name: 'Polygon',
    symbol: 'POL',
    rpc: 'https://polygon-bor-rpc.publicnode.com',
    explorer: 'https://polygonscan.com',
    testnet: false,
    mark: 'polygon',
    cgIds: ['polygon-ecosystem-token', 'matic-network'],
  },
  {
    chain: sepolia,
    id: 11155111,
    name: 'Sepolia',
    symbol: 'ETH',
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io',
    testnet: true,
    mark: 'eth',
    cgIds: ['ethereum'],
  },
];

export const DEFAULT_CHAIN_ID = 8453;

export function chainById(id: number | null | undefined): ChainInfo {
  return CHAINS.find((item) => item.id === id) ?? CHAINS[0];
}

export function txUrl(chainId: number, hash: string): string {
  return `${chainById(chainId).explorer}/tx/${hash}`;
}
