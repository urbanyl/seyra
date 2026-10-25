import type { ChainInfo } from './chains';
import { getLang } from '../../lib/i18n';

export type Market = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  priceEur: number;
  change24h: number | null;
};

export type Markets = Record<string, Market>;

const LS_KEY = 'seyra.ma…s.v1';
const TTL = 5 * 60 * 1000;

function readLs(): Markets | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; map: Markets };
    if (!parsed || typeof parsed.map !== 'object') return null;
    return parsed.map;
  } catch {
    return null;
  }
}

function writeLs(map: Markets, at: number) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ at, map }));
  } catch {
    /* quota */
  }
}

let cached: Markets | null = readLs();
let fetchedAt = 0;
let pending: Promise<Markets> | null = null;

export function uniqueCgIds(chains: ChainInfo[]): string[] {
  const set = new Set<string>();
  for (const c of chains) for (const id of c.cgIds) set.add(id);
  return [...set];
}

/** Prix + logos des devises natives via CoinGecko (aucune clé nécessaire). */
export async function loadMarkets(chains: ChainInfo[]): Promise<Markets> {
  if (cached && Date.now() - fetchedAt < TTL) return cached;
  if (pending) return pending;
  pending = (async () => {
    try {
      const ids = uniqueCgIds(chains).join(',');
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=${ids}&price_change_percentage=24h`,
        { headers: { accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(String(res.status));
      const rows: unknown = await res.json();
      if (!Array.isArray(rows)) throw new Error('format');
      const map: Markets = {};
      for (const row of rows) {
        const r = row as Record<string, unknown>;
        const id = typeof r.id === 'string' ? r.id : '';
        if (!id) continue;
        map[id] = {
          id,
          symbol: typeof r.symbol === 'string' ? r.symbol.toUpperCase() : '',
          name: typeof r.name === 'string' ? r.name : id,
          image: typeof r.image === 'string' ? r.image : '',
          priceEur: typeof r.current_price === 'number' ? r.current_price : NaN,
          change24h: typeof r.price_change_percentage_24h === 'number' ? r.price_change_percentage_24h : null,
        };
      }
      if (Object.keys(map).length > 0) {
        cached = map;
        fetchedAt = Date.now();
        writeLs(map, fetchedAt);
      }
    } catch {
      /* réseau indisponible : on garde le dernier cache */
    }
    pending = null;
    return cached ?? {};
  })();
  return pending;
}

/** Marché de la devise native d'une chaîne (premier id connu). */
export function chainMarket(chain: ChainInfo, markets: Markets): Market | null {
  for (const id of chain.cgIds) {
    const m = markets[id];
    if (m && Number.isFinite(m.priceEur)) return m;
  }
  return null;
}

const EUR_LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-IE', zh: 'zh-CN', ru: 'ru-RU', ko: 'ko-KR', ar: 'ar-EG' };
let eurFmt: Intl.NumberFormat | null = null;
let eurFmtLang = '';

export function formatEur(value: number): string {
  const lang = getLang();
  if (!eurFmt || eurFmtLang !== lang) {
    eurFmt = new Intl.NumberFormat(EUR_LOCALES[lang] ?? 'en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
    eurFmtLang = lang;
  }
  return eurFmt.format(value);
}
