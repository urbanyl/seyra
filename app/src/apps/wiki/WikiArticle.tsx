import { useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  fetchWikiArticle,
  fetchWikiList,
  isAbortError,
  type WikiArticle as WikiArticleData,
  type WikiArticleSummary,
} from './api';
import { displayAuthor, formatDate } from './format';
import { renderMarkdown } from './markdown';
import WikiFrame from './WikiFrame';

type Status = 'loading' | 'ready' | 'error';

const bodyCache = new Map<string, string>();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function loadBody(slug: string, signal: AbortSignal): Promise<string> {
  const cached = bodyCache.get(slug);
  if (cached !== undefined) return cached;
  const article = await fetchWikiArticle(slug, signal);
  const body = typeof article.body === 'string' ? article.body : '';
  bodyCache.set(slug, body);
  return body;
}

export default function WikiArticle({ slug }: { slug: string }) {
  const [article, setArticle] = useState<WikiArticleData | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [backlinks, setBacklinks] = useState<WikiArticleSummary[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setStatus('loading');
    setError('');
    setErrorStatus(0);
    setArticle(null);
    setBacklinks([]);
    fetchWikiArticle(slug, controller.signal)
      .then((data) => {
        if (!alive) return;
        const clean: WikiArticleData = {
          ...data,
          slug: data.slug || slug,
          title: data.title || slug,
          body: typeof data.body === 'string' ? data.body : '',
          summary: typeof data.summary === 'string' ? data.summary : '',
          author: typeof data.author === 'string' ? data.author : '',
          updatedAt: data.updatedAt ?? '',
          history: Array.isArray(data.history) ? data.history : [],
        };
        setArticle(clean);
        setStatus('ready');
        bodyCache.set(slug, clean.body);
      })
      .catch((cause: unknown) => {
        if (!alive || isAbortError(cause)) return;
        setError(cause instanceof Error ? cause.message : 'Impossible de charger cet article.');
        setErrorStatus(cause instanceof ApiError ? cause.status : 0);
        setStatus('error');
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [slug, reloadKey]);

  useEffect(() => {
    document.title = article ? `${article.title || slug} — SeyraWiki` : 'SeyraWiki';
  }, [article, slug]);

  const rendered = useMemo(() => renderMarkdown(article?.body || ''), [article?.body]);
  const toc = useMemo(() => rendered.headings.filter((heading) => heading.level === 2), [rendered.headings]);

  useEffect(() => {
    if (!article) return;
    const controller = new AbortController();
    let alive = true;

    (async () => {
      try {
        const data = await fetchWikiList(controller.signal);
        const candidates = (Array.isArray(data?.articles) ? data.articles : []).filter((item) => item.slug !== article.slug);
        if (candidates.length === 0 || candidates.length > 24) {
          if (alive) setBacklinks([]);
          return;
        }
        const reference = new RegExp(`\\[\\[\\s*${escapeRegExp(article.slug)}\\s*(?:\\||\\]\\])`);
        const matches = await Promise.all(
          candidates.map(async (candidate) => {
            try {
              const body = await loadBody(candidate.slug, controller.signal);
              return reference.test(body) ? candidate : null;
            } catch {
              return null;
            }
          }),
        );
        if (!alive) return;
        setBacklinks(matches.filter((item): item is WikiArticleSummary => item !== null));
      } catch (cause) {
        if (!alive || isAbortError(cause)) return;
        setBacklinks([]);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [article]);

  /* Cadre commun : le titre et les actions de la page vont dans le pane-head. */
  const chrome = (children: React.ReactNode, head?: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) => (
    <WikiFrame
      title={head?.title ?? 'SeyraWiki'}
      subtitle={head?.subtitle}
      actions={
        head?.actions ?? (
          <a className="wiki-button wiki-button--primary" href="/wiki/nouveau">
            Écrire un article
          </a>
        )
      }
    >
      {children}
    </WikiFrame>
  );

  if (status === 'loading') {
    return chrome(
      <div className="wiki-reading">
        <p className="wiki-status">Chargement…</p>
      </div>,
    );
  }

  if (status === 'error' || !article) {
    if (errorStatus === 404) {
      return chrome(
        <div className="wiki-reading wiki-empty">
          <h1>Aucun article</h1>
          <p>Cet article n’existe pas encore. Vous pouvez l’écrire.</p>
          <a className="wiki-button wiki-button--primary" href="/wiki/nouveau">
            Écrire un article
          </a>
        </div>,
      );
    }
    return chrome(
      <div className="wiki-reading">
        <div className="wiki-error" role="alert">
          <p>{error || 'Impossible de charger cet article.'}</p>
          <button className="wiki-button" type="button" onClick={() => setReloadKey((value) => value + 1)}>
            Réessayer
          </button>
        </div>
      </div>,
    );
  }

  const editHref = `/wiki/nouveau?slug=${encodeURIComponent(article.slug)}`;
  const history = Array.isArray(article.history) ? article.history : [];

  return chrome(
    <div className="wiki-reading">
      <article className="wiki-article">
        {article.summary && <p className="wiki-article__summary">{article.summary}</p>}

        {toc.length > 0 && (
          <nav className="wiki-toc" aria-label="Sommaire">
            <p className="wiki-toc__title">Sommaire</p>
            <ol>
              {toc.map((heading) => (
                <li key={heading.id}>
                  <a href={`#${heading.id}`}>{heading.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {article.body.trim() ? (
          <div className="wiki-markdown" dangerouslySetInnerHTML={{ __html: rendered.html }} />
        ) : (
          <p className="wiki-status">Article vide.</p>
        )}
      </article>

      {history.length > 0 && (
        <details className="wiki-history">
          <summary>Historique ({history.length})</summary>
          <ul>
            {history.slice(0, 20).map((entry, index) => (
              <li key={`${entry.ts}-${index}`}>
                <span>{formatDate(entry.ts)}</span> · <span>{displayAuthor(entry.author)}</span> · {entry.title}
              </li>
            ))}
          </ul>
        </details>
      )}

      {backlinks.length > 0 && (
        <section className="wiki-backlinks" aria-labelledby="wiki-backlinks-title">
          <h2 id="wiki-backlinks-title">Liens entrants ({backlinks.length})</h2>
          <ul>
            {backlinks.map((item) => (
              <li key={item.slug}>
                <a href={`/wiki/${encodeURIComponent(item.slug)}`}>{item.title || item.slug}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>,
    {
      title: article.title || article.slug,
      subtitle: <>Modifié le <time>{formatDate(article.updatedAt)}</time> par {displayAuthor(article.author)}</>,
      actions: (
        <a className="wiki-button wiki-button--primary" href={editHref}>
          Modifier
        </a>
      ),
    },
  );
}
