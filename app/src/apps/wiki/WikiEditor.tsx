import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchWikiArticle, isAbortError, saveWikiArticle } from './api';
import { readAuthor, writeAuthor } from './format';
import { renderMarkdown, slugify } from './markdown';
import WikiFrame from './WikiFrame';

const BODY_LIMIT = 65536;

export default function WikiEditor() {
  const editSlug = useMemo(() => new URLSearchParams(window.location.search).get('slug')?.trim() || '', []);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState(editSlug);
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [author, setAuthor] = useState(readAuthor);
  const [slugTouched, setSlugTouched] = useState(!!editSlug);
  const [loading, setLoading] = useState(!!editSlug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editSlug) {
      document.title = 'Nouvel article — SeyraWiki';
      return;
    }

    document.title = 'Modifier un article — SeyraWiki';
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    setError('');

    fetchWikiArticle(editSlug, controller.signal)
      .then((article) => {
        if (!alive) return;
        setTitle(article.title || '');
        setSlug(article.slug || editSlug);
        setSummary(article.summary || '');
        setBody(article.body || '');
        setSlugTouched(true);
        setLoading(false);
        document.title = `Modifier « ${article.title || editSlug} » — SeyraWiki`;
      })
      .catch((cause: unknown) => {
        if (!alive || isAbortError(cause)) return;
        setError(cause instanceof Error ? cause.message : 'Impossible de charger cet article.');
        setLoading(false);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [editSlug]);

  const preview = useMemo(() => renderMarkdown(body), [body]);
  const bodyBytes = useMemo(() => new TextEncoder().encode(body).length, [body]);
  const overLimit = bodyBytes > BODY_LIMIT;

  const focusSelection = (start: number, end: number) => {
    window.requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(start, end);
    });
  };

  const wrapSelection = (before: string, after: string, placeholder: string) => {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = body.slice(start, end);
    const inner = selected || placeholder;
    const next = body.slice(0, start) + before + inner + after + body.slice(end);
    setBody(next);
    focusSelection(start + before.length, start + before.length + inner.length);
  };

  const prefixLines = (prefix: string, placeholder: string, everyLine: boolean) => {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const lineStart = body.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const selected = body.slice(lineStart, end);
    const text = selected || placeholder;
    const next = text
      .split('\n')
      .map((line, index) => (everyLine || index === 0 ? prefix + line : line))
      .join('\n');
    setBody(body.slice(0, lineStart) + next + body.slice(end));
    focusSelection(lineStart + prefix.length, lineStart + next.length);
  };

  const insertCode = () => {
    const element = textareaRef.current;
    if (!element) return;
    const selected = body.slice(element.selectionStart, element.selectionEnd);
    if (selected.includes('\n')) wrapSelection('```\n', '\n```', 'code');
    else wrapSelection('`', '`', 'code');
  };

  const handleTitle = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleAuthor = (value: string) => {
    setAuthor(value);
    writeAuthor(value);
  };

  const handleSave = async () => {
    if (saving || loading) return;
    setError('');

    const cleanTitle = title.trim();
    const cleanSlug = slug.trim().replace(/^\/+|\/+$/g, '');
    const cleanSummary = summary.trim();
    const cleanAuthor = author.trim() || 'anonyme';

    if (!cleanTitle) {
      setError('Le titre est obligatoire.');
      return;
    }
    if (cleanTitle.length > 120) {
      setError('Le titre ne peut pas dépasser 120 caractères.');
      return;
    }
    if (!cleanSlug) {
      setError('L’adresse (slug) est obligatoire.');
      return;
    }
    if (!/^[^\s/?#]+$/.test(cleanSlug)) {
      setError('L’adresse ne peut pas contenir d’espace, de « / », de « ? » ni de « # ».');
      return;
    }
    if (cleanSummary.length > 500) {
      setError('Le résumé ne peut pas dépasser 500 caractères.');
      return;
    }
    if (bodyBytes > BODY_LIMIT) {
      setError('Le corps de l’article ne peut pas dépasser 64 Ko.');
      return;
    }

    setSlug(cleanSlug);
    setSaving(true);
    writeAuthor(cleanAuthor);

    try {
      await saveWikiArticle(cleanSlug, {
        title: cleanTitle,
        body,
        author: cleanAuthor,
        summary: cleanSummary,
      });
      window.location.href = '/wiki/' + cleanSlug;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'L’enregistrement a échoué.');
      setSaving(false);
    }
  };

  const cancelHref = editSlug ? `/wiki/${encodeURIComponent(editSlug)}` : '/wiki';
  const disabled = loading || saving;

  return (
    <WikiFrame
      title={editSlug ? 'Modifier l’article' : 'Écrire un article'}
      subtitle={editSlug ? 'Édition' : 'Nouvel article'}
      actions={
        <a className="wiki-button wiki-button--ghost" href={cancelHref}>
          Annuler
        </a>
      }
    >
      <main className="wiki-editor-page">

        <p className="wiki-warning">Tout est public et modifiable par anyone. N'écrivez pas de secrets.</p>

        {loading && <p className="wiki-status">Chargement de l’article…</p>}

        <form
          className="wiki-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div className="wiki-form-grid">
            <div className="wiki-field">
              <label htmlFor="wiki-title">Titre</label>
              <input
                id="wiki-title"
                className="wiki-input"
                value={title}
                maxLength={120}
                disabled={loading}
                onChange={(event) => handleTitle(event.target.value)}
              />
              <span className="wiki-counter">{title.length} / 120</span>
            </div>

            <div className="wiki-field">
              <div className="wiki-label-row">
                <label htmlFor="wiki-slug">Adresse (slug)</label>
                <button
                  type="button"
                  className="wiki-link-button"
                  onClick={() => {
                    setSlug(slugify(title));
                    setSlugTouched(false);
                  }}
                  disabled={disabled}
                >
                  Régénérer
                </button>
              </div>
              <input
                id="wiki-slug"
                className="wiki-input"
                value={slug}
                maxLength={120}
                disabled={loading}
                onChange={(event) => {
                  setSlug(event.target.value);
                  setSlugTouched(true);
                }}
              />
              <span className="wiki-hint">Lettres, chiffres et tirets recommandés.</span>
            </div>
          </div>

          <div className="wiki-field">
            <label htmlFor="wiki-author">Votre pseudo</label>
            <input
              id="wiki-author"
              className="wiki-input"
              value={author}
              maxLength={40}
              disabled={loading}
              onChange={(event) => handleAuthor(event.target.value)}
            />
            <span className="wiki-hint">Enregistré sur cet appareil.</span>
          </div>

          <div className="wiki-field">
            <label htmlFor="wiki-summary">Résumé</label>
            <textarea
              id="wiki-summary"
              className="wiki-textarea"
              rows={3}
              value={summary}
              maxLength={500}
              disabled={loading}
              onChange={(event) => setSummary(event.target.value)}
            />
            <span className="wiki-counter">{summary.length} / 500</span>
          </div>

          <div className="wiki-field">
            <div className="wiki-body-head">
              <label htmlFor="wiki-body">Corps de l’article (Markdown)</label>
              <button
                type="button"
                className="wiki-button wiki-preview-toggle"
                onClick={() => setPreviewOpen((value) => !value)}
              >
                {previewOpen ? 'Fermer l’aperçu' : 'Aperçu'}
              </button>
            </div>

            <div className={`wiki-editor-grid${previewOpen ? ' wiki-editor--preview' : ''}`}>
              <div className="wiki-editor__pane">
                <div className="wiki-toolbar" role="toolbar" aria-label="Mise en forme">
                  <button type="button" className="wiki-tool" title="Gras" aria-label="Gras" onMouseDown={(event) => event.preventDefault()} onClick={() => wrapSelection('**', '**', 'gras')} disabled={disabled}>
                    <strong>B</strong>
                  </button>
                  <button type="button" className="wiki-tool" title="Italique" aria-label="Italique" onMouseDown={(event) => event.preventDefault()} onClick={() => wrapSelection('*', '*', 'italique')} disabled={disabled}>
                    <em>I</em>
                  </button>
                  <button type="button" className="wiki-tool" title="Lien" aria-label="Lien" onMouseDown={(event) => event.preventDefault()} onClick={() => wrapSelection('[', '](https://exemple.com)', 'texte')} disabled={disabled}>
                    Lien
                  </button>
                  <button type="button" className="wiki-tool" title="Titre" aria-label="Titre" onMouseDown={(event) => event.preventDefault()} onClick={() => prefixLines('## ', 'Titre', false)} disabled={disabled}>
                    H2
                  </button>
                  <button type="button" className="wiki-tool" title="Code" aria-label="Code" onMouseDown={(event) => event.preventDefault()} onClick={insertCode} disabled={disabled}>
                    Code
                  </button>
                  <button type="button" className="wiki-tool" title="Liste" aria-label="Liste" onMouseDown={(event) => event.preventDefault()} onClick={() => prefixLines('- ', 'élément', true)} disabled={disabled}>
                    Liste
                  </button>
                </div>

                <textarea
                  id="wiki-body"
                  ref={textareaRef}
                  className="wiki-textarea wiki-textarea--body"
                  value={body}
                  maxLength={BODY_LIMIT}
                  disabled={loading}
                  spellCheck
                  onChange={(event) => setBody(event.target.value)}
                />
                <span className={`wiki-counter${overLimit ? ' wiki-counter--over' : ''}`}>
                  {bodyBytes.toLocaleString('fr-FR')} / 65 536 octets
                </span>
              </div>

              <div className="wiki-editor__preview">
                <p className="wiki-preview-title">Aperçu</p>
                {body.trim() ? (
                  <div className="wiki-markdown" dangerouslySetInnerHTML={{ __html: preview.html }} />
                ) : (
                  <p className="wiki-status">L’aperçu apparaîtra ici.</p>
                )}
              </div>
            </div>
          </div>

          {editSlug && !loading && (
            <p className="wiki-hint">
              Si vous changez l’adresse, un nouvel article sera créé et l’ancien restera en ligne.
            </p>
          )}

          {error && (
            <div className="wiki-error" role="alert">
              <p>{error}</p>
            </div>
          )}

          <div className="wiki-editor-actions">
            <button type="submit" className="wiki-button wiki-button--primary" disabled={disabled}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <a className="wiki-button wiki-button--ghost" href={cancelHref}>
              Annuler
            </a>
          </div>
        </form>
      </main>
    </WikiFrame>
  );
}
