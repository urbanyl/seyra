import type { FileMeta } from '../lib/types';
import { formatSize } from '../lib/files';
import { IconDownload, IconFile, IconVideoFile } from './Icons';

type Props = {
  meta: FileMeta;
  url?: string;
  progress?: number;
  onOpen: (url: string, name: string) => void;
};

export default function FileBubble({ meta, url, progress, onOpen }: Props) {
  if (!url) {
    const pct = Math.max(0, Math.min(100, Math.round((progress || 0) * 100)));
    return (
      <div className="file-pending">
        <div className="file-row">
          {meta.kind === 'video' ? <IconVideoFile size={20} /> : meta.kind === 'image' ? <IconFile size={20} /> : <IconFile size={20} />}
          <span className="file-name">{meta.name}</span>
        </div>
        <div className="file-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="file-pct">{pct}% · {formatSize(meta.size)}</span>
      </div>
    );
  }

  if (meta.kind === 'image') {
    return (
      <button type="button" className="file-img-btn" onClick={() => onOpen(url, meta.name)} title="Agrandir">
        <img className="file-img" src={url} alt={meta.name} loading="lazy" draggable={false} />
      </button>
    );
  }

  if (meta.kind === 'video') {
    return (
      <div className="file-video-wrap">
        <video className="file-video" src={url} controls playsInline preload="metadata" />
      </div>
    );
  }

  return (
    <a className="file-card" href={url} download={meta.name} title="Télécharger">
      <span className="file-icon"><IconFile size={22} /></span>
      <span className="file-info">
        <b>{meta.name}</b>
        <em>{formatSize(meta.size)}</em>
      </span>
      <span className="file-dl"><IconDownload size={18} /></span>
    </a>
  );
}
