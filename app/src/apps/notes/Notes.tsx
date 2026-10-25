import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAutoRestore, useVault } from '../../lib/vault';
import AppFrame from '../../components/AppFrame';
import { renderMarkdown } from './markdown';
import { useT } from '../../lib/i18n';
import { locale } from '../../lib/locale';
import './notes.css';

type Note = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
};

type Draft = {
  id: string;
  title: string;
  tagsRaw: string;
  tags: string[];
  body: string;
};

const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const MOD = IS_MAC ? '⌘' : 'Ctrl';

function notesOf(value: unknown): Note[] {
  if (!Array.isArray(value)) return [];
  return (value as Note[])
    .filter((note) => note !== null && typeof note === 'object' && typeof note.id === 'string')
    .map((note) => ({
      ...note,
      title: typeof note.title === 'string' ? note.title : '',
      body: typeof note.body === 'string' ? note.body : '',
      tags: Array.isArray(note.tags)
        ? note.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
      createdAt: typeof note.createdAt === 'number' ? note.createdAt : Date.now(),
      updatedAt: typeof note.updatedAt === 'number' ? note.updatedAt : Date.now(),
    }));
}

function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const clean = part.trim().replace(/^#+/, '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(clean.slice(0, 32));
  }
  return tags;
}

function formatWhen(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const loc = locale();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  }
  if (date.getFullYear() !== now.getFullYear()) {
    return date.toLocaleDateString(loc, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return date.toLocaleDateString(loc, { day: '2-digit', month: 'short' });
}

function snippet(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^&gt;\s?/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

function wordCount(body: string): number {
  const trimmed = body.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function safeFileName(title: string): string {
  const base = title.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 60);
  return `${base || 'note'}.md`;
}

function IconBase({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const IconPlus = () => (
  <IconBase size={16}>
    <path d="M12 5v14M5 12h14" />
  </IconBase>
);
const IconSearch = () => (
  <IconBase size={16}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </IconBase>
);
const IconLock = () => (
  <IconBase size={15}>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </IconBase>
);
const IconPin = () => (
  <IconBase size={16}>
    <path d="M9 3h6l-1 7 4 3v2H6v-2l4-3-1-7Z" />
    <path d="M12 15v6" />
  </IconBase>
);
const IconEye = () => (
  <IconBase>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="2.5" />
  </IconBase>
);
const IconEdit = () => (
  <IconBase>
    <path d="M4 20h4L18 10a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </IconBase>
);
const IconDownload = () => (
  <IconBase>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </IconBase>
);
const IconTrash = () => (
  <IconBase>
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="m6 7 1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </IconBase>
);
const IconTag = () => (
  <IconBase size={14}>
    <path d="M3 12V4h8l10 10-8 8L3 12Z" />
    <circle cx="7.5" cy="7.5" r="1.1" />
  </IconBase>
);
const IconNote = () => (
  <IconBase size={34}>
    <path d="M6 3h9l4 4v14H6V3Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h6" />
  </IconBase>
);

export default function Notes() {
  const t = useT();
  useAutoRestore();
  const { vault, update } = useVault();

  const notes = useMemo(() => notesOf(vault.notes), [vault.notes]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(false);
  const [title, setTitle] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [body, setBody] = useState('');
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const latestRef = useRef<Draft | null>(null);
  const dirtyRef = useRef(false);
  const loadedRef = useRef<string | null>(null);

  const ordered = useMemo(
    () =>
      [...notes].sort(
        (a, b) =>
          Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt - a.updatedAt,
      ),
    [notes],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ordered;
    return ordered.filter(
      (note) =>
        note.title.toLowerCase().includes(needle) ||
        note.body.toLowerCase().includes(needle) ||
        note.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }, [ordered, query]);

  const selected = useMemo(
    () => (selectedId ? notes.find((note) => note.id === selectedId) ?? null : null),
    [notes, selectedId],
  );

  const commit = useCallback(
    (id: string, data: { title: string; tags: string[]; body: string }) => {
      update((current) => {
        const list = notesOf(current.notes);
        return {
          ...current,
          notes: list.map((note) =>
            note.id === id ? { ...note, ...data, updatedAt: Date.now() } : note,
          ),
        };
      });
    },
    [update],
  );

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = latestRef.current;
    if (!pending || !dirtyRef.current) return;
    dirtyRef.current = false;
    setDirty(false);
    commit(pending.id, { title: pending.title, tags: pending.tags, body: pending.body });
    setSavedAt(Date.now());
  }, [commit]);

  useEffect(() => {
    if (loadedRef.current === selectedId) return;
    flush();
    loadedRef.current = selectedId;
    latestRef.current = null;
    dirtyRef.current = false;
    setDirty(false);
    const note = selectedId ? notes.find((entry) => entry.id === selectedId) : undefined;
    setTitle(note?.title ?? '');
    setTagsRaw((note?.tags ?? []).join(', '));
    setBody(note?.body ?? '');
    setPreview(false);
    setSavedAt(note?.updatedAt ?? null);
  }, [selectedId, notes, flush]);

  useEffect(() => {
    if (selectedId || !filtered.length) return;
    if (!window.matchMedia('(min-width: 821px)').matches) return;
    setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      const pending = latestRef.current;
      if (pending && dirtyRef.current) {
        commit(pending.id, { title: pending.title, tags: pending.tags, body: pending.body });
      }
    },
    [commit],
  );

  const createNote = useCallback(() => {
    const now = Date.now();
    const id = `n_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const note: Note = {
      id,
      title: '',
      body: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    update((current) => ({ ...current, notes: [note, ...notesOf(current.notes)] }));
    setQuery('');
    setSelectedId(id);
    window.setTimeout(() => titleRef.current?.focus(), 60);
  }, [update]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createNote();
        return;
      }
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (
        event.key === 'Escape' &&
        selectedId &&
        window.matchMedia('(max-width: 820px)').matches
      ) {
        event.preventDefault();
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [createNote, selectedId]);

  const schedule = (next: { title: string; tagsRaw: string; body: string }) => {
    if (!selectedId) return;
    latestRef.current = {
      id: selectedId,
      title: next.title,
      tagsRaw: next.tagsRaw,
      tags: parseTags(next.tagsRaw),
      body: next.body,
    };
    dirtyRef.current = true;
    setDirty(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const pending = latestRef.current;
      if (!pending) return;
      dirtyRef.current = false;
      setDirty(false);
      commit(pending.id, { title: pending.title, tags: pending.tags, body: pending.body });
      setSavedAt(Date.now());
    }, 400);
  };

  const changeTitle = (value: string) => {
    setTitle(value);
    schedule({ title: value, tagsRaw, body });
  };

  const changeTags = (value: string) => {
    setTagsRaw(value);
    schedule({ title, tagsRaw: value, body });
  };

  const changeBody = (value: string) => {
    setBody(value);
    schedule({ title, tagsRaw, body: value });
  };

  const togglePin = (id: string) => {
    update((current) => ({
      ...current,
      notes: notesOf(current.notes).map((note) =>
        note.id === id ? { ...note, pinned: !note.pinned } : note,
      ),
    }));
  };

  const removeSelected = () => {
    if (!selectedId) return;
    if (!window.confirm(t('nt.deleteConfirm'))) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    latestRef.current = null;
    dirtyRef.current = false;
    setDirty(false);
    const id = selectedId;
    loadedRef.current = null;
    update((current) => ({
      ...current,
      notes: notesOf(current.notes).filter((note) => note.id !== id),
    }));
    setSelectedId(null);
    setPreview(false);
  };

  const exportNote = () => {
    if (!selected) return;
    const heading = title.trim() ? `# ${title.trim()}\n\n` : '';
    const tagLine = parseTags(tagsRaw)
      .map((tag) => `#${tag}`)
      .join(' ');
    const content = `${heading}${tagLine ? `${tagLine}\n\n` : ''}${body}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFileName(title);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const parsedTags = parseTags(tagsRaw);
  const previewHtml = useMemo(() => renderMarkdown(body), [body]);
  const countLabel = t('nt.statNotes') + ' · ' + ordered.length;
  const words = wordCount(body);

  /* Barre latérale : création, recherche et liste des notes. */
  const listNav = (
    <div className="notes-list-pane" aria-label={t('nt.listAria')}>
      <button type="button" className="app-nav-item notes-new" onClick={createNote} aria-label={t('nt.newAria')}>
        <IconPlus />
        <span className="notes-new-label">{t('nt.new')}</span>
        <kbd className="notes-kbd">{MOD} N</kbd>
      </button>
          <div className="notes-search">
            <IconSearch />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t('nt.searchAria')}
              spellCheck={false}
            />
            {query ? (
              <button
                type="button"
                className="notes-search-clear"
                onClick={() => {
                  setQuery('');
                  searchRef.current?.focus();
                }}
                aria-label={t('nt.clearSearch')}
              >
                ×
              </button>
            ) : (
              <kbd className="notes-kbd notes-kbd--search">{MOD} K</kbd>
            )}
          </div>

          <div className="notes-count">
            {query.trim()
              ? t('nt.countOf', { n: filtered.length, total: ordered.length })
              : `${t('nt.statNotes')} · ${ordered.length}`}
          </div>

          <div className="notes-items">
            {!ordered.length ? (
              <div className="notes-list-empty">
                <IconNote />
                <p>{t('nt.listEmpty')}</p>
                <button type="button" className="notes-btn notes-btn--accent" onClick={createNote}>
                  {t('nt.create')}
                </button>
              </div>
            ) : !filtered.length ? (
              <div className="notes-list-empty">
                <IconSearch />
                <p>{t('nt.noResult', { q: query.trim() })}</p>
              </div>
            ) : (
              filtered.map((note) => {
                const text = snippet(note.body);
                return (
                  <button
                    type="button"
                    key={note.id}
                    className={`notes-item${note.id === selectedId ? ' is-active' : ''}`}
                    onClick={() => setSelectedId(note.id)}
                    aria-current={note.id === selectedId ? 'true' : undefined}
                  >
                    <span className="notes-item-top">
                      <span className="notes-item-title">
                        {note.title.trim() || t('nt.untitled')}
                      </span>
                      {note.pinned ? (
                        <span className="notes-item-pin">
                          <IconPin />
                        </span>
                      ) : null}
                    </span>
                    <span className="notes-item-snippet">{text || t('nt.emptyBody')}</span>
                    <span className="notes-item-meta">
                      <span>{formatWhen(note.updatedAt)}</span>
                      {note.tags.slice(0, 3).map((tag) => (
                        <span className="notes-mini-tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 3 ? (
                        <span className="notes-mini-tag">+{note.tags.length - 3}</span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
    </div>
  );

  /* En-tête du pane : actions de la note sélectionnée. */
  const toolbar = selected ? (
    <>
      <button
        type="button"
        className={`notes-icon-btn${selected.pinned ? ' is-on' : ''}`}
        onClick={() => togglePin(selected.id)}
        aria-label={selected.pinned ? t('nt.unpinAria') : t('nt.pinAria')}
        title={selected.pinned ? t('nt.unpin') : t('nt.pin')}
      >
        <IconPin />
      </button>
      <button
        type="button"
        className={`notes-icon-btn${preview ? ' is-on' : ''}`}
        onClick={() => setPreview((value) => !value)}
        aria-label={preview ? t('nt.toEdit') : t('nt.previewMd')}
        title={preview ? t('nt.edit') : t('nt.preview')}
        aria-pressed={preview}
      >
        {preview ? <IconEdit /> : <IconEye />}
      </button>
      <button
        type="button"
        className="notes-icon-btn"
        onClick={exportNote}
        aria-label={t('nt.export')}
        title={t('nt.exportDot')}
      >
        <IconDownload />
      </button>
      <button
        type="button"
        className="notes-icon-btn notes-danger"
        onClick={removeSelected}
        aria-label={t('nt.delete')}
        title={t('nt.delete')}
      >
        <IconTrash />
      </button>
    </>
  ) : null;

  return (
    <AppFrame
      app="notes"
      sideSub={t('nt.sideSub')}
      title={selected ? title.trim() || t('nt.untitled') : t('nt.title')}
      subtitle={
        <>
          <IconLock /> {countLabel}
          <i className={`live ${dirty ? 'connecting' : 'online'}`} /> {selected ? (dirty ? t('nt.saving') : t('nt.saved')) : t('nt.ready')}
        </>
      }
      note={<>{t('nt.banner')}</>}
      stats={[
        [ordered.length, t('nt.statNotes')],
        [ordered.filter((note) => note.pinned).length, t('nt.pinned')],
        [words, t('nt.words')],
      ]}
      quick={
        <>
          <button type="button" className="side-action" onClick={createNote}>
            <IconPlus /> {t('nt.new')}
          </button>
          <button type="button" className="side-action" onClick={() => { searchRef.current?.focus(); searchRef.current?.select(); }}>
            <IconSearch /> {t('nt.search')}
          </button>
        </>
      }
      card={
        <>
          <span className="code-label"><IconLock /> {t('nt.selected')}</span>
          <code>{selected ? title.trim() || t('nt.untitled') : t('nt.none')}</code>
          <em>{selected ? t('nt.modified', { when: formatWhen(savedAt ?? selected.updatedAt) }) : t('nt.pick')}</em>
        </>
      }
      actions={toolbar}
      fixedBody
      nav={listNav}
      foot={
        selected ? (
          <button type="button" className="btn danger wide" onClick={removeSelected}>
            {t('nt.delete')}
          </button>
        ) : (
          <p>{t('nt.keep')}</p>
        )
      }
      className="notes-frame"
    >
          {!selected ? (
            <div className="notes-empty">
              <IconNote />
              <h2>{t('nt.emptyTitle')}</h2>
              <p>{t('nt.emptyText')}</p>
              <button type="button" className="notes-btn notes-btn--accent" onClick={createNote}>
                <IconPlus />
                {t('nt.new')}
              </button>
            </div>
          ) : (
            <>
              <div className="notes-fields">
                <input
                  ref={titleRef}
                  className="notes-title-input"
                  value={title}
                  onChange={(event) => changeTitle(event.target.value)}
                  aria-label={t('nt.titleAria')}
                  spellCheck
                />
                <div className="notes-tags-line">
                  <IconTag />
                  <input
                    className="notes-tags-input"
                    value={tagsRaw}
                    onChange={(event) => changeTags(event.target.value)}
                    aria-label={t('nt.tagsAria')}
                    spellCheck={false}
                  />
                </div>
                {parsedTags.length ? (
                  <div className="notes-tag-chips">
                    {parsedTags.map((tag) => (
                      <span className="notes-chip" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="notes-body-wrap">
                {preview ? (
                  body.trim() ? (
                    <div
                      className="notes-preview"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  ) : (
                    <p className="notes-preview-empty">{t('nt.nothingPreview')}</p>
                  )
                ) : (
                  <textarea
                    className="notes-body"
                    value={body}
                    onChange={(event) => changeBody(event.target.value)}
                    aria-label={t('nt.bodyAria')}
                    spellCheck
                  />
                )}
              </div>

              <div className="notes-foot">
                <span>
                  {words === 1 ? t('nt.wordOne', { n: words }) : t('nt.wordMany', { n: words })}
                </span>
                <span>{t('nt.modShort')} {formatWhen(savedAt ?? selected.updatedAt)}</span>
              </div>
            </>
          )}
    </AppFrame>
  );
}
