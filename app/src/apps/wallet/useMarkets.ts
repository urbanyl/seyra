import { useEffect, useState } from 'react';
import type { ChainInfo } from './chains';
import { CHAINS } from './chains';
import { loadMarkets, type Markets } from './prices';

export type MarketsState = {
  markets: Markets;
  loading: boolean;
  refresh: () => void;
};

/** Prix en direct : chargement immédiat, resynchronisation chaque minute. */
export function useMarkets(): MarketsState {
  const [markets, setMarkets] = useState<Markets>({});
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadMarkets(CHAINS)
      .then((m) => {
        if (alive) {
          setMarkets(m);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    const timer = window.setInterval(() => {
      loadMarkets(CHAINS).then((m) => {
        if (alive) setMarkets(m);
      });
    }, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [nonce]);

  return { markets, loading, refresh: () => setNonce((value) => value + 1) };
}

export type { ChainInfo };
