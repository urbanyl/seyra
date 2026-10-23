import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { BOARD_COLORS, cleanStroke, type Stroke } from '../lib/board';
import { useT } from '../lib/i18n';
import { IconX } from './Icons';

const MAX_COORDS = 1000;

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
  const pts = s.pts;
  if (pts.length < 2) return;
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (pts.length === 2) {
    ctx.beginPath();
    ctx.arc(pts[0] * w, pts[1] * h, s.width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0] * w, pts[1] * h);
  for (let i = 2; i + 1 < pts.length; i += 2) {
    ctx.lineTo(pts[i] * w, pts[i + 1] * h);
  }
  ctx.stroke();
}

export default function Whiteboard({ strokes, onStroke, onClear, onClose }: {
  strokes: Stroke[];
  onStroke: (s: Stroke) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const strokesRef = useRef(strokes);
  const liveRef = useRef<Stroke | null>(null);
  const drawRef = useRef<{ id: number; pts: number[]; color: string; width: number } | null>(null);
  const [live, setLive] = useState<Stroke | null>(null);
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [width, setWidth] = useState(2);

  strokesRef.current = strokes;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h, dpr } = sizeRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const s of strokesRef.current) paintStroke(ctx, s, w, h);
    if (liveRef.current) paintStroke(ctx, liveRef.current, w, h);
  }, []);

  useEffect(() => {
    paint();
  }, [strokes, live, paint]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      sizeRef.current = { w, h, dpr };
      paint();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();
    window.addEventListener('resize', resize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [paint]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pointOf = (e: ReactPointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      clamp01((e.clientX - r.left) / Math.max(1, r.width)),
      clamp01((e.clientY - r.top) / Math.max(1, r.height)),
    ];
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const [x, y] = pointOf(e);
    drawRef.current = { id: e.pointerId, pts: [x, y], color, width };
    e.currentTarget.setPointerCapture(e.pointerId);
    const s: Stroke = { pts: [x, y], color, width };
    liveRef.current = s;
    setLive(s);
    e.preventDefault();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drawRef.current;
    if (!d || d.id !== e.pointerId || d.pts.length >= MAX_COORDS) return;
    const [x, y] = pointOf(e);
    const lastX = d.pts[d.pts.length - 2];
    const lastY = d.pts[d.pts.length - 1];
    if (Math.abs(x - lastX) + Math.abs(y - lastY) < 0.0005) return;
    d.pts.push(x, y);
    const s: Stroke = { pts: d.pts.slice(), color: d.color, width: d.width };
    liveRef.current = s;
    setLive(s);
  };

  const endStroke = (e: ReactPointerEvent<HTMLCanvasElement>, commit: boolean) => {
    const d = drawRef.current;
    if (!d || d.id !== e.pointerId) return;
    drawRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    liveRef.current = null;
    setLive(null);
    if (!commit) return;
    const cleaned = cleanStroke({ pts: d.pts, color: d.color, width: d.width });
    if (cleaned) onStroke(cleaned);
  };

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="modal"
        style={{
          maxWidth: 900,
          width: '100%',
          height: '100%',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header style={{ gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h3>{t('board.title')}</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.4, color: 'var(--muted)' }}>
              {t('board.hint')}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('board.close')}
            title={t('board.close')}
            onClick={onClose}
          >
            <IconX size={18} />
          </button>
        </header>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            padding: '0 16px 10px',
            flex: 'none',
          }}
        >
          {BOARD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`icon-btn${c === color ? ' active' : ''}`}
              aria-label={c}
              title={c}
              onClick={() => setColor(c)}
              style={{
                width: 26,
                height: 26,
                padding: 0,
                borderRadius: '50%',
                background: c,
                outline: c === color ? '2px solid var(--txt)' : '2px solid transparent',
                outlineOffset: 2,
              }}
            />
          ))}

          <span
            aria-hidden="true"
            style={{ width: 1, height: 22, margin: '0 2px', background: 'var(--line)' }}
          />

          {[2, 4].map((n) => (
            <button
              key={n}
              type="button"
              className={`btn ghost small${width === n ? ' active' : ''}`}
              aria-label={`${n}px`}
              title={`${n}px`}
              onClick={() => setWidth(n)}
              style={{
                minHeight: 34,
                height: 34,
                padding: '0 12px',
                ...(width === n ? { background: 'var(--field)', color: 'var(--txt)' } : null),
              }}
            >
              {n}
            </button>
          ))}

          <span style={{ flex: 1 }} />

          <button
            type="button"
            className="btn ghost small"
            aria-label={t('board.clear')}
            title={t('board.clear')}
            onClick={onClear}
            style={{ minHeight: 34, height: 34 }}
          >
            {t('board.clear')}
          </button>
        </div>

        <div
          ref={wrapRef}
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 160,
            margin: '0 12px 12px',
            overflow: 'hidden',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
          }}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={t('board.title')}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endStroke(e, true)}
            onPointerCancel={(e) => endStroke(e, false)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'block',
              touchAction: 'none',
              cursor: 'crosshair',
            }}
          />
        </div>
      </div>
    </div>
  );
}
