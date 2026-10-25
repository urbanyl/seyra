import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../lib/i18n';
import { apiErrorMessage } from '../../lib/apierr';
import { fetchWikiArticle, generateWikiDraft, isAbortError, saveWikiArticle } from './api';
import { readAuthor, writeAuthor } from './format';
import { renderMarkdown, slugify } from './markdown';
import WikiFrame from './WikiFrame';
import { getLang } from '../../lib/i18n';

const BODY_LIMIT = 65536;

export default function WikiEditor() {
  const t = useT();
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
  const [aiTopic, setAiTopic] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleTitle = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const runAi = async () => {
    if (aiBusy) return;
    const topic = aiTopic.trim();
    setAiError('');
    if (topic.length < 3) {
      setAiError(t('wk.aiShort'));
      return;
    }
    if (body.trim() && !window.confirm(t('wk.aiConfirm'))) return;
    setAiBusy(true);
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 200_000);
      try {
        const draft = await generateWikiDraft(topic, getLang(), controller.signal);
        handleTitle(draft.title || topic);
        setSummary(draft.summary || '');
        setBody(draft.body || '');
        setError('');
      } finally {
        window.clearTimeout(timer);
      }
    } catch (cause: unknown) {
      if (isAbortError(cause)) setAiError(t('wk.aiTimeout'));
      else setAiError(apiErrorMessage(cause, t, t('wk.aiFail')));
    } finally {
      setAiBusy(false);
    }
  };

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
      setError(t('wk.errTitle'));
      return;
    }
    if (cleanTitle.length > 120) {
      setError(t('wk.errTitleLen'));
      return;
    }
    if (!cleanSlug) {
      setError(t('wk.errSlug'));
      return;
    }
    if (!/^[^\s/?#]+$/.test(cleanSlug)) {
      setError(t('wk.errSlugChars'));
      return;
    }
    if (cleanSummary.length > 500) {
      setError(t('wk.errSummaryLen'));
      return;
    }
    if (bodyBytes > BODY_LIMIT) {
      setError(t('wk.errBodyLen'));
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
      setError(apiErrorMessage(cause, t, t('wk.errSave')));
      setSaving(false);
    }
  };

  const cancelHref = editSlug ? `/wiki/${encodeURIComponent(editSlug)}` : '/wiki';
  const disabled = loading || saving;

  return (
    <WikiFrame
      title={editSlug ? t('wk.editTitle') : t('wk.newTitle')}
      subtitle={editSlug ? t('wk.edition') : t('wk.newSub')}
      actions={
        <a className="wiki-button wiki-button--ghost" href={cancelHref}>
          {t('wk.cancel')}
        </a>
      }
    >
      <main className="wiki-editor-page">

        <p className="wiki-warning">{t('wk.warning')}</p>

        {loading && <p className="wiki-status">{t('wk.loadingArticle')}</p>}

        <section className="wiki-ai" aria-label={t('wk.aiTitle')}>
          <div className="wiki-ai-head">
            <span className="wiki-ai-star" aria-hidden="true">✦</span>
            <strong>{t('wk.aiTitle')}</strong>
            <span className="wiki-ai-note">{t('wk.aiNote')}</span>
          </div>
          <div className="wiki-ai-row">
            <label className="wiki-visually-hidden" htmlFor="wiki-ai-topic">{t('wk.aiTopic')}</label>
            <input
              id="wiki-ai-topic"
              className="wiki-input"
              type="text"
              value={aiTopic}
              maxLength={200}
              placeholder={t('wk.aiPh')}
              disabled={aiBusy || loading}
              onChange={(event) => setAiTopic(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void runAi();
                }
              }}
            />
            <button type="button" className="wiki-button wiki-button--primary" onClick={() => void runAi()} disabled={aiBusy || loading}>
              {aiBusy ? t('wk.aiBusy') : t('wk.aiBtn')}
            </button>
          </div>
          {aiBusy && (
            <p className="wiki-status" role="status">
              <span className="wiki-spinner" aria-hidden="true" /> {t('wk.aiWait')}
            </p>
          )}
          {aiError && <p className="wiki-ai-error" role="alert">{aiError}</p>}
        </section>

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
              <label htmlFor="wiki-title">{t('wk.title')}</label>
              <input
                id="wiki-title"
                className="wiki-input"
                value={title}
                maxLength={120}
                disabled={loading}
                onChange={(event) => handleTitle(event.target.value)}
              />
              <span className="wiki-counter">{t('wk.words', { n: title.length })}</span>
            </div>

            <div className="wiki-field">
              <div className="wiki-label-row">
                <label htmlFor="wiki-slug">{t('wk.slug')}</label>
                <button
                  type="button"
                  className="wiki-link-button"
                  onClick={() => {
                    setSlug(slugify(title));
                    setSlugTouched(false);
                  }}
                  disabled={disabled}
                >
                  {t('wk.regenerate')}
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
              <span className="wiki-hint">{t('wk.slugHint')}</span>
            </div>
          </div>

          <div className="wiki-field">
            <label htmlFor="wiki-author">{t('wk.author')}</label>
            <input
              id="wiki-author"
              className="wiki-input"
              value={author}
              maxLength={40}
              disabled={loading}
              onChange={(event) => handleAuthor(event.target.value)}
            />
            <span className="wiki-hint">{t('wk.authorHint')}</span>
          </div>

          <div className="wiki-field">
            <label htmlFor="wiki-summary">{t('wk.summary')}</label>
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
              <label htmlFor="wiki-body">{t('wk.body')}</label>
              <button
                type="button"
                className="wiki-button wiki-preview-toggle"
                onClick={() => setPreviewOpen((value) => !value)}
              >
                {previewOpen ? t('wk.closePreview') : t('wk.preview')}
              </button>
            </div>

            <div className={`wiki-editor-grid${previewOpen ? ' wiki-editor--preview' : ''}`}>
              <div className="wiki-editor__pane">
                <div className="wiki-toolbar" role="toolbar" aria-label={t('wk.formatAria')}>
                  <button type="button" className="wiki-tool" title={t('wk.bold')} aria-label={t('wk.bold')} onMouseDown={(event) => event.preventDefault()} onClick={() => wrapSelection('**', '**', t('wk.boldPh'))} disabled={disabled}>
                    <strong>B</strong>
                  </button>
                  <button type="button" className="wiki-tool" title={t('wk.italic')} aria-label={t('wk.italic')} onMouseDown={(event) => event.preventDefault()} onClick={() => wrapSelection('*', '*', t('wk.italicPh'))} disabled={disabled}>
                    <em>I</em>
                  </button>
                  <button type="button" className="wiki-tool" title={t('wk.link')} aria-label={t('wk.link')} onMouseDown={(event) => event.preventDefault()} onClick={() => wrapSelection('[', '](https://exemple.com)', t('wk.linkPh'))} disabled={disabled}>
                    {t('wk.link')}
                  </button>
                  <button type="button" className="wiki-tool" title={t('wk.heading')} aria-label={t('wk.heading')} onMouseDown={(event) => event.preventDefault()} onClick={() => prefixLines('## ', t('wk.heading'), false)} disabled={disabled}>
                    H2
                  </button>
                  <button type="button" className="wiki-tool" title={t('wk.code')} aria-label={t('wk.code')} onMouseDown={(event) => event.preventDefault()} onClick={insertCode} disabled={disabled}>
                    Code
                  </button>
                  <button type="button" className="wiki-tool" title={t('wk.list')} aria-label={t('wk.list')} onMouseDown={(event) => event.preventDefault()} onClick={() => prefixLines('- ', t('wk.listPh'), true)} disabled={disabled}>
                    {t('wk.list')}
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
                  {t('wk.bytes', { n: bodyBytes.toLocaleString('fr-FR') })}
                </span>
              </div>

              <div className="wiki-editor__preview">
                <p className="wiki-preview-title">{t('wk.preview')}</p>
                {body.trim() ? (
                  <div className="wiki-markdown" dangerouslySetInnerHTML={{ __html: preview.html }} />
                ) : (
                  <p className="wiki-status">{t('wk.previewHere')}</p>
                )}
              </div>
            </div>
          </div>

          {editSlug && !loading && (
            <p className="wiki-hint">
              {t('wk.slugChange')}
            </p>
          )}

          {error && (
            <div className="wiki-error" role="alert">
              <p>{error}</p>
            </div>
          )}

          <div className="wiki-editor-actions">
            <button type="submit" className="wiki-button wiki-button--primary" disabled={disabled}>
              {saving ? t('wk.saving') : t('wk.save')}
            </button>
            <a className="wiki-button wiki-button--ghost" href={cancelHref}>
              {t('wk.cancel')}
            </a>
          </div>
        </form>
      </main>
    </WikiFrame>
  );
}
