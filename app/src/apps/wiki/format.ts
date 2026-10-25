const AUTHOR_KEY = 'seyra.wiki.author';

export function readAuthor(): string {
  try {
    return localStorage.getItem(AUTHOR_KEY) || 'anonyme';
  } catch {
    return 'anonyme';
  }
}

export function writeAuthor(author: string): void {
  try {
    const value = author.trim();
    if (value) localStorage.setItem(AUTHOR_KEY, value);
    else localStorage.removeItem(AUTHOR_KEY);
  } catch {
    return;
  }
}

export function displayAuthor(author: string | null | undefined): string {
  return (author || '').trim() || 'anonyme';
}

export function formatDate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'date inconnue';
  let date: Date;
  if (typeof value === 'number') {
    date = new Date(value < 1e12 ? value * 1000 : value);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
