import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../lib/i18n';
import { fetchWikiList, isAbortError, type WikiArticleSummary } from './api';
import { displayAuthor, formatDate } from './format';
import WikiFrame from './WikiFrame';

type Status = 'loading' | 'ready' | 'error';

function initialOf(title: string): string {
  const first = (title.trim()[0] || '#').toLocaleUpperCase('fr');
  const base = first.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /[A-Z]/.test(base) ? base : '#';
}

export default function WikiIndex() {
  const t = useT();
  const [articles, setArticles] = useState<WikiArticleSummary[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const category = useMemo(() => new URLSearchParams(window.location.search).get('cat')?.trim().toLocaleLowerCase('fr') || '', []);

  useEffect(() => {
    document.title = category ? `${t('wk.category', { cat: category })} — SeyraWiki` : 'SeyraWiki';
  }, [category]);

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
        setError(t('wk.loadFail'));
        setStatus('error');
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [reloadKey]);

  const inCategory = useMemo(() => {
    if (!category) return articles;
    return articles.filter((article) => (article.categories || []).includes(category));
  }, [articles, category]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return inCategory;
    return inCategory.filter((article) =>
      [article.title, article.summary, article.author, article.slug, ...(article.categories || [])]
        .join(' ')
        .toLocaleLowerCase('fr')
        .includes(needle),
    );
  }, [inCategory, query]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (a.title || a.slug).localeCompare(b.title || b.slug, 'fr')),
    [filtered],
  );

  const groups = useMemo(() => {
    const map = new Map<string, WikiArticleSummary[]>();
    for (const article of sorted) {
      const letter = initialOf(article.title || article.slug);
      const bucket = map.get(letter);
      if (bucket) bucket.push(article);
      else map.set(letter, [article]);
    }
    return [...map.entries()];
  }, [sorted]);

  const allCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of articles) {
      for (const cat of article.categories || []) counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'));
  }, [articles]);

  const randomHref = useMemo(() => {
    if (articles.length === 0) return '';
    const pick = articles[Math.floor(Math.random() * articles.length)];
    return `/wiki/${encodeURIComponent(pick.slug)}`;
  }, [articles]);

  const showLetterIndex = status === 'ready' && !query.trim() && groups.length > 1;

  return (
    <WikiFrame
      title={category ? t('wk.category', { cat: category }) : t('wk.all')}
      subtitle={status === 'ready' ? t('wk.count', { n: filtered.length }) : 'SeyraWiki'}
      actions={
        <>
          {category !== '' && (
            <a className="wiki-button wiki-button--ghost" href="/wiki">
              {t('wk.all')}
            </a>
          )}
          {randomHref && (
            <a className="wiki-button wiki-button--ghost" href={randomHref} title={t('wk.random')}>
              {t('wk.random')}
            </a>
          )}
          <a className="wiki-button wiki-button--primary" href="/wiki/nouveau">
            {t('wk.write')}
          </a>
        </>
      }
    >
      <main className="wiki-index">
        <section className="wiki-hero" aria-label={t('wk.introAria')}>
          <p className="wiki-kicker">{t('wk.kicker')}</p>
          <p className="wiki-lede">
            {t('wk.lede')}
          </p>
          <div className="wiki-search">
            <label className="wiki-visually-hidden" htmlFor="wiki-search-input">
              {t('wk.searchAria')}
            </label>
            <input
              id="wiki-search-input"
              className="wiki-input"
              type="search"
              placeholder={t('wk.searchPh')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
          </div>
          {status === 'ready' && allCategories.length > 0 && (
            <div className="wiki-cats-row" aria-label={t('wk.categories')}>
              <span className="wiki-cats-label">{t('wk.categories')}</span>
              {allCategories.map(([name, count]) => (
                <a
                  key={name}
                  className={`wiki-cat-chip${name === category ? ' is-on' : ''}`}
                  href={`/wiki?cat=${encodeURIComponent(name)}`}
                >
                  {name} <em>{count}</em>
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="wiki-index__articles" aria-labelledby="wiki-articles-title">
          <div className="wiki-section-head">
            <h2 id="wiki-articles-title">{category ? t('wk.articlesOf', { cat: category }) : t('wk.articles')}</h2>
            {status === 'ready' && <span className="wiki-count">{t('wk.count', { n: filtered.length })}</span>}
          </div>

          {status === 'loading' && (
            <div className="wiki-skel-list" role="status" aria-hidden="true">
              {[0, 1, 2, 3].map((n) => (
                <span key={n} className={`wiki-skel wiki-skel-${n % 2}`} />
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="wiki-error" role="alert">
              <p>{error || t('wk.loadFail')}</p>
              <button className="wiki-button" type="button" onClick={() => setReloadKey((value) => value + 1)}>
                {t('wk.retry')}
              </button>
            </div>
          )}

          {status === 'ready' && articles.length === 0 && (
            <div className="wiki-empty">
              <h3>{t('wk.noneTitle')}</h3>
              <p>{t('wk.noneText')}</p>
              <a className="wiki-button wiki-button--primary" href="/wiki/nouveau">
                {t('wk.firstBtn')}
              </a>
            </div>
          )}

          {status === 'ready' && articles.length > 0 && filtered.length === 0 && (
            <div className="wiki-empty">
              <h3>{t('wk.noneTitle')}</h3>
              <p>{category ? t('wk.noInCat', { cat: category }) : t('wk.noMatch', { q: query.trim() })}</p>
            </div>
          )}

          {showLetterIndex && (
            <nav className="wiki-alpha" aria-label={t('wk.alphaAria')}>
              {groups.map(([letter]) => (
                <a key={letter} href={`#wiki-letter-${letter}`}>{letter}</a>
              ))}
            </nav>
          )}

          {groups.map(([letter, items]) => (
            <section key={letter} id={`wiki-letter-${letter}`} className="wiki-letter-group" aria-label={t('wk.letterAria', { letter })}>
              {showLetterIndex && <h3 className="wiki-letter">{letter}</h3>}
              <ul className="wiki-article-list">
                {items.map((article) => (
                  <li key={article.slug}>
                    <a className="wiki-card" href={`/wiki/${encodeURIComponent(article.slug)}`}>
                      <span className="wiki-card__title">{article.title || article.slug}</span>
                      {article.summary && <span className="wiki-card__summary">{article.summary}</span>}
                      <span className="wiki-card__meta">
                        {t('wk.modified', { date: formatDate(article.updatedAt), author: displayAuthor(article.author) })}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
      </main>
    </WikiFrame>
  );
}
