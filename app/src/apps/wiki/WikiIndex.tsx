import { useEffect, useMemo, useState } from 'react';
import { fetchWikiList, isAbortError, type WikiArticleSummary } from './api';
import { displayAuthor, formatDate } from './format';
import WikiFrame from './WikiFrame';

type Status = 'loading' | 'ready' | 'error';

export default function WikiIndex() {
  const [articles, setArticles] = useState<WikiArticleSummary[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    document.title = 'SeyraWiki';
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setStatus('loading');
    setError('');
    fetchWikiList(controller.signal)
      .then((data) => {
        if (!alive) return;
        setArticles(Array.isArray(data?.articles) ? data.articles : []);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (!alive || isAbortError(cause)) return;
        setError(cause instanceof Error ? cause.message : 'Impossible de charger les articles.');
        setStatus('error');
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return articles;
    return articles.filter((article) =>
      [article.title, article.summary, article.author, article.slug]
        .join(' ')
        .toLocaleLowerCase('fr')
        .includes(needle),
    );
  }, [articles, query]);

  return (
    <WikiFrame
      title="Tous les articles"
      subtitle={status === 'ready' ? `${articles.length} article${articles.length > 1 ? 's' : ''}` : 'SeyraWiki'}
      actions={
        <a className="wiki-button wiki-button--primary" href="/wiki/nouveau">
          Écrire un article
        </a>
      }
    >
      <main className="wiki-index">
        <section className="wiki-hero" aria-label="Présentation">
          <p className="wiki-kicker">Le savoir libre, sans règles</p>
          <p className="wiki-lede">
            Tout le monde peut lire, écrire et corriger. Sans compte, sans modération, sans secrets.
          </p>
          <div className="wiki-search">
            <label className="wiki-visually-hidden" htmlFor="wiki-search-input">
              Rechercher un article
            </label>
            <input
              id="wiki-search-input"
              className="wiki-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
          </div>
        </section>

        <section className="wiki-index__articles" aria-labelledby="wiki-articles-title">
          <div className="wiki-section-head">
            <h2 id="wiki-articles-title">Articles</h2>
            {status === 'ready' && <span className="wiki-count">{filtered.length} article{filtered.length > 1 ? 's' : ''}</span>}
          </div>

          {status === 'loading' && <p className="wiki-status">Chargement…</p>}

          {status === 'error' && (
            <div className="wiki-error" role="alert">
              <p>{error || 'Impossible de charger les articles.'}</p>
              <button className="wiki-button" type="button" onClick={() => setReloadKey((value) => value + 1)}>
                Réessayer
              </button>
            </div>
          )}

          {status === 'ready' && articles.length === 0 && (
            <div className="wiki-empty">
              <h3>Aucun article</h3>
              <p>La bibliothèque est encore vide. Vous pouvez ouvrir la première page.</p>
              <a className="wiki-button wiki-button--primary" href="/wiki/nouveau">
                Écrire le premier article
              </a>
            </div>
          )}

          {status === 'ready' && articles.length > 0 && filtered.length === 0 && (
            <div className="wiki-empty">
              <h3>Aucun article</h3>
              <p>Aucun article ne correspond à « {query.trim()} ».</p>
            </div>
          )}

          {filtered.length > 0 && (
            <ul className="wiki-article-list">
              {filtered.map((article) => (
                <li key={article.slug}>
                  <a className="wiki-card" href={`/wiki/${encodeURIComponent(article.slug)}`}>
                    <span className="wiki-card__title">{article.title || article.slug}</span>
                    {article.summary && <span className="wiki-card__summary">{article.summary}</span>}
                    <span className="wiki-card__meta">
                      Modifié le {formatDate(article.updatedAt)} par {displayAuthor(article.author)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </WikiFrame>
  );
}
