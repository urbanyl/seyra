import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AppFrame from '../../components/AppFrame';
import { getLang, t as tr, useT } from '../../lib/i18n';
import { locale } from '../../lib/locale';
import { IconPlus, IconUsers } from '../../components/Icons';
import { Avatar } from '../../components/ui';
import './channels.css';

type ChannelSummary = { id: string; title: string; topic: string; posts: number; updatedAt: number };
type ChannelInfo = { id: string; title: string; topic: string };
type ChannelMessage = { id: string; ts: number; name: string; text: string };
type Notice = { kind: 'error' | 'info'; text: string };

const NAME_KEY = 'seyra.channels.name';
const DEFAULT_NAME = 'anonyme';
const MAX_NAME = 24;
const MAX_TITLE = 80;
const MAX_TOPIC = 200;
const MAX_TEXT = 2000;
const POLL_MS = 4000;

const RATE_LIMIT_MESSAGE = () => tr(getLang(), 'ch.rateLimit');
const NETWORK_MESSAGE = () => tr(getLang(), 'ch.netError');
const AVATAR_COLORS = ['#00b2ff', '#4f8bff', '#37c2a0', '#e0a30b', '#dc6aa8', '#9b8cff'];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function readTimestamp(value: unknown): number {
  const parsed = readNumber(value);
  if (parsed > 0) return parsed;
  if (typeof value === 'string') {
    const date = Date.parse(value);
    if (Number.isFinite(date)) return date;
  }
  return 0;
}

function cleanName(raw: string): string {
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...cleaned].slice(0, MAX_NAME).join('');
}

function loadStoredName(): string {
  try {
    return cleanName(localStorage.getItem(NAME_KEY) || '') || DEFAULT_NAME;
  } catch {
    return DEFAULT_NAME;
  }
}

function displayName(value: unknown): string {
  const cleaned = readString(value)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64);
  return cleaned || DEFAULT_NAME;
}

function parseChannelSummary(value: unknown): ChannelSummary | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record.id).trim();
  if (!id) return null;
  return {
    id,
    title: readString(record.title).trim().slice(0, MAX_TITLE) || 'Sans titre',
    topic: readString(record.topic).trim().slice(0, MAX_TOPIC),
    posts: Math.max(0, Math.trunc(readNumber(record.posts))),
    updatedAt: readTimestamp(record.updatedAt),
  };
}

function parseChannelInfo(value: unknown): ChannelInfo | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record.id).trim();
  if (!id) return null;
  return {
    id,
    title: readString(record.title).trim().slice(0, MAX_TITLE) || 'Sans titre',
    topic: readString(record.topic).trim().slice(0, MAX_TOPIC),
  };
}

function parseMessage(value: unknown): ChannelMessage | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record.id).trim();
  if (!id) return null;
  const ts = readTimestamp(record.ts);
  return {
    id,
    ts: ts > 0 ? ts : Date.now(),
    name: displayName(record.name),
    text: readString(record.text),
  };
}

function parseMessageList(value: unknown): ChannelMessage[] {
  if (!Array.isArray(value)) return [];
  const list: ChannelMessage[] = [];
  for (const item of value) {
    const message = parseMessage(item);
    if (message) list.push(message);
  }
  return list.sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
}

function mergeMessages(previous: ChannelMessage[], incoming: ChannelMessage[]): ChannelMessage[] {
  if (!incoming.length) return previous;
  const map = new Map(previous.map((message) => [message.id, message]));
  let changed = false;
  for (const message of incoming) {
    const current = map.get(message.id);
    if (!current || current.ts !== message.ts || current.name !== message.name || current.text !== message.text) {
      map.set(message.id, message);
      changed = true;
    }
  }
  if (!changed) return previous;
  return [...map.values()].sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
}

async function requestJson(path: string, init: RequestInit = {}): Promise<{ status: number; data: Record<string, unknown> }> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...init, headers, cache: 'no-store' });
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = await response.json();
    data = asRecord(parsed) || {};
  } catch {
    data = {};
  }
  return { status: response.status, data };
}

function failureMessage(status: number, target: 'message' | 'channel'): string {
  if (status === 429) return RATE_LIMIT_MESSAGE();
  if (status === 404) return target === 'channel' ? tr(getLang(), 'ch.svc404') : tr(getLang(), 'ch.gone404');
  if (status === 413) return tr(getLang(), 'ch.toobig');
  if (status === 400 || status === 422) {
    return target === 'channel'
      ? tr(getLang(), 'ch.createFail')
      : tr(getLang(), 'ch.postFail');
  }
  return target === 'channel'
    ? tr(getLang(), 'ch.createServerError', { status })
    : tr(getLang(), 'ch.postServerError', { status });
}

function relativeTime(ts: number, now: number): string {
  const lang = getLang();
  if (!ts) return '—';
  const diff = Math.max(0, now - ts);
  if (diff < 45_000) return tr(lang, 'ch.now');
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return tr(lang, 'ch.minAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tr(lang, 'ch.hourAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return tr(lang, 'nt.yesterday');
  if (days < 7) return tr(lang, 'ch.dayAgo', { n: days });
  const date = new Date(ts);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (date.getFullYear() !== new Date(now).getFullYear()) options.year = 'numeric';
  return date.toLocaleDateString(locale(), options);
}

function fullTime(ts: number): string {
  return new Date(ts).toLocaleString(locale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function messageCount(count: number): string {
  return tr(getLang(), 'ch.messages', { n: count });
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return words
    .slice(0, 2)
    .map((word) => [...word][0]?.toUpperCase() || '')
    .join('') || '?';
}

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) || 0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function renderInline(text: string, prefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|https?:\/\/[^\s<>"']+)/gi;
  let last = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${prefix}-${index}`;
    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>);
    } else {
      let href = token;
      let trailing = '';
      while (/[.,;:!?)\]}]+$/.test(href)) {
        trailing = href.slice(-1) + trailing;
        href = href.slice(0, -1);
      }
      if (href.length > 8) {
        nodes.push(
          <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow">
            {href}
          </a>,
        );
      } else {
        nodes.push(token);
      }
      if (trailing) nodes.push(trailing);
    }
    last = match.index + token.length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderMarkdown(text: string): ReactNode {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {renderInline(line, `line-${index}`)}
    </Fragment>
  ));
}

export default function Channels() {
  const t = useT();
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsError, setChannelsError] = useState('');
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [topicDraft, setTopicDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState(loadStoredName);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const [composerNotice, setComposerNotice] = useState<Notice | null>(null);

  const [now, setNow] = useState(() => Date.now());

  const feedRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const lastTs = useRef(0);
  const stickToBottom = useRef(true);
  const requestToken = useRef(0);

  const loadChannels = useCallback(async (silent = false) => {
    if (!silent) setChannelsLoading(true);
    try {
      const { status, data } = await requestJson('/api/channels/list');
      if (status !== 200) throw new Error('list');
      const list = Array.isArray(data.channels)
        ? data.channels.map(parseChannelSummary).filter((item): item is ChannelSummary => item !== null)
        : [];
      setChannels(list);
      setChannelsError('');
    } catch {
      if (!silent) setChannelsError(tr(getLang(), 'ch.netError'));
    } finally {
      if (!silent) setChannelsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChannels();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void loadChannels(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [loadChannels]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadChannel = useCallback(async (id: string, manual = false) => {
    if (!manual && document.visibilityState === 'hidden') return;
    const token = ++requestToken.current;
    if (manual) setRefreshing(true);
    try {
      const { status, data } = await requestJson(
        `/api/channels/${encodeURIComponent(id)}?since=${lastTs.current}`,
      );
      if (token !== requestToken.current) return;
      if (status === 404) {
        setDetailError('Ce canal n’existe plus.');
        return;
      }
      if (status !== 200) {
        setDetailError('Impossible de charger les messages pour le moment.');
        return;
      }
      const info = parseChannelInfo(data.channel);
      if (info) setChannel(info);
      const incoming = parseMessageList(data.messages);
      if (incoming.length) {
        const newest = incoming.reduce((max, message) => Math.max(max, message.ts), 0);
        if (newest > lastTs.current) lastTs.current = newest;
        setMessages((previous) => mergeMessages(previous, incoming));
      }
      setDetailError('');
    } catch {
      if (token === requestToken.current) setDetailError(NETWORK_MESSAGE());
    } finally {
      if (manual) setRefreshing(false);
      if (token === requestToken.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    setComposer('');
    if (!selectedId) {
      requestToken.current += 1;
      setChannel(null);
      setMessages([]);
      setDetailLoading(false);
      setDetailError('');
      setRefreshing(false);
      lastTs.current = 0;
      return;
    }

    requestToken.current += 1;
    lastTs.current = 0;
    setChannel(null);
    setMessages([]);
    setDetailError('');
    setDetailLoading(true);
    setComposerNotice(null);
    stickToBottom.current = true;

    let timer: number | undefined;
    const startPolling = () => {
      if (timer !== undefined) return;
      timer = window.setInterval(() => {
        void loadChannel(selectedId);
      }, POLL_MS);
    };
    const stopPolling = () => {
      if (timer === undefined) return;
      window.clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadChannel(selectedId);
        startPolling();
      } else {
        stopPolling();
      }
    };

    void loadChannel(selectedId);
    if (document.visibilityState === 'visible') startPolling();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
      requestToken.current += 1;
    };
  }, [selectedId, loadChannel]);

  useEffect(() => {
    if (!composerNotice || composerNotice.kind !== 'info') return;
    const timer = window.setTimeout(() => setComposerNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [composerNotice]);

  useEffect(() => {
    const element = feedRef.current;
    if (!element || !stickToBottom.current) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const element = composerRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  }, [composer, selectedId]);

  const filteredChannels = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return [...channels]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((item) => !query || normalizeSearch(`${item.title} ${item.topic}`).includes(query));
  }, [channels, search]);

  const startNameEdit = () => {
    setNameDraft(name);
    setEditingName(true);
  };

  const saveName = () => {
    const next = cleanName(nameDraft) || DEFAULT_NAME;
    setName(next);
    try {
      localStorage.setItem(NAME_KEY, next);
    } catch {
      setEditingName(false);
      return;
    }
    setEditingName(false);
  };

  const createChannel = async () => {
    const title = titleDraft.trim().slice(0, MAX_TITLE);
    const topic = topicDraft.trim().slice(0, MAX_TOPIC);
    if (!title || creating) {
      if (!title) setCreateError('Donnez un titre au canal.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const { status, data } = await requestJson('/api/channels', {
        method: 'POST',
        body: JSON.stringify({ title, topic }),
      });
      if (status !== 200 && status !== 201) {
        setCreateError(failureMessage(status, 'channel'));
        return;
      }
      const id = readString(data.id).trim();
      if (!id) {
        setCreateError(tr(getLang(), 'ch.noId'));
        return;
      }
      setTitleDraft('');
      setTopicDraft('');
      setShowCreate(false);
      await loadChannels(true);
      setChannels((previous) =>
        previous.some((item) => item.id === id)
          ? previous
          : [{ id, title, topic, posts: 0, updatedAt: Date.now() }, ...previous],
      );
      setSelectedId(id);
    } catch {
      setCreateError(NETWORK_MESSAGE());
    } finally {
      setCreating(false);
    }
  };

  const sendMessage = async () => {
    const id = selectedId;
    const text = composer.trim();
    if (!id || !text || sending) return;
    setSending(true);
    setComposerNotice(null);
    try {
      const { status, data } = await requestJson(`/api/channels/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify({ name: name || DEFAULT_NAME, text }),
      });
      if (status !== 200 && status !== 201) {
        setComposerNotice({ kind: 'error', text: failureMessage(status, 'message') });
        return;
      }
      const message = parseMessage(data.message);
      if (message) {
        if (message.ts > lastTs.current) lastTs.current = message.ts;
        setMessages((previous) => mergeMessages(previous, [message]));
        setChannels((previous) =>
          previous.map((item) =>
            item.id === id
              ? { ...item, posts: item.posts + 1, updatedAt: Math.max(item.updatedAt, message.ts) }
              : item,
          ),
        );
        stickToBottom.current = true;
      } else {
        void loadChannel(id, true);
      }
      setComposer('');
      setComposerNotice({ kind: 'info', text: t('ch.sent') });
      void loadChannels(true);
    } catch {
      setComposerNotice({ kind: 'error', text: NETWORK_MESSAGE() });
    } finally {
      setSending(false);
    }
  };

  const handleFeedScroll = () => {
    const element = feedRef.current;
    if (!element) return;
    stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 90;
  };

  const currentSummary = selectedId ? channels.find((item) => item.id === selectedId) : undefined;
  const title = channel?.title || currentSummary?.title || tr(getLang(), 'app.canaux');
  const topic = channel?.topic || currentSummary?.topic || '';

  return (
    <AppFrame
      app="canaux"
      className="ch-frame"
      fixedBody
      title={selectedId ? title : t('ch.title')}
      sideSub={t('ch.sideSub')}
      subtitle={
        <>
          <IconUsers size={12} /> {selectedId ? t('ch.messages', { n: messages.length }) : t('ch.nChannels', { n: channels.length })}
          <i className="live online" /> {selectedId ? topic || t('ch.noTopic') : t('ch.noAccount')}
        </>
      }
      note={<>{t('ch.banner')}</>}
      stats={[
        [channels.length, t('ch.statChannels')],
        [channels.reduce((total, item) => total + item.posts, 0), t('ch.statMessages')],
        [messages.length, t('ch.thisChannel')],
      ]}
      quick={
        <>
          <button type="button" className="side-action" onClick={() => { setShowCreate((visible) => !visible); setCreateError(''); }}>
            <IconPlus size={16} /> {showCreate ? t('ch.cancel') : t('ch.create')}
          </button>
          <button type="button" className="side-action" disabled={!selectedId || refreshing} onClick={() => { if (selectedId) void loadChannel(selectedId, true); }}>
            {refreshing ? t('ch.refreshing') : t('ch.refresh')}
          </button>
        </>
      }
      card={
    <>
        <div className="ch-identity">
          {editingName ? (
            <div className="ch-name-edit">
              <label htmlFor="ch-name-input">{t('ch.name')}</label>
              <input
                id="ch-name-input"
                value={nameDraft}
                maxLength={MAX_NAME}
                autoFocus
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    saveName();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    setEditingName(false);
                  }
                }}
              />
              <button type="button" className="ch-mini ch-mini-primary" onClick={saveName}>{t('ch.ok')}</button>
              <button type="button" className="ch-mini" onClick={() => setEditingName(false)}>{t('ch.cancel')}</button>
            </div>
          ) : (
            <button type="button" className="ch-name-button" onClick={startNameEdit} title={t('ch.editName')}>
              <span>{t('ch.name')}</span>
              <strong>{name}</strong>
              <em>{t('ch.modifyShort')}</em>
            </button>
          )}
        </div>
    </>
      }
      nav={
      <div className="ch-sidebar" aria-label={t('ch.listAria')}>
          <div className="ch-side-tools">
            <div className="ch-search-row">
              <input
                className="ch-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label={t('ch.searchAria')}
              />
              <button
                type="button"
                className="ch-new"
                onClick={() => {
                  setShowCreate((visible) => !visible);
                  setCreateError('');
                }}
              >
                {showCreate ? t('ch.cancel') : t('ch.create')}
              </button>
            </div>

            {showCreate && (
              <form
                className="ch-create"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createChannel();
                }}
              >
                <div className="ch-field">
                  <div className="ch-field-head">
                    <label htmlFor="ch-title">{t('ch.titleLabel')}</label>
                    <span>{titleDraft.length}/{MAX_TITLE}</span>
                  </div>
                  <input
                    id="ch-title"
                    value={titleDraft}
                    maxLength={MAX_TITLE}
                    autoFocus
                    onChange={(event) => setTitleDraft(event.target.value)}
                  />
                </div>
                <div className="ch-field">
                  <div className="ch-field-head">
                    <label htmlFor="ch-topic">{t('ch.topicLabel')}</label>
                    <span>{topicDraft.length}/{MAX_TOPIC}</span>
                  </div>
                  <textarea
                    id="ch-topic"
                    value={topicDraft}
                    maxLength={MAX_TOPIC}
                    rows={2}
                    onChange={(event) => setTopicDraft(event.target.value)}
                  />
                </div>
                {createError && <p className="ch-error" role="alert">{createError}</p>}
                <button type="submit" className="ch-btn-primary" disabled={creating || !titleDraft.trim()}>
                  {creating ? t('ch.creating') : t('ch.createBtn')}
                </button>
              </form>
            )}
          </div>

          {channelsError && <p className="ch-error ch-side-error" role="alert">{channelsError}</p>}

          <div className="ch-list-head">
            <span>{t('ch.pubList')}</span>
            <span>{channels.length}</span>
          </div>

          <div className="ch-list">
            {channelsLoading && channels.length === 0 ? (
              <p className="ch-empty-line">{t('ch.loadingChannels')}</p>
            ) : channelsError && channels.length === 0 ? null : filteredChannels.length === 0 ? (
              <p className="ch-empty-line">
                {search.trim()
                  ? t('ch.noMatch', { q: search.trim() })
                  : channels.length === 0
                    ? t('ch.none')
                    : t('ch.unavailable')}
              </p>
            ) : (
              filteredChannels.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ch-item"
                  aria-current={selectedId === item.id ? 'true' : undefined}
                  title={item.updatedAt ? t('ch.lastActivity', { t: fullTime(item.updatedAt) }) : t('ch.noActivity')}
                  onClick={() => setSelectedId(item.id)}
                >
                  <Avatar name={item.title} color={item.id.length} size={38} />
                  <span className="ch-item-body">
                    <span className="ch-item-top">
                      <span className="ch-item-title">{item.title}</span>
                      <span className="ch-item-activity">{relativeTime(item.updatedAt, now)}</span>
                    </span>
                    <span className="ch-item-topic">{item.topic || t('ch.noTopic')}</span>
                    <span className="ch-item-meta">{messageCount(item.posts)}</span>
                  </span>
                </button>
              ))
            )}
          </div>

          <footer className="ch-side-foot">
            <span>{t('ch.publicNote')}</span>
          </footer>
      </div>
      }
      actions={selectedId ? (
        <button
          type="button"
          className="icon-btn"
          title={refreshing ? t('ch.refreshing') : t('ch.refresh')}
          aria-label={t('ch.refresh')}
          onClick={() => { if (selectedId) void loadChannel(selectedId, true); }}
          disabled={refreshing}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 9a6 6 0 0110-3.5M15 9a6 6 0 01-10 3.5"/><path d="M13 3v3h-3M5 15v-3h3"/></svg>
        </button>
      ) : undefined}
      bottom={
        selectedId ? (
          <div className="ch-composer-wrap">
            {composerNotice && (
              <p
                className={`ch-composer-note ${composerNotice.kind}`}
                role={composerNotice.kind === 'error' ? 'alert' : 'status'}
              >
                {composerNotice.text}
              </p>
            )}
            <div className="ch-composer">
              <textarea
                ref={composerRef}
                value={composer}
                maxLength={MAX_TEXT}
                rows={1}
                aria-label={t('ch.placeholder')}
                placeholder={t('ch.placeholder')}
                onChange={(event) => {
                  setComposer(event.target.value);
                  if (composerNotice?.kind === 'error') setComposerNotice(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button
                type="button"
                className="icon-btn primary"
                onClick={() => void sendMessage()}
                disabled={sending || !composer.trim()}
                aria-label={sending ? t('ch.sending') : t('ch.send')}
                title={sending ? t('ch.sending') : t('ch.send')}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M2 16L17 9 2 2v5l11 2-11 2z"/></svg>
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
          {selectedId ? (
            <>
              <div className="ch-feed" ref={feedRef} onScroll={handleFeedScroll}>
                {detailError && <p className="ch-inline-error" role="status">{detailError}</p>}
                {detailLoading && messages.length === 0 && <p className="ch-empty-line">{t('ch.loadingMessages')}</p>}
                {!detailLoading && !detailError && messages.length === 0 && (
                  <p className="ch-empty-line">{t('ch.noMessages')}</p>
                )}
                {messages.map((message) => (
                  <article className="ch-msg" key={message.id}>
                    <span
                      className="ch-avatar"
                      style={{ backgroundColor: colorFor(message.name) }}
                      aria-hidden="true"
                    >
                      {initials(message.name)}
                    </span>
                    <div className="ch-msg-body">
                      <div className="ch-msg-head">
                        <strong>{message.name}</strong>
                        <time dateTime={new Date(message.ts).toISOString()} title={fullTime(message.ts)}>
                          {relativeTime(message.ts, now)}
                        </time>
                      </div>
                      <div className="ch-msg-text">{renderMarkdown(message.text)}</div>
                    </div>
                  </article>
                ))}
              </div>

              {/* composer moved to bottom via AppFrame */}
            </>
          ) : (
            <div className="ch-empty-conv">
              <span className="ch-empty-mark" aria-hidden="true">#</span>
              <h2>{t('ch.choose')}</h2>
              <p>{t('ch.select')}</p>
              <button
                type="button"
                className="ch-btn-primary"
                onClick={() => {
                  setShowCreate(true);
                  setCreateError('');
                }}
              >
                {t('ch.create')}
              </button>
            </div>
          )}
    </AppFrame>
  );
}
