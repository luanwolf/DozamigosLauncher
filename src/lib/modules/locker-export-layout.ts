const CELL = 132;
const GAP = 8;
const PAD = 24;
const MAX_COLS = 36;
const HEADER = 120;
const FOOTER = 56;

export const LOCKER_EXPORT_CELL = CELL;
export const LOCKER_EXPORT_GAP = GAP;
export const LOCKER_EXPORT_PAD = PAD;
export const LOCKER_EXPORT_HEADER = HEADER;
export const LOCKER_EXPORT_FOOTER = FOOTER;

/** 2× CSS px — sharp on screen, ~2.4× fewer pixels to encode than 300 DPI. */
export const EXPORT_SCALE = 2;

export function gridWidth(cols: number): number {
  return PAD * 2 + cols * CELL + Math.max(0, cols - 1) * GAP;
}

export function gridHeight(rows: number): number {
  return HEADER + FOOTER + PAD * 2 + rows * CELL + Math.max(0, rows - 1) * GAP;
}

/**
 * Columns that bring the finished collage closest to square, which is the
 * easiest shape to open and scroll. Capped at 40 columns so huge categories
 * (emotes, wraps) don't produce a canvas the encoder can't handle.
 */
export function gridColumns(count: number): number {
  if (count <= 0) return 1;

  let best = 1;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let cols = 1; cols <= Math.min(count, MAX_COLS); cols++) {
    const diff = Math.abs(gridWidth(cols) - gridHeight(Math.ceil(count / cols)));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = cols;
    }
  }

  return best;
}

export function gridPixelSize(count: number): {
  width: number;
  height: number;
  cols: number;
  rows: number;
} {
  const cols = gridColumns(count);
  const rows = Math.max(1, Math.ceil(Math.max(count, 1) / cols));
  return {
    cols,
    rows,
    width: gridWidth(cols),
    height: gridHeight(rows)
  };
}
