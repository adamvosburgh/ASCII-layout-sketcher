<script>
  import { createEventDispatcher, onMount } from 'svelte';

  function focusOnMount(node) { node.focus(); }

  export let shapes = [];
  export let selectedTool = 'rect';

  const dispatch = createEventDispatcher();

  // ── constants ──────────────────────────────────────────────
  const G = 12;           // grid cell size in px

  // chart defaults (grid cells)
  const CHART_CELL_W = 8;
  const CHART_CELL_H = 4;

  // ── state ──────────────────────────────────────────────────
  let container;
  let canvas;
  let ctx;
  let W = 0;              // canvas pixel width (dynamic)
  let H = 0;              // canvas pixel height (dynamic)
  let dragging = false;
  let startCell = null;   // { col, row }
  let currentCell = null; // { col, row }
  let editingId = null;   // shape id being labeled
  let labelInput = '';
  let labelPos = { x: 0, y: 0 };

  // ── move state ─────────────────────────────────────────────
  let movingId = null;
  let moveOffset = null;  // { dcol, drow } from shape origin to mouse cell
  let hoverEdge = false;  // true when hovering over a shape edge (draw tools)

  $: cursorStyle = movingId ? 'grabbing'
      : hoverEdge ? 'grab'
      : 'crosshair';

  // ── undo/redo history ──────────────────────────────────────
  let history = [[]];  // stack of shapes snapshots
  let histIdx = 0;     // current position in history

  function pushHistory(newShapes) {
    // discard any redo states ahead of current
    history = history.slice(0, histIdx + 1);
    history.push(newShapes.map(s => ({ ...s })));
    histIdx = history.length - 1;
  }

  export function undo() {
    if (histIdx <= 0) return;
    histIdx--;
    shapes = history[histIdx].map(s => ({ ...s }));
    dispatch('change', shapes);
    draw();
  }

  export function redo() {
    if (histIdx >= history.length - 1) return;
    histIdx++;
    shapes = history[histIdx].map(s => ({ ...s }));
    dispatch('change', shapes);
    draw();
  }

  export function clearCanvas() {
    shapes = [];
    pushHistory(shapes);
    dispatch('change', shapes);
    draw();
  }

  // ── helpers ────────────────────────────────────────────────
  function snap(px) { return Math.floor(px / G); }

  function cellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { col: snap(x), row: snap(y) };
  }

  function normalizeRect(a, b) {
    return {
      col: Math.min(a.col, b.col),
      row: Math.min(a.row, b.row),
      cols: Math.max(1, Math.abs(b.col - a.col)),
      rows: Math.max(1, Math.abs(b.row - a.row))
    };
  }

  function chartDims(a, b) {
    // Snap width/height to nearest chart cell multiple
    const rawCols = Math.max(CHART_CELL_W, Math.abs(b.col - a.col));
    const rawRows = Math.max(CHART_CELL_H, Math.abs(b.row - a.row));
    const numCellsX = Math.max(1, Math.round(rawCols / CHART_CELL_W));
    const numCellsY = Math.max(1, Math.round(rawRows / CHART_CELL_H));
    return {
      col: Math.min(a.col, b.col),
      row: Math.min(a.row, b.row),
      cols: numCellsX * CHART_CELL_W,
      rows: numCellsY * CHART_CELL_H,
      numCellsX,
      numCellsY
    };
  }

  function newId() {
    return Math.random().toString(36).slice(2, 9);
  }

  function findShapeAt(cell) {
    return [...shapes].reverse().find(s =>
      cell.col >= s.col && cell.col < s.col + s.cols &&
      cell.row >= s.row && cell.row < s.row + s.rows
    );
  }

  function isOnShapeEdge(s, cell) {
    const onBorderCol = cell.col === s.col || cell.col === s.col + s.cols - 1;
    const onBorderRow = cell.row === s.row || cell.row === s.row + s.rows - 1;
    const inColRange = cell.col >= s.col && cell.col < s.col + s.cols;
    const inRowRange = cell.row >= s.row && cell.row < s.row + s.rows;
    return (onBorderCol && inRowRange) || (onBorderRow && inColRange);
  }

  function labelWidth(label) {
    return Math.max(1, label.length);
  }

  function setLabelInputPos(cell) {
    const rect = canvas.getBoundingClientRect();
    labelPos = {
      x: cell.col * G + rect.left + 2,
      y: cell.row * G + rect.top + 2
    };
  }

  function startEditingText(shape) {
    editingId = shape.id;
    labelInput = shape.label || '';
    setLabelInputPos({ col: shape.col, row: shape.row });
  }

  function addTextLabel(cell) {
    const textShape = {
      id: newId(),
      type: 'text',
      col: cell.col,
      row: cell.row,
      cols: 1,
      rows: 1,
      label: ''
    };
    shapes = [...shapes, textShape];
    editingId = textShape.id;
    labelInput = '';
    setLabelInputPos(cell);
    draw();
  }

  // ── draw ───────────────────────────────────────────────────
  function draw() {
    if (!ctx || W === 0 || H === 0) return;
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    shapes.forEach(s => drawShape(s));
    if (dragging && startCell && currentCell) drawGhost();
  }

  function drawGrid() {
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 0.5;
    for (let c = 0; c * G <= W; c++) {
      ctx.beginPath();
      ctx.moveTo(c * G, 0);
      ctx.lineTo(c * G, H);
      ctx.stroke();
    }
    for (let r = 0; r * G <= H; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * G);
      ctx.lineTo(W, r * G);
      ctx.stroke();
    }
  }

  function drawShape(s, ghost = false) {
    ctx.save();
    ctx.strokeStyle = ghost ? 'rgba(160,82,45,0.4)' : 'rgb(160,82,45)';
    ctx.fillStyle = ghost ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = ghost ? 1 : 1.5;

    const x = s.col * G;
    const y = s.row * G;
    const w = s.cols * G;
    const h = s.rows * G;

    if (s.type === 'text') {
      if (s.label && !ghost) {
        ctx.fillStyle = 'rgb(0,0,255)';
        ctx.font = `${Math.max(9, G - 2)}px 'Roboto Mono', monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(s.label, x + 1, y + 1);
      }
      ctx.restore();
      return;
    } else if (s.type === 'rect' || s.type === 'square') {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.stroke();
    } else if (s.type === 'circle' || s.type === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (s.type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (s.type === 'arc') {
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, Math.PI, 0, false);
      ctx.stroke();
    } else if (s.type === 'chart') {
      // outer border
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.stroke();
      // inner grid lines
      ctx.strokeStyle = ghost ? 'rgba(160,82,45,0.25)' : 'rgba(160,82,45,0.5)';
      ctx.lineWidth = 0.75;
      for (let cx = 1; cx < s.numCellsX; cx++) {
        const lx = x + cx * CHART_CELL_W * G;
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(lx, y + h);
        ctx.stroke();
      }
      for (let cy = 1; cy < s.numCellsY; cy++) {
        const ly = y + cy * CHART_CELL_H * G;
        ctx.beginPath();
        ctx.moveTo(x, ly);
        ctx.lineTo(x + w, ly);
        ctx.stroke();
      }
    }

    // label
    if (s.label && !ghost) {
      ctx.fillStyle = 'rgb(0,0,255)';
      ctx.font = `${Math.max(9, G - 2)}px 'Roboto Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label, x + w / 2, y + h / 2, w - 4);
    }

    ctx.restore();
  }

  function drawGhost() {
    const base = { label: '' };
    if (selectedTool === 'chart') {
      const d = chartDims(startCell, currentCell);
      drawShape({ ...base, type: 'chart', ...d }, true);
      // show cell count
      ctx.save();
      ctx.fillStyle = 'rgb(160,82,45)';
      ctx.font = `10px 'Roboto Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(
        `${d.numCellsX}x${d.numCellsY}`,
        d.col * G + 3,
        d.row * G - 4
      );
      ctx.restore();
    } else {
      const r = normalizeRect(startCell, currentCell);
      drawShape({ ...base, type: selectedTool, ...r }, true);
    }
  }

  // ── mouse events ───────────────────────────────────────────
  function onMouseDown(e) {
    if (e.button !== 0) return;
    if (editingId !== null) { commitLabel(); return; }

    const cell = cellFromEvent(e);

    // Edge grab → move, regardless of active shape tool
    const hit = findShapeAt(cell);
    if (hit && isOnShapeEdge(hit, cell)) {
      movingId = hit.id;
      moveOffset = { dcol: cell.col - hit.col, drow: cell.row - hit.row };
      hoverEdge = false;
      return;
    }

    dragging = true;
    startCell = cell;
    currentCell = cell;
    draw();
  }

  function onMouseMove(e) {
    if (movingId !== null) {
      const cell = cellFromEvent(e);
      shapes = shapes.map(s => s.id === movingId
        ? { ...s, col: cell.col - moveOffset.dcol, row: cell.row - moveOffset.drow }
        : s
      );
      draw();
      return;
    }
    if (dragging) {
      currentCell = cellFromEvent(e);
      draw();
      return;
    }
    // Hover — update cursor state
    const cell = cellFromEvent(e);
    const hit = findShapeAt(cell);
    hoverEdge = hit ? isOnShapeEdge(hit, cell) : false;
  }

  function onDblClick(e) {
    e.preventDefault();
    const cell = cellFromEvent(e);
    const hit = findShapeAt(cell);
    if (hit) startEditingText(hit);
    else addTextLabel(cell);
  }

  function onMouseUp(e) {
    if (movingId !== null) {
      movingId = null;
      moveOffset = null;
      pushHistory(shapes);
      dispatch('change', shapes);
      draw();
      return;
    }

    if (!dragging) return;
    dragging = false;
    const end = cellFromEvent(e);

    // No movement = pure click, don't create a shape
    if (end.col === startCell.col && end.row === startCell.row) {
      startCell = null; currentCell = null; draw(); return;
    }

    let shape;
    if (selectedTool === 'chart') {
      const d = chartDims(startCell, end);
      shape = { id: newId(), type: 'chart', ...d, label: '' };
    } else {
      const r = normalizeRect(startCell, end);
      shape = { id: newId(), type: selectedTool, ...r, label: '' };
    }

    shapes = [...shapes, shape];
    pushHistory(shapes);
    dispatch('change', shapes);

    startCell = null;
    currentCell = null;
    draw();
  }

  function onContextMenu(e) {
    e.preventDefault();
    // right-click to remove a shape
    const cell = cellFromEvent(e);
    const hit = [...shapes].reverse().find(s =>
      cell.col >= s.col && cell.col < s.col + s.cols &&
      cell.row >= s.row && cell.row < s.row + s.rows
    );
    if (hit) {
      shapes = shapes.filter(s => s.id !== hit.id);
      pushHistory(shapes);
      dispatch('change', shapes);
      draw();
    }
  }

  function commitLabel() {
    if (editingId === null) return;
    const nextLabel = labelInput.trim();
    shapes = shapes.flatMap(s => {
      if (s.id !== editingId) return [s];
      if (s.type === 'text') {
        if (!nextLabel) return [];
        return [{ ...s, label: nextLabel, cols: labelWidth(nextLabel), rows: 1 }];
      }
      return [{ ...s, label: nextLabel }];
    });
    pushHistory(shapes);
    dispatch('change', shapes);
    editingId = null;
    draw();
  }

  function onLabelKeyDown(e) {
    if (e.key === 'Enter') { commitLabel(); e.preventDefault(); }
    if (e.key === 'Escape') {
      const editingShape = shapes.find(s => s.id === editingId);
      if (editingShape?.type === 'text' && !editingShape.label) {
        shapes = shapes.filter(s => s.id !== editingId);
      }
      editingId = null;
      draw();
      e.preventDefault();
    }
  }

  // ── keyboard shortcuts ─────────────────────────────────────
  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  }

  // ── lifecycle ──────────────────────────────────────────────
  onMount(() => {
    ctx = canvas.getContext('2d');

    const ro = new ResizeObserver(([entry]) => {
      W = Math.round(entry.contentRect.width);
      H = Math.round(entry.contentRect.height);
      canvas.width = W;
      canvas.height = H;
      draw();
    });
    ro.observe(container);

    window.addEventListener('keydown', onKeyDown);
    return () => {
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
    };
  });

  $: if (ctx) draw(); // redraw when shapes or tool changes
</script>

<div class="canvas-outer" bind:this={container}>
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <canvas
    bind:this={canvas}
    style="cursor: {cursorStyle}"
    on:mousedown={onMouseDown}
    on:dblclick={onDblClick}
    on:mousemove={onMouseMove}
    on:mouseup={onMouseUp}
    on:contextmenu={onContextMenu}
    aria-label="Drawing canvas"
  />
</div>

{#if editingId !== null}
  <!-- floating label input -->
  <input
    class="label-input"
    style="left:{labelPos.x}px; top:{labelPos.y}px;"
    bind:value={labelInput}
    on:keydown={onLabelKeyDown}
    on:blur={commitLabel}
    placeholder="label..."
    use:focusOnMount
  />
{/if}

<style>
  .canvas-outer {
    width: 100%;
    height: 100%;
  }

  canvas {
    display: block;
    image-rendering: pixelated;
  }

  .label-input {
    position: fixed;
    z-index: 100;
    font-family: var(--font);
    font-size: 12px;
    color: rgb(0,0,255);
    background: rgba(255,255,255,0.95);
    border: 1px solid rgb(160,82,45);
    padding: 2px 6px;
    width: 120px;
    outline: none;
  }
</style>
