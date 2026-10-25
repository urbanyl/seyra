/** Message d'erreur serveur traduit : le serveur renvoie { code, error },
 *  on préfère la chaîne locale 'api.<code>' quand elle existe. */
export function apiErrorMessage(
  cause: unknown,
  t: (k: string, vars?: Record<string, string | number>) => string,
  fallback?: string,
): string {
  const c = cause as { code?: unknown; message?: unknown } | null;
  const code = typeof c?.code === 'string' ? c.code : '';
  if (code) {
    const key = 'api.' + code;
    const local = t(key);
    if (local !== key) return local;
  }
  const message = typeof c?.message === 'string' ? c.message : '';
  return fallback || message || t('ac.errUnknown');
}
