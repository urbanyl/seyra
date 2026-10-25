import { formatEther } from 'viem';

export function formatToken(wei: bigint, maxFractionDigits = 6): string {
  const raw = formatEther(wei);
  const [whole, fraction = ''] = raw.split('.');
  if (!fraction) return whole;
  const clipped = fraction.slice(0, maxFractionDigits).replace(/0+$/, '');
  if (clipped) return `${whole}.${clipped}`;
  if (wei > 0n) return `<0.${'0'.repeat(Math.max(0, maxFractionDigits - 1))}1`;
  return whole;
}
