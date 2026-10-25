import type { ReactElement } from 'react';
import type { ChainInfo } from './chains';

type MarkProps = { size?: number; className?: string };

/** Losange Ethereum, geometry officielle (deux facettes). */
export function EthereumMark({ size = 24, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path d="M16 4.5 23.4 16.9 16 20.6 8.6 16.9Z" fill="#fff" />
      <path d="M16 4.5V20.6L8.6 16.9Z" fill="#E7EBF7" />
      <path d="M8.6 18.6 16 30 23.4 18.6 16 22.4Z" fill="#fff" />
      <path d="M16 22.4V30L8.6 18.6Z" fill="#C3CCEB" />
    </svg>
  );
}

/** Marque Base : cercle bleu, encoche blanche (style officiel). */
export function BaseMark({ size = 24, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path
        d="M16 0c8.837 0 16 7.163 16 16s-7.163 16-16 16S0 24.837 0 16 7.163 0 16 0Zm-1.664 9.9H19.1a6.45 6.45 0 0 1 6.45 6.45h-4.84a1.61 1.61 0 0 0-1.61-1.61h-3.104v6.45h1.612v1.612H8v-1.612h1.612V9.9h4.724Z"
        fill="#0052FF"
        fillRule="evenodd"
      />
    </svg>
  );
}

/** Marque Polygon : hexagone violet stylisé. */
export function PolygonMark({ size = 24, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="16" fill="#8247E5" />
      <path
        d="M21.7 12.9c-.4-.2-.9-.2-1.3 0l-3.1 1.8-2.1 1.2-3.1 1.8c-.4.2-.9.2-1.3 0l-2.4-1.4c-.4-.2-.6-.7-.6-1.1v-2.7c0-.4.2-.9.6-1.1l2.4-1.4c.4-.2.9-.2 1.3 0l2.4 1.4c.4.2.6.7.6 1.1v1.3l2.1-1.2v-1.3c0-.4-.2-.9-.6-1.1l-4.5-2.6c-.4-.2-.9-.2-1.3 0L6.5 9.6c-.4.2-.6.7-.6 1.1v5.1c0 .4.2.9.6 1.1l4.5 2.6c.4.2.9.2 1.3 0l3.1-1.8 2.1-1.2 3.1-1.8c.4-.2.9-.2 1.3 0l2.4 1.4c.4.2.6.7.6 1.1v2.7c0 .4-.2.9-.6 1.1l-2.4 1.4c-.4.2-.9.2-1.3 0l-2.4-1.4c-.4-.2-.6-.7-.6-1.1v-1.3l-2.1 1.2v1.3c0 .4.2.9.6 1.1l4.5 2.6c.4.2.9.2 1.3 0l4.5-2.6c.4-.2.6-.7.6-1.1v-5.1c0-.4-.2-.9-.6-1.1Z"
        fill="#fff"
      />
    </svg>
  );
}

export type ChainMark = (props: MarkProps) => ReactElement;

const MARKS: Record<string, ChainMark> = {
  eth: EthereumMark,
  base: BaseMark,
  polygon: PolygonMark,
};

export function chainMark(chain: ChainInfo): ChainMark {
  return MARKS[chain.mark] ?? EthereumMark;
}

/** Logo de chaîne : pastille de marque + badge testnet éventuel. */
export default function ChainLogo({ chain, size = 24, className }: { chain: ChainInfo; size?: number; className?: string }) {
  const Mark = chainMark(chain);
  return (
    <span className={`w-chain-logo${className ? ` ${className}` : ''}`} style={{ width: size, height: size }}>
      <Mark size={size} />
      {chain.testnet && <em className="w-logo-test" title="réseau de test" />}
    </span>
  );
}
