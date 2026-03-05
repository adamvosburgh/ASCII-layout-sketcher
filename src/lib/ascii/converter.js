/**
 * ASCII Converter
 *
 * Converts shapes (grid-cell coordinates) to an ASCII diagram.
 *
 * Strategy:
 *   1. Find bounding box of all shapes.
 *   2. Scale so the output is at most MAX_COLS wide.
 *      (Monospace chars are ~2x taller than wide, so we stretch
 *       columns by CHAR_ASPECT=2 to preserve visual proportions.)
 *   3. Rasterize each shape onto a char grid.
 *   4. Write labels centered in each shape (scale permitting).
 *   5. Trim trailing whitespace and empty leading/trailing rows.
 */

const MAX_COLS = 78;   // leave 1 char margin each side → fits 80-char terminals
// Monospace chars are ~2x taller than wide. To preserve visual proportions we
// stretch the ASCII output HORIZONTALLY by this factor (rather than vertically),
// so a square grid shape renders as a visual square in the output panel.
const CHAR_ASPECT = 2;

// chart defaults (grid cells) — must match Canvas.svelte
const CHART_CELL_W = 8;
const CHART_CELL_H = 4; // tall enough for interior rows after horizontal stretch

export function convertToAscii(shapes) {
  if (!shapes || shapes.length === 0) return '';
  const drawableShapes = shapes.filter(s => s.type !== 'text' || !!s.label);
  if (drawableShapes.length === 0) return '';

  // ── 1. bounding box in grid cells ────────────────────────
  let minC = Infinity, minR = Infinity, maxC = -Infinity, maxR = -Infinity;
  const textSpanCols = (text) => Math.max(1, Math.ceil((text?.length || 1) / CHAR_ASPECT));
  for (const s of drawableShapes) {
    const spanCols = s.type === 'text' ? textSpanCols(s.label) : s.cols;
    const spanRows = s.type === 'text' ? 1 : s.rows;
    minC = Math.min(minC, s.col);
    minR = Math.min(minR, s.row);
    maxC = Math.max(maxC, s.col + spanCols);
    maxR = Math.max(maxR, s.row + spanRows);
  }
  const gridW = maxC - minC;   // width in grid cells
  const gridH = maxR - minR;   // height in grid cells

  // ── 2. compute output dimensions ─────────────────────────
  // Apply CHAR_ASPECT horizontally: each grid col → CHAR_ASPECT ASCII cols,
  // each grid row → 1 ASCII row. Scale down uniformly if width exceeds MAX_COLS.
  const rawAsciiW = gridW * CHAR_ASPECT;
  const scale = rawAsciiW > MAX_COLS ? MAX_COLS / rawAsciiW : 1;

  const asciiW = Math.round(gridW * CHAR_ASPECT * scale);
  const asciiH = Math.round(gridH * scale);

  // grid-cell → ascii-cell transforms
  function toAX(col) { return Math.round((col - minC) * CHAR_ASPECT * scale); }
  function toAY(row) { return Math.round((row - minR) * scale); }
  function toAW(cols) { return Math.max(1, Math.round(cols * CHAR_ASPECT * scale)); }
  function toAH(rows) { return Math.max(1, Math.round(rows * scale)); }

  // ── 3. allocate char grid ─────────────────────────────────
  const grid = Array.from({ length: asciiH + 1 }, () => Array(asciiW + 1).fill(' '));

  function setChar(r, c, ch) {
    if (r >= 0 && r < grid.length && c >= 0 && c < (grid[0]?.length ?? 0)) {
      grid[r][c] = ch;
    }
  }

  function getChar(r, c) {
    if (r >= 0 && r < grid.length && c >= 0 && c < (grid[0]?.length ?? 0)) {
      return grid[r][c];
    }
    return ' ';
  }

  // ── 4. draw each shape ────────────────────────────────────
  for (const s of drawableShapes) {
    const ax = toAX(s.col);
    const ay = toAY(s.row);
    const aw = toAW(s.cols);
    const ah = toAH(s.rows);

    switch (s.type) {
      case 'text':
        writeFreeText(s.label, ax, ay);
        break;
      case 'rect':
      case 'square':
        drawRect(ax, ay, aw, ah);
        break;
      case 'circle':
        drawEllipse(ax, ay, aw, ah, true);
        break;
      case 'ellipse':
        drawEllipse(ax, ay, aw, ah, false);
        break;
      case 'triangle':
        drawTriangle(ax, ay, aw, ah);
        break;
      case 'arc':
        drawArc(ax, ay, aw, ah);
        break;
      case 'chart':
        drawChart(s, ax, ay, aw, ah);
        break;
    }

    // write label (centered)
    if (s.label && s.type !== 'text') {
      writeLabel(s.label, ax, ay, aw, ah);
    }
  }

  // ── 5. serialise ─────────────────────────────────────────
  const lines = grid.map(row => row.join('').trimEnd());
  // trim leading blank lines
  let start = 0;
  while (start < lines.length && lines[start].trim() === '') start++;
  let end = lines.length - 1;
  while (end > start && lines[end].trim() === '') end--;

  return lines.slice(start, end + 1).join('\n');

  // ── shape drawers ─────────────────────────────────────────

  function drawRect(x, y, w, h) {
    // corners
    setChar(y,     x,     '+');
    setChar(y,     x+w-1, '+');
    setChar(y+h-1, x,     '+');
    setChar(y+h-1, x+w-1, '+');
    // top/bottom edges
    for (let c = x+1; c < x+w-1; c++) {
      setChar(y,     c, '-');
      setChar(y+h-1, c, '-');
    }
    // left/right edges
    for (let r = y+1; r < y+h-1; r++) {
      setChar(r, x,     '|');
      setChar(r, x+w-1, '|');
    }
  }

  function drawEllipse(x, y, w, h, isCircle) {
    // Midpoint ellipse scan — only outer border
    const cx = x + (w - 1) / 2;
    const cy = y + (h - 1) / 2;
    const rx = (w - 1) / 2;
    const ry = (h - 1) / 2;

    if (rx < 1 || ry < 1) { drawRect(x, y, w, h); return; }

    // sample points around the ellipse
    const steps = Math.max(60, (w + h) * 4);
    for (let i = 0; i < steps; i++) {
      const theta = (2 * Math.PI * i) / steps;
      const px = Math.round(cx + rx * Math.cos(theta));
      const py = Math.round(cy + ry * Math.sin(theta));
      // choose char based on slope
      const dx = -rx * Math.sin(theta);
      const dy = ry * Math.cos(theta);
      let ch;
      const ratio = Math.abs(dy / (dx || 0.0001));
      if (ratio < 0.5) ch = '-';
      else if (ratio > 2) ch = '|';
      else if (dx * dy > 0) ch = '\\';
      else ch = '/';
      setChar(py, px, ch);
    }
  }

  function drawTriangle(x, y, w, h) {
    const apex = { r: y, c: Math.round(x + (w - 1) / 2) };
    const bl   = { r: y + h - 1, c: x };
    const br   = { r: y + h - 1, c: x + w - 1 };

    // baseline
    for (let c = bl.c; c <= br.c; c++) setChar(bl.r, c, '-');

    // left edge: apex → bl
    bresenham(apex.r, apex.c, bl.r, bl.c, (r, c, slope) => {
      setChar(r, c, Math.abs(slope) > 1.5 ? '|' : '/');
    });

    // right edge: apex → br
    bresenham(apex.r, apex.c, br.r, br.c, (r, c, slope) => {
      setChar(r, c, Math.abs(slope) > 1.5 ? '|' : '\\');
    });

    // corners
    setChar(apex.r, apex.c, '^');
    setChar(bl.r,   bl.c,   '+');
    setChar(br.r,   br.c,   '+');
  }

  function drawArc(x, y, w, h) {
    // Top-half arc (opening downward = cup / "U" shape)
    const cx = x + (w - 1) / 2;
    const cy = y + (h - 1) / 2;
    const rx = (w - 1) / 2;
    const ry = (h - 1) / 2;

    if (rx < 1 || ry < 1) return;

    const steps = Math.max(40, (w + h) * 2);
    for (let i = 0; i <= steps; i++) {
      const theta = Math.PI + (Math.PI * i / steps); // π to 2π (bottom half)
      const px = Math.round(cx + rx * Math.cos(theta));
      const py = Math.round(cy + ry * Math.sin(theta));
      const dx = -rx * Math.sin(theta);
      const dy = ry * Math.cos(theta);
      let ch;
      const ratio = Math.abs(dy / (dx || 0.0001));
      if (ratio < 0.5) ch = '_';
      else if (ratio > 2) ch = '|';
      else if (dx * dy > 0) ch = '\\';
      else ch = '/';
      setChar(py, px, ch);
    }
  }

  function drawChart(s, ax, ay, aw, ah) {
    // outer border
    drawRect(ax, ay, aw, ah);
    // derive cell dims from final ASCII dimensions — correct regardless of scale/aspect
    const cellW = Math.round(aw / s.numCellsX);
    const cellH = Math.round(ah / s.numCellsY);

    for (let cx = 1; cx < s.numCellsX; cx++) {
      const lx = ax + cx * cellW;
      for (let r = ay + 1; r < ay + ah - 1; r++) {
        const cur = getChar(r, lx);
        setChar(r, lx, cur === '-' ? '+' : '|');
      }
      setChar(ay,      lx, '+');
      setChar(ay+ah-1, lx, '+');
    }
    for (let cy = 1; cy < s.numCellsY; cy++) {
      const ly = ay + cy * cellH;
      for (let c = ax + 1; c < ax + aw - 1; c++) {
        const cur = getChar(ly, c);
        setChar(ly, c, cur === '|' ? '+' : '-');
      }
      setChar(ly, ax,      '+');
      setChar(ly, ax+aw-1, '+');
    }

    // cell labels
    if (s.cellLabels) {
      for (let cy = 0; cy < s.numCellsY; cy++) {
        for (let cx = 0; cx < s.numCellsX; cx++) {
          const lbl = s.cellLabels[cy]?.[cx];
          if (lbl) {
            const cx0 = ax + cx * cellW;
            const cy0 = ay + cy * cellH;
            writeLabel(lbl, cx0, cy0, cellW, cellH);
          }
        }
      }
    }
  }

  function writeLabel(label, x, y, w, h) {
    if (!label) return;
    const midR = Math.round(y + h / 2);
    const midC = Math.round(x + w / 2);
    const half = Math.floor(label.length / 2);
    const startC = Math.max(x + 1, midC - half);
    for (let i = 0; i < label.length; i++) {
      const c = startC + i;
      if (c >= x + w - 1) break;
      setChar(midR, c, label[i]);
    }
  }

  function writeFreeText(label, x, y) {
    if (!label) return;
    for (let i = 0; i < label.length; i++) {
      setChar(y, x + i, label[i]);
    }
  }

  // Bresenham line iterator
  function bresenham(r0, c0, r1, c1, cb) {
    let dr = Math.abs(r1 - r0), dc = Math.abs(c1 - c0);
    let sr = r0 < r1 ? 1 : -1, sc = c0 < c1 ? 1 : -1;
    let err = dr - dc;
    let r = r0, c = c0;
    while (true) {
      const slope = dc === 0 ? Infinity : dr / dc;
      cb(r, c, slope);
      if (r === r1 && c === c1) break;
      const e2 = 2 * err;
      if (e2 > -dc) { err -= dc; r += sr; }
      if (e2 <  dr) { err += dr; c += sc; }
    }
  }
}
