export type WikiArticleSummary = {
  slug: string;
  title: string;
  summary: string;
  updatedAt: string | number;
  author: string;
};

export type WikiHistoryEntry = {
  ts: string | number;
  author: string;
  title: string;
};

export type WikiArticle = WikiArticleSummary & {
  body: string;
  history: WikiHistoryEntry[];
};

export type WikiListResponse = {
  articles: WikiArticleSummary[];
};

export type WikiSavePayload = {
  title: string;
  body: string;
  author: string;
  summary: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Erreur ${response.status}`;
    throw new ApiError(response.status, message);
  }
  return data as T;
}

export function wikiSlugPath(slug: string): string {
  return `/api/wiki/${encodeURIComponent(slug)}`;
}

export function fetchWikiList(signal?: AbortSignal): Promise<WikiListResponse> {
  return fetchJson<WikiListResponse>('/api/wiki/list', { signal });
}

export function fetchWikiArticle(slug: string, signal?: AbortSignal): Promise<WikiArticle> {
  return fetchJson<WikiArticle>(wikiSlugPath(slug), { signal });
}

export function saveWikiArticle(slug: string, payload: WikiSavePayload): Promise<{ ok: boolean; slug: string; updatedAt: string | number }> {
  return fetchJson(wikiSlugPath(slug), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException ? error.name === 'AbortError' : (error as { name?: string } | null)?.name === 'AbortError';
}
