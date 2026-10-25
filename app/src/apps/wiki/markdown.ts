export type WikiHeading = {
  level: number;
  text: string;
  id: string;
};

export type RenderResult = {
  html: string;
  headings: WikiHeading[];
};

const TOKEN_START = '\u0000';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function baseHeadingId(value: string): string {
  return slugify(value) || 'section';
}

function uniqueHeadingId(value: string, used: Map<string, number>): string {
  const base = baseHeadingId(value);
  const count = used.get(base) || 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function headingText(value: string): string {
  return value
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .trim();
}

function safeUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^(javascript|data|vbscript|file):/i.test(url)) return null;
  if (/^(https?:\/\/|mailto:|\/|#|\.{1,2}\/|\?)/i.test(url)) return url;
  if (!url.includes(':') && /^[a-z0-9._~:/?#[\]@!$&'()*+,;=%\-\u00c0-\uffff]+$/i.test(url)) return url;
  return null;
}

function inline(raw: string): string {
  const slots: string[] = [];

  const hold = (html: string): string => {
    const token = `${TOKEN_START}${slots.length}${TOKEN_START}`;
    slots.push(html);
    return token;
  };

  let text = raw;

  text = text.replace(/`([^`\n]+)`/g, (_match, code: string) => hold(`<code>${escapeHtml(code)}</code>`));

  text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, rawSlug: string, rawLabel: string | undefined) => {
    const slug = rawSlug.trim();
    if (!slug) return match;
    const label = (rawLabel ?? slug).trim() || slug;
    const href = `/wiki/${encodeURIComponent(slug).replace(/%2F/gi, '/')}`;
    return hold(`<a class="wiki-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`);
  });

  text = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, rawLabel: string, rawHref: string) => {
    const href = safeUrl(rawHref);
    if (!href) return match;
    const external = /^(https?:)?\/\//i.test(href) || /^mailto:/i.test(href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
    return hold(`<a href="${escapeHtml(href)}"${attrs}>${escapeHtml(rawLabel)}</a>`);
  });

  text = escapeHtml(text);

  text = text
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_([^_\n]+)_(?![_\w])/g, '$1<em>$2</em>');

  text = text.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => slots[Number(index)] ?? '');

  return text;
}

function isHr(line: string): boolean {
  return /^ {0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(line);
}

type ListItem = {
  indent: number;
  ordered: boolean;
  text: string;
};

function renderList(items: ListItem[]): string {
  if (!items.length) return '';
  const chunks: string[] = [];
  const stack: Array<{ indent: number; tag: 'ul' | 'ol' }> = [];

  for (const item of items) {
    const tag = item.ordered ? 'ol' : 'ul';
    if (!stack.length) {
      stack.push({ indent: item.indent, tag });
      chunks.push(`<${tag}>`);
    } else {
      while (stack.length > 1 && item.indent < stack[stack.length - 1].indent) {
        const closed = stack.pop();
        if (closed) chunks.push(`</li></${closed.tag}>`);
      }
      const top = stack[stack.length - 1];
      if (item.indent > top.indent) {
        stack.push({ indent: item.indent, tag });
        chunks.push(`<${tag}>`);
      } else if (tag !== top.tag) {
        stack.pop();
        chunks.push(`</li></${top.tag}>`);
        stack.push({ indent: item.indent, tag });
        chunks.push(`<${tag}>`);
      } else {
        chunks.push('</li>');
      }
    }
    chunks.push(`<li>${inline(item.text)}`);
  }

  while (stack.length) {
    const closed = stack.pop();
    if (closed) chunks.push(`</li></${closed.tag}>`);
  }

  return chunks.join('');
}

export function renderMarkdown(source: string): RenderResult {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  const headings: WikiHeading[] = [];
  const usedHeadingIds = new Map<string, number>();
  const usedListLines = new Set<number>();
  let paragraph: string[] = [];
  let i = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      flushParagraph();
      i += 1;
      continue;
    }

    const fence = /^\s*(```|~~~)\s*([^\s`]*)\s*$/.exec(line);
    if (fence) {
      flushParagraph();
      const marker = fence[1];
      const language = fence[2];
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !new RegExp(`^\\s*${marker}\\s*$`).test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      const languageClass = /^[a-z0-9+#._-]+$/i.test(language) ? ` class="language-${language}"` : '';
      html.push(`<pre><code${languageClass}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const rawText = heading[2].trim();
      const text = headingText(rawText);
      const id = uniqueHeadingId(text || rawText, usedHeadingIds);
      headings.push({ level, text: text || rawText, id });
      html.push(`<h${level} id="${escapeHtml(id)}">${inline(rawText)}</h${level}>`);
      i += 1;
      continue;
    }

    if (isHr(line)) {
      flushParagraph();
      html.push('<hr>');
      i += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      flushParagraph();
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      const body = quoted
        .join('\n')
        .split(/\n{2,}/)
        .map((part) => `<p>${inline(part.replace(/\n/g, ' '))}</p>`)
        .join('');
      html.push(`<blockquote>${body}</blockquote>`);
      continue;
    }

    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      flushParagraph();
      const items: ListItem[] = [];
      while (i < lines.length && !usedListLines.has(i)) {
        const current = lines[i];
        const item = /^(\s*)([-*+]|\d+[.)])\s+(.+)$/.exec(current);
        if (item) {
          usedListLines.add(i);
          items.push({
            indent: item[1].replace(/\t/g, '  ').length,
            ordered: /^\d/.test(item[2]),
            text: item[3],
          });
          i += 1;
          continue;
        }
        if (items.length && /^\s+\S/.test(current)) {
          items[items.length - 1].text += ` ${current.trim()}`;
          usedListLines.add(i);
          i += 1;
          continue;
        }
        break;
      }
      html.push(renderList(items));
      continue;
    }

    paragraph.push(line.trim());
    i += 1;
  }

  flushParagraph();

  return { html: html.join('\n'), headings };
}
