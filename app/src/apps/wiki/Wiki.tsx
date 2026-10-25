import './wiki.css';
import WikiArticle from './WikiArticle';
import WikiEditor from './WikiEditor';
import WikiIndex from './WikiIndex';

export default function Wiki() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/wiki/nouveau') return <WikiEditor />;

  const match = /^\/wiki\/(.+)$/.exec(path);
  if (match) {
    let slug = match[1];
    try {
      slug = decodeURIComponent(slug);
    } catch {
      slug = match[1];
    }
    return <WikiArticle slug={slug} />;
  }

  return <WikiIndex />;
}
