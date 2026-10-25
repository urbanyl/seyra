const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ESCAPE[char] ?? char);

const inline = (raw: string): string => {
  const tokens: string[] = [];
  const stash = (html: string) => {
    tokens.push(html);
    return `\u0000${tokens.length - 1}\u0000`;
  };

  let text = raw;
  text = text.replace(/`([^`\n]+)`/g, (_match, code: string) => stash(`<code>${code}</code>`));
  text = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
    const safe = /^(https?:\/\/|mailto:)/i.test(href) ? href : '#';
    return stash(
      `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`,
    );
  });

  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  text = text.replace(/(^|[^_\w])_([^_\n]+)_/g, '$1<em>$2</em>');
  text = text.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => tokens[Number(index)] ?? '');

  return text;
};

const isBreak = (line: string) =>
  /^```/.test(line) ||
  /^#{1,3}\s+/.test(line) ||
  /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim()) ||
  /^&gt;\s?/.test(line) ||
  /^\s*[-*+]\s+/.test(line) ||
  /^\s*\d+[.)]\s+/.test(line);

export function renderMarkdown(source: string): string {
  const escaped = escapeHtml(source.replace(/\r\n?/g, '\n'));
  const lines = escaped.split('\n');
  const out: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```\s*([\w+-]*)\s*$/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const lang = fence[1] ? ` class="language-${fence[1]}"` : '';
      out.push(`<pre><code${lang}>${code.join('\n')}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      out.push('<hr />');
      index += 1;
      continue;
    }

    if (/^&gt;\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^&gt;\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^&gt;\s?/, ''));
        index += 1;
      }
      out.push(
        `<blockquote>${quote.map((entry) => `<p>${inline(entry)}</p>`).join('')}</blockquote>`,
      );
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        items.push(`<li>${inline(lines[index].replace(/^\s*[-*+]\s+/, ''))}</li>`);
        index += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(`<li>${inline(lines[index].replace(/^\s*\d+[.)]\s+/, ''))}</li>`);
        index += 1;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !isBreak(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    if (!paragraph.length) {
      paragraph.push(lines[index]);
      index += 1;
    }
    out.push(`<p>${paragraph.map(inline).join('<br />')}</p>`);
  }

  return out.join('\n');
}
