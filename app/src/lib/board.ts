export type Stroke = { pts: number[]; color: string; width: number };

export type BoardOp = { op: 'stroke'; stroke: Stroke } | { op: 'clear' };

export const BOARD_COLORS = ['#00b2ff', '#4ade80', '#ffd166', '#f15c6d', '#c084fc', '#f8fafc'];

const MAX_POINTS = 500;
const MIN_WIDTH = 1;
const MAX_WIDTH = 6;
const DEFAULT_WIDTH = 2;

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function cleanStroke(input: unknown): Stroke | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as { pts?: unknown; color?: unknown; width?: unknown };
  if (!Array.isArray(raw.pts)) return null;

  const pts: number[] = [];
  const limit = Math.min(raw.pts.length, MAX_POINTS * 2);
  for (let i = 0; i + 1 < limit; i += 2) {
    const x = raw.pts[i];
    const y = raw.pts[i + 1];
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    pts.push(clamp01(x), clamp01(y));
  }
  if (pts.length < 4) return null;

  const color = typeof raw.color === 'string' && BOARD_COLORS.includes(raw.color)
    ? raw.color
    : BOARD_COLORS[0];
  const width = typeof raw.width === 'number' && Number.isFinite(raw.width)
    ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, raw.width))
    : DEFAULT_WIDTH;

  return { pts, color, width };
}

export function parseBoardOp(raw: unknown): BoardOp | null {
  if (!raw || typeof raw !== 'object') return null;
  const op = (raw as { op?: unknown }).op;
  if (op === 'clear') return { op: 'clear' };
  if (op === 'stroke') {
    const stroke = cleanStroke((raw as { stroke?: unknown }).stroke);
    return stroke ? { op: 'stroke', stroke } : null;
  }
  return null;
}
